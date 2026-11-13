import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp, Square, Mic, MicOff, Sparkles,
  Code2, Languages, PenTool, Lightbulb, Radio
} from 'lucide-react';
import { Conversation, User, Attachment, AppSettings, AIModel } from '../types.ts';
import { ChatMessage } from './ChatMessage.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { checkVoiceSupport, SpeechRecognitionSession, stopSpeaking, unlockSpeechSynthesis } from '../utils/voice.ts';
import { ComposerAttachmentMenu, AttachmentPreviewBar } from './ComposerAttachmentMenu.tsx';

interface ChatAreaProps {
  conversation: Conversation;
  user: User;
  settings: AppSettings;
  activeModel: AIModel;
  onSwitchToVisionModel: () => void;
  isStreaming: boolean;
  onSendMessage: (
    content: string,
    attachments?: Attachment[],
    targetConvId?: string,
    options?: { webSearch?: boolean }
  ) => void;
  onStopStreaming: () => void;
  onRegenerateMessage: (messageIndex: number) => void;
  onEditMessage: (messageIndex: number, newContent: string) => void;
  onDeleteMessage: (messageIndex: number) => void;
  onFeedbackMessage: (messageIndex: number, type: 'like' | 'dislike') => void;
  onRetryMessage: (messageIndex: number) => void;
  onOpenImageGenerator: () => void;
  onOpenVoiceMode?: () => void;
  currentLanguage: 'en' | 'te';
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  user,
  settings,
  activeModel,
  onSwitchToVisionModel,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  onFeedbackMessage,
  onRetryMessage,
  onOpenImageGenerator,
  onOpenVoiceMode,
  currentLanguage,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechSessionRef = useRef<SpeechRecognitionSession | null>(null);

