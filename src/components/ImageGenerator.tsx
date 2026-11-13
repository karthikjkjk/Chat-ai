import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Download,
  RotateCw,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  AlertCircle,
  ArrowLeft,
  Loader2,
  X,
  Wand2,
} from 'lucide-react';
import { AppSettings } from '../types.ts';

export type ImageStyle = 'Realistic' | '3D' | 'Anime' | 'Digital Art' | 'Cinematic' | 'Cartoon';
export type ImageAspectRatio = 'square' | 'portrait' | 'landscape';

export interface GeneratedImageResult {
  id: string;
  imageDataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  prompt: string;
  styledPrompt?: string;
  style: ImageStyle;
  aspectRatio: ImageAspectRatio;
  provider: string;
  model: string;
  limits: string;
  durationMs: number;
  seed?: number;
  createdAt: number;
}

interface ImageGeneratorProps {
  settings: AppSettings;
  currentLanguage: 'en' | 'te';
  onBackHome: () => void;
}

const IMAGE_STYLES: ImageStyle[] = [
  'Realistic',
  '3D',
  'Anime',
  'Digital Art',
  'Cinematic',
  'Cartoon',
];

const ASPECT_RATIOS: Array<{
  id: ImageAspectRatio;
  label: string;
  ratioText: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { id: 'square', label: 'Square', ratioText: '1:1', Icon: Square },
  { id: 'portrait', label: 'Portrait', ratioText: '3:4', Icon: RectangleVertical },
  { id: 'landscape', label: 'Landscape', ratioText: '4:3', Icon: RectangleHorizontal },
];

