import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Image as ImageIcon,
  Camera,
  FileText,
  FolderOpen,
  Globe,
  Wand2,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AIModel, Attachment } from '../types.ts';
import { formatFileSize, processSelectedFiles } from '../utils/attachments.ts';

interface ComposerAttachmentMenuProps {
  attachments: Attachment[];
  onAddAttachments: (newAttachments: Attachment[]) => void;
  onError: (errors: string[]) => void;
  onProcessingChange: (processing: boolean) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onOpenImageGenerator: () => void;
  activeModel: AIModel;
  currentLanguage: 'en' | 'te';
}

export const ComposerAttachmentMenu: React.FC<ComposerAttachmentMenuProps> = ({
  attachments,
  onAddAttachments,
  onError,
  onProcessingChange,
  webSearchEnabled,
  onToggleWebSearch,
  onOpenImageGenerator,
  activeModel,
  currentLanguage,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('up');

  const containerRef = useRef<HTMLDivElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentsInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const handleToggleMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next && containerRef.current && typeof window !== 'undefined') {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top - 64;
        const spaceBelow = window.innerHeight - rect.bottom - 16;
        setOpenDirection(spaceAbove < 395 && spaceBelow > spaceAbove ? 'down' : 'up');
      }
      return next;
    });
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sourceCategory: 'photos' | 'camera' | 'documents' | 'files'
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setMenuOpen(false);
    onProcessingChange(true);

    try {
      const result = await processSelectedFiles(fileList, sourceCategory, attachments.length);
      if (result.attachments.length > 0) {
        onAddAttachments(result.attachments);
      }
      if (result.errors.length > 0) {
        onError(result.errors);
      }
    } finally {
      onProcessingChange(false);
      e.target.value = '';
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <input
        ref={photosInputRef}
        data-testid="input-photos"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, 'photos')}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        data-testid="input-camera"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'camera')}
        className="hidden"
      />
      <input
        ref={documentsInputRef}
        data-testid="input-documents"
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        multiple
        onChange={(e) => handleFileChange(e, 'documents')}
        className="hidden"
      />
      <input
        ref={filesInputRef}
        data-testid="input-files"
        type="file"
        multiple
        onChange={(e) => handleFileChange(e, 'files')}
        className="hidden"
      />

      {/* Plus (+) Trigger Button */}
      <button
        type="button"
        data-testid="composer-plus-btn"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Open attachment and tools menu"
        onClick={handleToggleMenu}
        title={currentLanguage === 'te' ? 'ఫైల్స్, ఫోటోలు లేదా వెబ్ శోధన జోడించండి' : 'Add photos, camera, documents, files, or web search'}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all duration-150 cursor-pointer touch-manipulation ${
          menuOpen
            ? 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] border-[#1E40AF] text-white shadow-md shadow-blue-600/30'
            : 'bg-[#EFF6FF] dark:bg-white/[0.08] hover:bg-[#DBEAFE] dark:hover:bg-white/[0.15] border-[#BFDBFE] dark:border-white/[0.12] text-[#2563EB] dark:text-sky-300'
        }`}
      >
        <Plus className={`w-5 h-5 transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`} />
      </button>

      {/* Mobile-Friendly Popup Attachment Menu */}
      {menuOpen && (
        <div
          role="menu"
          data-testid="composer-attachment-menu"
          className={`absolute left-0 w-72 max-w-[calc(100vw-2rem)] max-h-[min(65dvh,420px)] overflow-y-auto rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/15 text-[#0F172A] dark:text-slate-100 shadow-2xl shadow-slate-900/15 dark:shadow-black/75 p-2 z-50 animate-in fade-in duration-150 ${
            openDirection === 'down'
              ? 'top-full mt-2 slide-in-from-top-2 origin-top-left'
              : 'bottom-full mb-3 slide-in-from-bottom-2 origin-bottom-left'
          }`}
        >
          <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between border-b border-[#E2E8F0] dark:border-white/[0.08]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              {currentLanguage === 'te' ? 'జోడింపులు & సాధనాలు' : 'Add to message'}
            </span>
            <span className="text-[10px] text-[#64748B] dark:text-slate-500">Max 5 files</span>
          </div>

          <div className="space-y-1">
            {/* 1. Photos */}
            <button
              type="button"
              role="menuitem"
              data-testid="attach-option-photos"
              onClick={() => {
                setMenuOpen(false);
                photosInputRef.current?.click();
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] flex items-center gap-3 text-left transition cursor-pointer touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] dark:bg-blue-500/15 border border-[#BFDBFE] dark:border-blue-500/30 text-[#2563EB] dark:text-sky-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">Photos</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                  Select images from gallery
                </p>
              </div>
            </button>

            {/* 2. Camera */}
            <button
              type="button"
              role="menuitem"
              data-testid="attach-option-camera"
              onClick={() => {
                setMenuOpen(false);
                cameraInputRef.current?.click();
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] flex items-center gap-3 text-left transition cursor-pointer touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] dark:bg-sky-500/15 border border-[#BFDBFE] dark:border-sky-500/30 text-[#1E40AF] dark:text-sky-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">Camera</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                  Capture a photo using camera
                </p>
              </div>
            </button>

            {/* 3. Documents */}
            <button
              type="button"
              role="menuitem"
              data-testid="attach-option-documents"
              onClick={() => {
                setMenuOpen(false);
                documentsInputRef.current?.click();
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] flex items-center gap-3 text-left transition cursor-pointer touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] dark:bg-blue-500/15 border border-[#BFDBFE] dark:border-blue-500/30 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">Documents</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                  PDF, DOC, DOCX, TXT (max 10 MB)
                </p>
              </div>
            </button>

            {/* 4. Files */}
            <button
              type="button"
              role="menuitem"
              data-testid="attach-option-files"
              onClick={() => {
                setMenuOpen(false);
                filesInputRef.current?.click();
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] flex items-center gap-3 text-left transition cursor-pointer touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] dark:bg-blue-500/15 border border-[#BFDBFE] dark:border-blue-500/30 text-[#1E40AF] dark:text-sky-400 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">Files</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                  Browse files from device storage
                </p>
              </div>
            </button>

            <div className="my-1 border-t border-[#E2E8F0] dark:border-white/[0.08]" />

            {/* 5. Search Web */}
            <button
              type="button"
              role="menuitem"
              data-testid="attach-option-web-search"
              onClick={() => {
                if (!activeModel.supportsWebSearch) {
                  onError([
                    `The selected model (${activeModel.name}) does not support Google Search grounding.`,
                  ]);
                  setMenuOpen(false);
                  return;
                }
                onToggleWebSearch();
                setMenuOpen(false);
              }}
              className={`w-full min-h-[46px] px-2.5 py-2 rounded-xl flex items-center gap-3 text-left transition cursor-pointer touch-manipulation ${
                webSearchEnabled
                  ? 'bg-[#DBEAFE] dark:bg-blue-500/20 border border-[#93C5FD] dark:border-sky-400/40'
                  : 'hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] border border-transparent'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] dark:bg-sky-500/15 border border-[#BFDBFE] dark:border-sky-500/30 text-[#2563EB] dark:text-sky-400 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">Search Web</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                  {webSearchEnabled ? 'Live internet search is ON' : 'Search internet when available'}
                </p>
              </div>
              {webSearchEnabled && (
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </button>

            {/* 6. Create Image */}
            <button
              type="button"
              role="menuitem"
              data-testid="attach-option-create-image"
              onClick={() => {
                setMenuOpen(false);
                onOpenImageGenerator();
              }}
              className="w-full min-h-[46px] px-2.5 py-2 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] flex items-center gap-3 text-left transition cursor-pointer touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] dark:bg-blue-500/15 border border-[#BFDBFE] dark:border-blue-500/30 text-[#1E40AF] dark:text-sky-300 flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">Create Image</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                  Open AI Image Generator
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface AttachmentPreviewBarProps {
  attachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
  isProcessingFiles: boolean;
  attachmentErrors: string[];
  onDismissErrors: () => void;
  webSearchEnabled: boolean;
  onDisableWebSearch: () => void;
  activeModel: AIModel;
  onSwitchToVisionModel?: () => void;
}

export const AttachmentPreviewBar: React.FC<AttachmentPreviewBarProps> = ({
  attachments,
  onRemoveAttachment,
  isProcessingFiles,
  attachmentErrors,
  onDismissErrors,
  webSearchEnabled,
  onDisableWebSearch,
  activeModel,
  onSwitchToVisionModel,
}) => {
  const hasImages = attachments.some(
    (a) => a.kind === 'image' || a.mimeType.startsWith('image/')
  );
  const imageUnsupportedForModel = hasImages && !activeModel.supportsImageInput;

  return (
    <div className="space-y-2">
      {attachmentErrors.length > 0 && (
        <div
          role="alert"
          data-testid="attachment-error-banner"
          className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/75 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-100 text-xs flex items-start justify-between gap-2.5 animate-in fade-in"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              {attachmentErrors.map((err, i) => (
                <p key={i} className="leading-relaxed break-words">
                  {err}
                </p>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss attachment warning"
            onClick={onDismissErrors}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-white/10 text-rose-600 dark:text-rose-300 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {imageUnsupportedForModel && (
        <div
          role="alert"
          data-testid="vision-unsupported-banner"
          className="px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/75 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Selected model <strong>{activeModel.name}</strong> does not support image input. Switch to a vision model or remove the image.
            </span>
          </div>
          {onSwitchToVisionModel && (
            <button
              type="button"
              onClick={onSwitchToVisionModel}
              className="px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold cursor-pointer"
            >
              Switch to Vision Model
            </button>
          )}
        </div>
      )}

      {isProcessingFiles && (
        <div
          data-testid="attachment-processing-indicator"
          className="px-3 py-2 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/50 border border-[#BFDBFE] dark:border-sky-500/30 text-[#1E40AF] dark:text-sky-200 text-xs flex items-center gap-2"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB] dark:text-sky-400" />
          <span>Reading &amp; extracting text from selected file(s)...</span>
        </div>
      )}

      {(webSearchEnabled || attachments.length > 0) && (
        <div
          data-testid="attachment-preview-list"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          {webSearchEnabled && (
            <div
              data-testid="web-search-active-chip"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#DBEAFE] dark:bg-blue-500/20 border border-[#93C5FD] dark:border-sky-400/40 text-[#1E40AF] dark:text-sky-200 text-xs font-semibold shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
              <span>Web Search ON</span>
              <button
                type="button"
                aria-label="Turn off Web Search"
                onClick={onDisableWebSearch}
                className="p-0.5 rounded hover:bg-white/60 dark:hover:bg-white/10 text-[#1E40AF] dark:text-sky-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {attachments.map((att, index) => {
            const isImg = att.kind === 'image' || att.mimeType.startsWith('image/');
            const docBadge =
              att.kind === 'pdf'
                ? 'PDF'
                : att.kind === 'docx'
                ? 'DOCX'
                : att.kind === 'doc'
                ? 'DOC'
                : 'TXT';

            return (
              <div
                key={att.id}
                data-testid={`attachment-preview-item-${index}`}
                className="flex items-center gap-2.5 p-1.5 pr-2 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs shrink-0 shadow-sm"
              >
                {isImg && att.data ? (
                  <img
                    src={att.data}
                    alt={att.name}
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#E2E8F0] dark:border-white/10"
                  />
                ) : (
                  <div className="w-10 h-11 rounded-lg bg-[#EFF6FF] dark:bg-blue-600/20 border border-[#BFDBFE] dark:border-sky-500/30 flex flex-col items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                    <span className="text-[9px] font-bold text-[#1E40AF] dark:text-sky-300 leading-none mt-0.5">
                      {docBadge}
                    </span>
                  </div>
                )}

                <div className="min-w-0 max-w-[140px]">
                  <p className="truncate font-semibold text-xs leading-tight">{att.name}</p>
                  <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5 font-mono tabular-nums">
                    {formatFileSize(att.size)}
                    {att.pageCount ? ` • ${att.pageCount}p` : ''}
                    {att.extractedText ? ` • ${att.extractedText.length.toLocaleString()} ch` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid={`remove-attachment-${index}`}
                  aria-label={`Remove ${att.name}`}
                  onClick={() => onRemoveAttachment(att.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 text-[#64748B] hover:text-rose-600 dark:hover:text-rose-300 transition cursor-pointer touch-manipulation shrink-0"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