  const scrollToBottom = () => {
    if (settings.general.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleToggleVoice = () => {
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
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
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

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isStreaming || isProcessingFiles) return;
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

    onSendMessage(inputText.trim(), attachments, undefined, { webSearch: webSearchEnabled });
    setInputText('');
    setAttachments([]);
    setAttachmentErrors([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (settings.general.enterSendsMessage && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const promptStarters = currentLanguage === 'te'
    ? [
        { icon: Sparkles, title: 'కవిత రాయండి', prompt: 'CHAT AI సామర్థ్యాల గురించి ఒక స్ఫూర్తిదాయకమైన తెలుగు కవిత రాయండి.' },
        { icon: Code2, title: 'కోడ్ సహాయం', prompt: 'రియాక్ట్ లో ఒక కాంపోనెంట్ ఆప్టిమైజ్ చేయడానికి ఉపయోగపడే చిట్కాలు మరియు ఉదాహరణలు ఇవ్వండి.' },
        { icon: Languages, title: 'ఆంగ్ల అనువాదం', prompt: 'ఈ వాక్యాన్ని చక్కటి ఇంగ్లీష్ లోకి అనువదించండి: "కష్టపడి పనిచేస్తే విజయం తథ్యం."' },
        { icon: Lightbulb, title: 'ఆలోచనలు & ప్రణాళిక', prompt: 'ఒక సరికొత్త AI స్టార్టప్ కోసం 3 విశిష్ట ఆలోచనలు మరియు వ్యూహాన్ని వివరించండి.' },
      ]
    : [
        { icon: Code2, title: 'Code Architect', prompt: 'Write a TypeScript generic utility to debounce async API calls with cancellation support.' },
        { icon: Languages, title: 'Telugu Translator', prompt: 'Translate this paragraph to natural, elegant Telugu with cultural context: "Creativity is intelligence having fun."' },
        { icon: PenTool, title: 'Executive Memo', prompt: 'Draft a crisp executive memo on AI adoption strategies for our engineering roadmap.' },
        { icon: Lightbulb, title: 'Analyze & Critique', prompt: 'Compare PostgreSQL vs Vector databases for real-time semantic retrieval at scale.' },
      ];

  const hasMessages = conversation.messages.length > 0;

  return (
    <div
      style={{ backgroundColor: 'var(--chat-bg)', color: 'var(--chat-text)' }}
      className="flex-1 flex flex-col h-[calc(100dvh-3.5rem)] relative overflow-hidden"
    >
      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {!hasMessages ? (
          <div className="min-h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-6">
            <div className="space-y-3">
              <div className="flex justify-center">
                <BrandLogo size="xl" showText={false} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
                {currentLanguage === 'te' ? 'నేను మీకు ఎలా సహాయపడగలను?' : 'What can I help you with today?'}
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">
                CHAT AI • Your AI. Your World. • Multimodal &amp; Multilingual
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
              {promptStarters.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(item.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF]/60 dark:hover:bg-white/[0.07] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#93C5FD] text-left transition duration-150 group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-[#2563EB] dark:text-sky-400 transition-colors" />
                      <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pb-40 pt-3">
            {conversation.messages.map((msg, index) => (
              <ChatMessage
                key={msg.id || index}
                message={msg}
                user={user}
                isStreaming={isStreaming && index === conversation.messages.length - 1 && msg.role === 'assistant'}
                onRegenerate={msg.role === 'assistant' ? () => onRegenerateMessage(index) : undefined}
                onEdit={msg.role === 'user' ? (newContent) => onEditMessage(index, newContent) : undefined}
                onDelete={() => onDeleteMessage(index)}
                onFeedback={(type) => onFeedbackMessage(index, type)}
                onRetry={() => onRetryMessage(index)}
                selectedVoiceURI={settings.voice.selectedVoiceURI}
                speechRate={settings.voice.speechRate}
                speechPitch={settings.voice.speechPitch}
                speechVolume={settings.voice.volume}
                voiceGender={settings.voice.voiceGender}
                voiceLanguage={settings.voice.voiceLanguage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Bar */}
      <div
        style={{ background: 'linear-gradient(to top, var(--chat-bg) 78%, transparent)' }}
        className="absolute inset-x-0 bottom-0 pt-6 pb-4 px-4 sm:px-6 z-20"
      >
        <div className="max-w-3xl mx-auto space-y-2">
          {voiceNotice && (
            <div className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/80 border border-[#BFDBFE] dark:border-sky-500/30 text-xs text-[#1E40AF] dark:text-sky-200 text-center animate-in fade-in">
              {voiceNotice}
            </div>
          )}

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

          {/* Input Box Container */}
          <div
            style={{ backgroundColor: 'var(--chat-input-bg)' }}
            className="relative rounded-2xl border border-[#BFDBFE] dark:border-white/10 focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-[#DBEAFE]/70 dark:focus-within:ring-sky-500/20 shadow-lg shadow-blue-900/5 dark:shadow-black/50 transition duration-150"
          >
            <textarea
              ref={textareaRef}
              data-testid="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                webSearchEnabled
                  ? 'Ask anything to search the web...'
                  : currentLanguage === 'te'
                  ? 'CHAT AI ని ఏదైనా అడగండి లేదా తెలుగులో మాట్లాడండి...'
                  : 'Message CHAT AI (English or తెలుగు)...'
              }
              rows={1}
              className="w-full bg-transparent px-4 pt-3.5 pb-14 text-sm text-[#0F172A] dark:text-slate-100 placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none resize-none min-h-[52px] max-h-[180px] leading-relaxed"
            />

            <div className="absolute left-2.5 bottom-2 right-2.5 flex items-center justify-between">
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
                {onOpenVoiceMode && (
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
                )}

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    handleToggleVoice();
                  }}
                  title={isListening ? 'Stop listening' : 'Dictate with voice'}
                  className={`p-2 rounded-xl transition cursor-pointer touch-manipulation ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                      : 'text-[#2563EB] dark:text-sky-400 hover:bg-[#EFF6FF] dark:hover:bg-white/10'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {isStreaming ? (
                  <button
                    type="button"
                    data-testid="chat-stop-btn"
                    onClick={onStopStreaming}
                    title="Stop generating"
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 transition flex items-center gap-1.5 shadow-sm text-xs font-semibold cursor-pointer touch-manipulation"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="chat-send-btn"
                    onClick={handleSend}
                    disabled={
                      (!inputText.trim() && attachments.length === 0) ||
                      isProcessingFiles ||
                      hasUnsupportedImage
                    }
                    title="Send message"
                    className={`p-2 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer touch-manipulation ${
                      (inputText.trim() || attachments.length > 0) &&
                      !isProcessingFiles &&
                      !hasUnsupportedImage
                        ? 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white shadow-md shadow-blue-600/30'
                        : 'bg-[#F1F5F9] dark:bg-white/[0.06] text-[#94A3B8] dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 px-1">
            <span>
              {currentLanguage === 'te'
                ? 'CHAT AI తప్పులు చేయవచ్చు. ముఖ్య సమాచారాన్ని ధృవీకరించుకోండి.'
                : 'CHAT AI can make mistakes. Verify important info.'}
            </span>
            <span className="hidden sm:inline-block">
              {settings.general.enterSendsMessage ? 'Enter to send • Shift+Enter for newline' : 'Shift+Enter to send'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