const SAMPLE_PROMPTS = [
  'A sleek white and cobalt blue futuristic AI robot in a sunlit studio',
  'Serene misty Himalayan mountain sunrise over turquoise lake',
  'Cozy minimalist architectural workspace at dusk with warm lamp light',
  'Ancient Telugu temple courtyard illuminated by brass oil lamps at twilight',
];

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  currentLanguage,
  onBackHome,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('Digital Art');
  const [selectedRatio, setSelectedRatio] = useState<ImageAspectRatio>('square');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<GeneratedImageResult | null>(null);
  const [gallery, setGallery] = useState<GeneratedImageResult[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerate = async (overridePrompt?: string) => {
    const cleanPrompt = (overridePrompt !== undefined ? overridePrompt : prompt).trim();
    if (!cleanPrompt || isGenerating) {
      if (!cleanPrompt) {
        setErrorMessage('Please enter a prompt describing the image you want to create.');
      }
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setProgressStage('Connecting to free open-source image engine...');
    setProgressPercent(8);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/image/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          style: selectedStyle,
          aspectRatio: selectedRatio,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response unavailable in this browser.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payloadText = line.slice(6).trim();
          if (!payloadText) continue;

          const payload = JSON.parse(payloadText);
          if (payload.type === 'progress') {
            setProgressStage(payload.stage || 'Generating...');
            if (typeof payload.percent === 'number') {
              setProgressPercent(payload.percent);
            }
          } else if (payload.type === 'error') {
            throw new Error(payload.error || 'Image generation failed.');
          } else if (payload.type === 'result') {
            finalResult = payload;
          }
        }
      }

      if (!finalResult || !finalResult.imageDataUrl) {
        throw new Error('The free image provider did not return an image. Please try again.');
      }

      const generated: GeneratedImageResult = {
        id: `img_${Date.now()}`,
        imageDataUrl: finalResult.imageDataUrl,
        mimeType: finalResult.mimeType || 'image/jpeg',
        width: finalResult.width,
        height: finalResult.height,
        prompt: finalResult.prompt || cleanPrompt,
        styledPrompt: finalResult.styledPrompt,
        style: finalResult.style || selectedStyle,
        aspectRatio: finalResult.aspectRatio || selectedRatio,
        provider: finalResult.provider || 'Open-Source Hosted',
        model: finalResult.model || 'FLUX / Stable Diffusion',
        limits: finalResult.limits || 'Free community tier',
        durationMs: finalResult.durationMs || 0,
        seed: finalResult.seed,
        createdAt: Date.now(),
      };

      setActiveImage(generated);
      setGallery((prev) => [generated, ...prev].slice(0, 8));
      setProgressStage('Complete');
      setProgressPercent(100);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMessage('Image generation was cancelled.');
      } else {
        setErrorMessage(
          err?.message || 'Unable to generate image right now. Please try again.'
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!activeImage?.imageDataUrl) return;
    try {
      const res = await fetch(activeImage.imageDataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = activeImage.mimeType.includes('webp')
        ? 'webp'
        : activeImage.mimeType.includes('png')
        ? 'png'
        : 'jpg';
      const safeName = activeImage.prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32);
      const filename = `chatai-${safeName || 'generated'}-${Date.now()}.${ext}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch {
      setErrorMessage('Could not save image file. Please long-press the image to save.');
    }
  };

  const handleRegenerate = () => {
    const targetPrompt = activeImage?.prompt || prompt;
    if (targetPrompt) {
      setPrompt(targetPrompt);
      handleGenerate(targetPrompt);
    }
  };

  return (
    <div
      data-testid="image-generator-view"
      style={{ backgroundColor: 'var(--chat-bg)', color: 'var(--chat-text)' }}
      className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto h-[calc(100dvh-3.5rem)] overscroll-contain"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              data-testid="image-back-home-btn"
              onClick={onBackHome}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.09] border border-[#E2E8F0] dark:border-white/[0.09] text-xs font-semibold text-[#0F172A] dark:text-slate-100 flex items-center gap-1.5 transition shadow-2xs cursor-pointer touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate text-[#0F172A] dark:text-white">
                {currentLanguage === 'te' ? 'CHAT AI ఉచిత చిత్ర సృష్టికర్త' : 'AI Image Generator'}
              </h1>
              <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                Free open-source FLUX &amp; Stable Diffusion · No paid keys or billing required
              </p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls Column */}
          <div
            style={{ backgroundColor: 'var(--chat-panel)', borderColor: 'var(--chat-border)' }}
            className="lg:col-span-5 min-w-0 rounded-2xl border p-4 sm:p-5 space-y-5 shadow-sm"
          >
            {/* Prompt Input */}
            <div className="space-y-2">
              <label
                htmlFor="image-prompt-textarea"
                className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200"
              >
                Image Description
              </label>
              <textarea
                id="image-prompt-textarea"
                data-testid="image-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                rows={4}
                placeholder="Describe the image you want to generate..."
                className="w-full p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#0F172A] dark:text-slate-100 placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]/70 dark:focus:ring-sky-500/20 resize-none leading-relaxed"
              />

              {/* Sample prompt suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(sample)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] dark:bg-white/[0.04] hover:bg-[#DBEAFE] dark:hover:bg-white/[0.09] border border-[#BFDBFE] dark:border-white/[0.08] text-[#1E40AF] dark:text-slate-300 text-left transition cursor-pointer touch-manipulation"
                  >
                    {sample.length > 44 ? `${sample.slice(0, 44)}...` : sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector (6 Styles) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200">
                Image Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {IMAGE_STYLES.map((style) => {
                  const isActive = selectedStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      data-testid={`image-style-${style.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setSelectedStyle(style)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs transition whitespace-nowrap cursor-pointer touch-manipulation ${
                        isActive
                          ? 'bg-[#DBEAFE] dark:bg-blue-600/30 border-[#2563EB] dark:border-sky-400 text-[#1E40AF] dark:text-white font-semibold shadow-2xs'
                          : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/[0.09] text-[#64748B] dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] hover:text-[#0F172A]'
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map(({ id, label, ratioText, Icon }) => {
                  const isActive = selectedRatio === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`image-ratio-${id}`}
                      onClick={() => setSelectedRatio(id)}
                      className={`min-h-[44px] px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs transition cursor-pointer touch-manipulation ${
                        isActive
                          ? 'bg-[#DBEAFE] dark:bg-blue-600/30 border-[#2563EB] dark:border-sky-400 text-[#1E40AF] dark:text-white font-semibold shadow-2xs'
                          : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/[0.09] text-[#64748B] dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                        <span>{label}</span>
                      </div>
                      <span className="text-[10px] opacity-80 font-mono tabular-nums">
                        {ratioText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Generate / Cancel Button */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                data-testid="image-generate-btn"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className={`flex-1 min-h-[48px] px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer touch-manipulation ${
                  isGenerating
                    ? 'bg-[#93C5FD] text-white cursor-wait'
                    : 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white shadow-md shadow-blue-600/25'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Image...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Image</span>
                  </>
                )}
              </button>

              {isGenerating && (
                <button
                  type="button"
                  data-testid="image-cancel-btn"
                  onClick={handleCancel}
                  className="min-h-[48px] px-3.5 py-3 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-rose-50 dark:hover:bg-rose-600/30 border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold text-[#0F172A] dark:text-slate-200 flex items-center gap-1 cursor-pointer touch-manipulation"
                >
                  <X className="w-4 h-4 text-rose-500" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed pt-1">
              Uses free open-source providers: Pollinations FLUX (1 image / 45s per IP) with automatic fallback to AI Horde Stable Diffusion crowd-sourced workers.
            </p>
          </div>

          {/* Right Result Display Column */}
          <div
            style={{ backgroundColor: 'var(--chat-panel)', borderColor: 'var(--chat-border)' }}
            className="lg:col-span-7 min-w-0 rounded-2xl border p-4 sm:p-6 space-y-4 min-h-[380px] flex flex-col justify-between shadow-sm"
          >
            {errorMessage && (
              <div
                role="alert"
                data-testid="image-error-box"
                className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Image Generation Error</p>
                    <p className="leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {isGenerating && (
              <div
                data-testid="image-progress-box"
                className="p-5 rounded-xl bg-[#EFF6FF] dark:bg-white/[0.03] border border-[#BFDBFE] dark:border-sky-500/30 space-y-3 my-auto"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1E40AF] dark:text-sky-200 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] dark:text-sky-400" />
                    <span>{progressStage || 'Generating your image...'}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[#2563EB] dark:text-sky-300 font-bold">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#DBEAFE] dark:bg-black/40 overflow-hidden">
                  <div
                    data-testid="image-progress-bar"
                    className="h-full bg-gradient-to-r from-[#38BDF8] via-[#2563EB] to-[#1E40AF] transition-all duration-300"
                    style={{ width: `${Math.max(8, progressPercent)}%` }}
                  />
                </div>
              </div>
            )}

            {!isGenerating && activeImage ? (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden bg-[#F8FAFC] dark:bg-black/30 border border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-center p-2">
                  <img
                    data-testid="generated-image-result"
                    src={activeImage.imageDataUrl}
                    alt={activeImage.prompt}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[58dvh] w-auto h-auto rounded-lg object-contain mx-auto"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="image-download-btn"
                    onClick={handleDownload}
                    className="min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 cursor-pointer touch-manipulation"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Image</span>
                  </button>

                  <button
                    type="button"
                    data-testid="image-regenerate-btn"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#EFF6FF] dark:bg-white/[0.05] hover:bg-[#DBEAFE] dark:hover:bg-white/[0.1] border border-[#BFDBFE] dark:border-white/15 text-[#1E40AF] dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    <RotateCw className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0] dark:border-white/[0.07] text-xs">
                  <p className="text-[#0F172A] dark:text-slate-200 font-medium line-clamp-2">
                    {activeImage.prompt}
                  </p>
                  <div
                    data-testid="generated-image-meta"
                    className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] dark:text-slate-400 font-mono tabular-nums"
                  >
                    <span>{activeImage.provider}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeImage.model}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeImage.style}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeImage.width}×{activeImage.height}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{(activeImage.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-500">{activeImage.limits}</p>
                </div>
              </div>
            ) : !isGenerating && !errorMessage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-blue-500/10 border border-[#BFDBFE] dark:border-sky-500/25 flex items-center justify-center text-[#2563EB] dark:text-sky-400">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
                    Ready to generate real AI artwork
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                    Enter a prompt on the left, choose a style and aspect ratio, then tap Generate Image.
                  </p>
                </div>
              </div>
            ) : null}

            {gallery.length > 1 && (
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/[0.08] space-y-2">
                <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                  Recent Generations ({gallery.length})
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {gallery.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveImage(item)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border shrink-0 transition cursor-pointer ${
                        activeImage?.id === item.id
                          ? 'border-[#2563EB] ring-2 ring-[#DBEAFE]'
                          : 'border-[#E2E8F0] dark:border-white/15 opacity-75 hover:opacity-100'
                      }`}
                      title={item.prompt}
                    >
                      <img
                        src={item.imageDataUrl}
                        alt={item.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
