import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp, Mic, MicOff, Sparkles, Code2,
  Languages, PenTool, Lightbulb, Radio, Clock, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { Conversation, User, Attachment, AppSettings, AITool, AIModel } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { checkVoiceSupport, SpeechRecognitionSession, stopSpeaking, unlockSpeechSynthesis } from '../utils/voice.ts';
import { AI_TOOLS } from '../data/tools.ts';
import { ComposerAttachmentMenu, AttachmentPreviewBar } from './ComposerAttachmentMenu.tsx';

interface HomePageProps {
  user: User;
  settings: AppSettings;
  conversations: Conversation[];
  activeModel: AIModel;
  onSwitchToVisionModel: () => void;
  onStartChat: (
    initialPrompt: string,
    attachments?: Attachment[],
    options?: { webSearch?: boolean }
  ) => void;
  onOpenConversation: (conversationId: string) => void;
  onOpenTools: () => void;
  onSelectTool: (tool: AITool) => void;
  onOpenImageGenerator: () => void;
  onOpenVoiceMode: () => void;
  currentLanguage: 'en' | 'te';
}

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  conversations,
  activeModel,
  onSwitchToVisionModel,
  onStartChat,
  onOpenConversation,
  onOpenTools,
  onSelectTool,
  onOpenImageGenerator,
  onOpenVoiceMode,
  currentLanguage,
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechSessionRef = useRef<SpeechRecognitionSession | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const handleToggleVoice = () => {
    stopSpeaking();
    const voiceSupport = checkVoiceSupport();
    if (!voiceSupport.hasSpeechRecognition) {
      setVoiceNotice('Microphone speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isListening) {
      speechSessionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognitionLang = currentLanguage === 'te' ? 'te-IN' : settings.language.speechLanguage;
      const session = new SpeechRecognitionSession(
        (transcript) => {
          setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        (error) => {
          setVoiceNotice(`Speech error: ${error}`);
          setIsListening(false);
          setTimeout(() => setVoiceNotice(null), 4000);
        },
        (listening) => {
          setIsListening(listening);
        },
        recognitionLang
      );

      speechSessionRef.current = session;
      session.start();
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const hasUnsupportedImage =
    !activeModel.supportsImageInput &&
    attachments.some((a) => a.kind === 'image' || a.mimeType.startsWith('image/'));

  const handleSubmit = (textToSubmit?: string) => {
    const finalContent = (textToSubmit !== undefined ? textToSubmit : prompt).trim();
    if ((!finalContent && attachments.length === 0) || isProcessingFiles) return;
    if (hasUnsupportedImage) {
      setAttachmentErrors([
        `Selected model (${activeModel.name}) does not support image analysis. Switch models or remove image attachments first.`,
      ]);
      return;
    }

    if (isListening) {
      speechSessionRef.current?.stop();
      setIsListening(false);
    }

    if (settings.voice.autoReadAloud) {
      unlockSpeechSynthesis();
    }

    onStartChat(finalContent, attachments, { webSearch: webSearchEnabled });
    setPrompt('');
    setAttachments([]);
    setAttachmentErrors([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (settings.general.enterSendsMessage && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const starterPrompts = currentLanguage === 'te'
    ? [
        {
          icon: Sparkles,
          title: 'సృజనాత్మక కవిత',
          description: 'CHAT AI విశిష్టతపై అందమైన తెలుగు కవిత రాయండి',
          prompt: 'CHAT AI మేధస్సు మరియు సామర్థ్యాల గురించి ఒక స్ఫూర్తిదాయకమైన తెలుగు కవిత రాయండి.',
        },
        {
          icon: Code2,
          title: 'కోడింగ్ సహాయం',
          description: 'రియాక్ట్ లో పెర్ఫార్మెన్స్ ఆప్టిమైజేషన్ టెక్నిక్స్',
          prompt: 'రియాక్ట్ మరియు టైప్‌స్క్రిప్ట్ లో ఒక కాంపోనెంట్ ఆప్టిమైజ్ చేయడానికి ఉపయోగపడే ముఖ్యమైన చిట్కాలు మరియు ఉదాహరణలు ఇవ్వండి.',
        },
        {
          icon: Languages,
          title: 'తెలుగు-ఇంగ్లీష్ అనువాదం',
          description: 'సహజమైన శైలిలో ఖచ్చితమైన అనువాదం',
          prompt: 'ఈ వాక్యాన్ని సహజమైన మరియు గౌరవప్రదమైన ఇంగ్లీష్ లోకి అనువదించండి: "కష్టపడి క్రమశిక్షణతో పనిచేస్తే ఏ రంగంలోనైనా విజయం సాధ్యం."',
        },
        {
          icon: Lightbulb,
          title: 'వ్యూహాత్మక ప్రణాళిక',
          description: 'AI స్టార్టప్ రోడ్‌మ్యాప్ మరియు విశ్లేషణ',
          prompt: 'ఒక సరికొత్త AI స్టార్టప్ కోసం 3 విశిష్ట ఆలోచనలు, మార్కెట్ మోట్ మరియు సాంకేతిక వ్యూహాన్ని వివరించండి.',
        },
      ]
    : [
        {
          icon: Code2,
          title: 'Code Architect',
          description: 'Write robust, clean TypeScript & Python code',
          prompt: 'Write a TypeScript generic utility to debounce async API calls with AbortController cancellation support.',
        },
        {
          icon: Languages,
          title: 'Telugu Master',
          description: 'Fluent bilingual translations and explanations',
          prompt: 'Translate this thought into elegant literary Telugu with cultural idioms: "True intelligence is the ability to adapt to change."',
        },
        {
          icon: PenTool,
          title: 'Executive Memo',
          description: 'Draft compelling high-impact briefings',
          prompt: 'Draft a crisp executive memo on AI adoption strategies for our engineering and product roadmap.',
        },
        {
          icon: Lightbulb,
          title: 'Systems Critique',
          description: 'Deep architectural tradeoffs analysis',
          prompt: 'Compare PostgreSQL relational storage with vector embeddings for real-time semantic retrieval at enterprise scale.',
        },
      ];

  const recentConversations = conversations
    .filter((c) => c.messages.length > 0 && !c.isArchived)
    .slice(0, 4);

  return (
    <div
      style={{ backgroundColor: 'var(--chat-bg)', color: 'var(--chat-text)' }}
      className="flex-1 overflow-y-auto h-[calc(100dvh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 overscroll-contain relative"
    >
      {/* Subtle Light-Blue Radial Backdrop Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#DBEAFE]/55 via-[#EFF6FF]/35 to-transparent dark:from-blue-600/10 dark:via-transparent"
      />

      <div className="relative z-10 max-w-3xl mx-auto w-full my-auto space-y-7 py-6">
        {/* Centered Welcome Heading */}
        <div className="text-center space-y-3">
          <div className="flex justify-center transform hover:scale-105 transition duration-300">
            <BrandLogo size="xl" showText={false} />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
              {currentLanguage === 'te' ? 'ఈరోజు నేను మీకు ఎలా సహాయపడగలను?' : 'What can I help you with today?'}
            </h1>
            <p className="text-sm sm:text-base font-semibold tracking-wide flex items-center justify-center gap-2">
              <span className="text-[#2563EB] dark:text-sky-400">CHAT AI</span>
              <span className="text-[#CBD5E1] dark:text-slate-600">•</span>
              <span className="text-[#64748B] dark:text-slate-300 font-medium">Your AI. Your World.</span>
            </p>
            <p
              data-testid="home-creator-info"
              className="text-xs text-[#64748B] dark:text-slate-400 font-medium"
            >
              Created &amp; Owned by <span className="text-[#1E40AF] dark:text-sky-400 font-semibold">KARTHIK JANNE</span>
            </p>
          </div>
        </div>

        {/* Large Central Message Composer */}
        <div className="space-y-2">
          {voiceNotice && (
            <div className="px-3 py-1.5 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/80 border border-[#BFDBFE] dark:border-blue-500/30 text-xs text-[#1E40AF] dark:text-sky-200 text-center animate-in fade-in">
              {voiceNotice}
            </div>
          )}

          {/* Attachment Previews, Web Search Status & Validation Errors */}
          <AttachmentPreviewBar
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            isProcessingFiles={isProcessingFiles}
            attachmentErrors={attachmentErrors}
            onDismissErrors={() => setAttachmentErrors([])}
            webSearchEnabled={webSearchEnabled}
            onDisableWebSearch={() => setWebSearchEnabled(false)}
            activeModel={activeModel}
            onSwitchToVisionModel={onSwitchToVisionModel}
          />

          {/* Composer Card */}
          <div
            style={{ backgroundColor: 'var(--chat-input-bg)' }}
            className="relative rounded-2xl border border-[#BFDBFE] dark:border-white/10 focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-[#DBEAFE]/70 dark:focus-within:ring-sky-500/20 shadow-lg shadow-blue-900/5 dark:shadow-black/50 transition duration-150"
          >
            <textarea
              ref={textareaRef}
              data-testid="home-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                webSearchEnabled
                  ? 'Ask anything to search the web...'
                  : currentLanguage === 'te'
                  ? 'CHAT AI ని ఏదైనా అడగండి లేదా తెలుగులో టైప్ చేయండి...'
                  : 'Message CHAT AI (English or తెలుగు)...'
              }
              rows={2}
              className="w-full bg-transparent px-4 pt-4 pb-14 text-sm md:text-base text-[#0F172A] dark:text-slate-100 placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none resize-none min-h-[62px] max-h-[180px] leading-relaxed"
            />

            {/* Bottom Controls */}
            <div className="absolute left-2.5 bottom-2.5 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ComposerAttachmentMenu
                  attachments={attachments}
                  onAddAttachments={(newItems) => {
                    setAttachmentErrors([]);
                    setAttachments((prev) => [...prev, ...newItems]);
                  }}
                  onError={(errs) => setAttachmentErrors(errs)}
                  onProcessingChange={setIsProcessingFiles}
                  webSearchEnabled={webSearchEnabled}
                  onToggleWebSearch={() => setWebSearchEnabled((v) => !v)}
                  onOpenImageGenerator={onOpenImageGenerator}
                  activeModel={activeModel}
                  currentLanguage={currentLanguage}
                />
              </div>

              <div className="flex items-center gap-1.5">
                {/* Hands-free Voice Mode */}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    onOpenVoiceMode();
                  }}
                  title="Open Hands-Free Voice Chat Mode"
                  className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-blue-500/15 hover:bg-[#DBEAFE] dark:hover:bg-blue-500/25 text-[#2563EB] dark:text-sky-400 border border-[#BFDBFE] dark:border-sky-500/30 transition flex items-center justify-center cursor-pointer touch-manipulation"
                >
                  <Radio className="w-4 h-4" />
                </button>

                {/* Microphone Dictation */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  title={isListening ? 'Stop dictation' : 'Dictate with microphone'}
                  className={`p-2 rounded-xl transition cursor-pointer touch-manipulation ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                      : 'text-[#2563EB] dark:text-sky-400 hover:bg-[#EFF6FF] dark:hover:bg-white/10'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  data-testid="home-send-btn"
                  onClick={() => handleSubmit()}
                  disabled={
                    (!prompt.trim() && attachments.length === 0) ||
                    isProcessingFiles ||
                    hasUnsupportedImage
                  }
                  title="Send to CHAT AI"
                  className={`p-2 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer touch-manipulation ${
                    (prompt.trim() || attachments.length > 0) &&
                    !isProcessingFiles &&
                    !hasUnsupportedImage
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white shadow-md shadow-blue-600/30'
                      : 'bg-[#F1F5F9] dark:bg-white/[0.06] text-[#94A3B8] dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 px-1">
            <span>
              {currentLanguage === 'te'
                ? 'CHAT AI తప్పులు చేయవచ్చు. ముఖ్య సమాచారాన్ని ధృవీకరించుకోండి.'
                : 'CHAT AI can make mistakes. Verify important info.'}
            </span>
            <span className="hidden sm:inline">
              Enter to send • Shift+Enter for new line
            </span>
          </div>
        </div>

        {/* Suggested Question Prompt Cards */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400 px-1">
            <span>{currentLanguage === 'te' ? 'సిఫార్సు చేయబడిన అంశాలు' : 'Suggested Prompts'}</span>
            <span className="text-[11px] text-[#2563EB] dark:text-sky-400 lowercase font-medium">click to ask</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {starterPrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSubmit(item.prompt)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF]/60 dark:hover:bg-white/[0.07] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#93C5FD] dark:hover:border-sky-400/40 text-left transition duration-150 group flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-[#DBEAFE] dark:bg-blue-500/15 text-[#2563EB] dark:text-sky-400 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100 group-hover:text-[#1E40AF] dark:group-hover:text-white">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Chat History Grid */}
        {recentConversations.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                <span>{currentLanguage === 'te' ? 'ఇటీవలి సంభాషణలు' : 'Recent Conversations'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onOpenConversation(conv.id)}
                  className="p-3 rounded-xl bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] border border-[#E2E8F0] dark:border-white/[0.06] hover:border-[#93C5FD] text-left transition flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-200 truncate group-hover:text-[#2563EB] dark:group-hover:text-sky-300">
                      {conv.title || 'Untitled conversation'}
                    </p>
                    <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                      {conv.messages[conv.messages.length - 1]?.content.slice(0, 60) || 'Active thread'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#2563EB] dark:group-hover:text-sky-300 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured AI Tools Row */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
              <span>{currentLanguage === 'te' ? 'AI సాధనాలు' : 'Featured AI Tools'}</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="home-image-gen-btn"
                onClick={onOpenImageGenerator}
                className="text-xs text-[#2563EB] dark:text-sky-400 hover:text-[#1E40AF] font-semibold capitalize flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>AI Image Generator</span>
              </button>
              <button
                type="button"
                onClick={onOpenTools}
                className="text-xs text-[#1E40AF] dark:text-sky-300 hover:text-[#2563EB] font-semibold capitalize flex items-center gap-0.5 cursor-pointer"
              >
                Explore All 15 Tools <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {AI_TOOLS.slice(0, 4).map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool)}
                className="p-3 rounded-xl bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] border border-[#E2E8F0] dark:border-white/[0.07] hover:border-[#93C5FD] text-left transition group shadow-2xs cursor-pointer"
              >
                <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-200 truncate group-hover:text-[#2563EB] dark:group-hover:text-sky-300">
                  {tool.name}
                </p>
                <p className="text-[10px] text-[#2563EB] dark:text-sky-400 truncate mt-0.5 font-medium">
                  {tool.teluguName}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
