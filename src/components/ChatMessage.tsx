import React, { useState, useEffect } from 'react';
import {
  Copy, Check, RotateCw, Edit3, ThumbsUp, ThumbsDown,
  Volume2, Pause, Square, RotateCcw, FileText, CornerDownLeft
} from 'lucide-react';
import { marked } from 'marked';
import { Message, User } from '../types.ts';
import {
  voiceController, speakText, pauseSpeaking, resumeSpeaking,
  stopSpeaking, PlaybackState, VoiceGender, VoiceLanguage
} from '../utils/voice.ts';

interface ChatMessageProps {
  message: Message;
  user: User;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onFeedback?: (type: 'like' | 'dislike') => void;
  onRetry?: () => void;
  selectedVoiceURI?: string;
  speechRate?: number;
  speechPitch?: number;
  speechVolume?: number;
  voiceGender?: VoiceGender;
  voiceLanguage?: VoiceLanguage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onEdit,
  onFeedback,
  onRetry,
  selectedVoiceURI,
  speechRate = 1.0,
  speechPitch = 1.0,
  speechVolume = 1.0,
  voiceGender = 'auto',
  voiceLanguage = 'en-US',
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [isThisMessageSpeaking, setIsThisMessageSpeaking] = useState(false);

  useEffect(() => {
    const unsubscribe = voiceController.subscribe((state, messageId) => {
      setPlaybackState(state);
      setIsThisMessageSpeaking(messageId === message.id && state !== 'idle');
    });
    return unsubscribe;
  }, [message.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayVoice = () => {
    if (isThisMessageSpeaking && playbackState === 'speaking') {
      pauseSpeaking();
    } else if (isThisMessageSpeaking && playbackState === 'paused') {
      resumeSpeaking();
    } else {
      speakText(message.content, {
        messageId: message.id,
        voiceURI: selectedVoiceURI,
        rate: speechRate,
        pitch: speechPitch,
        volume: speechVolume,
        gender: voiceGender,
        language: voiceLanguage,
      });
    }
  };

  const handleStopVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopSpeaking();
  };

  const handleReplayVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakText(message.content, {
      messageId: message.id,
      voiceURI: selectedVoiceURI,
      rate: speechRate,
      pitch: speechPitch,
      volume: speechVolume,
      gender: voiceGender,
      language: voiceLanguage,
    });
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(editText.trim());
      setIsEditing(false);
    }
  };

  const renderMarkdown = (content: string) => {
    try {
      const html = marked.parse(content, { gfm: true, breaks: true });
      return { __html: html as string };
    } catch {
      return { __html: content };
    }
  };

  // USER MESSAGE: Aligned RIGHT, crisp Blue gradient bubble
  if (isUser) {
    return (
      <div className="w-full py-2.5 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex flex-col items-end">
          {/* Attachments preview if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {message.attachments.map((att) => {
                const isImg = att.kind === 'image' || att.mimeType.startsWith('image/');
                return (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-500/30 text-xs text-[#1E40AF] dark:text-blue-100 shadow-2xs"
                  >
                    {isImg && att.data ? (
                      <img src={att.data} alt={att.name} className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <FileText className="w-4 h-4 text-[#2563EB] dark:text-sky-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="block truncate max-w-[160px] font-medium">{att.name}</span>
                      {att.pageCount && (
                        <span className="block text-[10px] text-[#2563EB] dark:text-sky-300 font-mono">
                          {att.pageCount} page{att.pageCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Bubble or Inline Editor */}
          {isEditing ? (
            <div className="w-full max-w-xl space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#2563EB] text-[#0F172A] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]"
              />
              <div className="flex gap-2 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  Save &amp; Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative flex flex-col items-end">
              <div
                data-testid="user-message-bubble"
                style={{ background: 'var(--chat-user-bubble)' }}
                className="text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm md:text-[15px] leading-relaxed shadow-md shadow-blue-900/15 max-w-[88%] sm:max-w-[78%] whitespace-pre-wrap break-words font-normal"
              >
                {message.content}
              </div>

              <div className="flex items-center gap-1.5 pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-xs text-[#64748B] dark:text-slate-400">
                <span className="text-[10px] mr-1 opacity-85">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy message"
                  className="p-1 rounded hover:bg-[#EFF6FF] dark:hover:bg-white/10 hover:text-[#2563EB] transition cursor-pointer touch-manipulation"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    title="Edit message"
                    className="p-1 rounded hover:bg-[#EFF6FF] dark:hover:bg-white/10 hover:text-[#2563EB] transition cursor-pointer touch-manipulation"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ASSISTANT MESSAGE (CHAT AI): Crisp White card with soft slate/blue border
  return (
    <div className="group w-full py-2.5 px-3 sm:px-6 transition-colors duration-200">
      <div
        data-testid="ai-message-block"
        style={{
          backgroundColor: 'var(--chat-ai-bg)',
          borderColor: 'var(--chat-border)',
        }}
        className="max-w-3xl mx-auto flex flex-col items-start space-y-2.5 rounded-2xl border px-4 sm:px-5 py-4 shadow-xs"
      >
        {/* Header line: CHAT AI + Model badge + Time */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="font-bold text-[#2563EB] dark:text-sky-400 tracking-wide text-xs">
            CHAT AI
          </span>
          {message.model && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-500/15 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE] dark:border-sky-500/25">
              {message.model.replace('gemini-', '')}
            </span>
          )}
          <span className="text-[11px] text-[#64748B] dark:text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {isThisMessageSpeaking && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DBEAFE] dark:bg-blue-500/20 border border-[#93C5FD] dark:border-sky-500/40 text-[10px] text-[#1E40AF] dark:text-sky-200 font-semibold ml-1">
              <span className="flex items-center gap-0.5 h-2">
                <span className="w-0.5 h-2 bg-[#2563EB] dark:bg-sky-400 rounded-full animate-bounce" />
                <span className="w-0.5 h-3 bg-[#1E40AF] dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-0.5 h-1.5 bg-[#38BDF8] rounded-full animate-bounce [animation-delay:0.3s]" />
              </span>
              <span>{playbackState === 'paused' ? 'Voice Paused' : 'Voice Playing'}</span>
            </span>
          )}
        </div>

        {/* Message Content */}
        <div
          style={{ color: 'var(--chat-text)' }}
          className="w-full prose dark:prose-invert prose-chatai max-w-none text-sm md:text-[15px] leading-relaxed font-normal"
        >
          {message.content ? (
            <div dangerouslySetInnerHTML={renderMarkdown(message.content)} />
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400 text-sm py-1">
              <span className="inline-block w-2 h-4 bg-[#2563EB] dark:bg-sky-400 animate-cursor-blink rounded-sm align-middle" />
              <span className="text-xs font-medium">CHAT AI is thinking...</span>
            </div>
          ) : null}
          {isStreaming && message.content && (
            <span className="inline-block w-2 h-4 ml-1 bg-[#2563EB] dark:bg-sky-400 animate-cursor-blink rounded-sm align-middle" />
          )}
        </div>

        {/* Grounded Web Sources */}
        {message.webSources && message.webSources.length > 0 && (
          <div
            data-testid="message-web-sources"
            className="w-full pt-2.5 border-t border-[#E2E8F0] dark:border-white/[0.08] space-y-1.5"
          >
            <span className="text-[11px] font-semibold text-[#1E40AF] dark:text-sky-400 block">
              Web Sources
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.webSources.slice(0, 6).map((src, idx) => (
                <a
                  key={idx}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-sky-500/10 hover:bg-[#DBEAFE] dark:hover:bg-sky-500/20 border border-[#BFDBFE] dark:border-sky-500/25 text-[#1E40AF] dark:text-sky-300 truncate max-w-[240px] transition font-medium"
                  title={src.title}
                >
                  {src.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Error Notice with Retry */}
        {message.isError && (
          <div className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3 my-1">
            <span>{message.errorMessage || 'Failed to generate response. Please check your connection or click Retry.'}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Actions Toolbar: Copy, Voice, Regenerate, Like, Dislike */}
        <div
          data-testid="ai-message-actions"
          className="flex items-center gap-1.5 pt-1 text-xs flex-wrap text-[#64748B] dark:text-slate-400"
        >
          <button
            type="button"
            data-testid="msg-copy-btn"
            onClick={handleCopy}
            title="Copy response"
            className="p-1.5 rounded-lg hover:bg-[#EFF6FF] dark:hover:bg-white/5 hover:text-[#2563EB] dark:hover:text-sky-300 transition cursor-pointer touch-manipulation"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {message.content && (
            <div className="flex items-center gap-1 bg-[#F8FAFC] dark:bg-white/[0.04] p-0.5 rounded-lg border border-[#E2E8F0] dark:border-white/[0.08]">
              <button
                type="button"
                data-testid="voice-play-pause-btn"
                onClick={handlePlayVoice}
                title={
                  isThisMessageSpeaking
                    ? playbackState === 'speaking'
                      ? 'Pause voice'
                      : 'Resume voice'
                    : 'Play response aloud (Free Voice)'
                }
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-xs cursor-pointer touch-manipulation ${
                  isThisMessageSpeaking
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white font-medium shadow-xs'
                    : 'text-[#2563EB] dark:text-sky-400 hover:bg-[#DBEAFE]/70 dark:hover:bg-white/10'
                }`}
              >
                {isThisMessageSpeaking && playbackState === 'speaking' ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px] font-semibold">
                  {isThisMessageSpeaking
                    ? playbackState === 'speaking'
                      ? 'Pause'
                      : 'Resume'
                    : 'Play'}
                </span>
              </button>

              {isThisMessageSpeaking && (
                <>
                  <button
                    type="button"
                    data-testid="voice-replay-btn"
                    onClick={handleReplayVoice}
                    title="Replay from start"
                    className="p-1.5 rounded-md hover:bg-[#DBEAFE]/70 dark:hover:bg-white/10 hover:text-[#2563EB] transition cursor-pointer touch-manipulation"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    data-testid="voice-stop-btn"
                    onClick={handleStopVoice}
                    title="Stop speaking"
                    className="px-1.5 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 transition flex items-center gap-1 text-[10px] font-semibold cursor-pointer touch-manipulation"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>
          )}

          {onRegenerate && (
            <button
              type="button"
              data-testid="msg-regenerate-btn"
              onClick={onRegenerate}
              title="Regenerate response"
              className="p-1.5 rounded-lg hover:bg-[#EFF6FF] dark:hover:bg-white/5 hover:text-[#2563EB] dark:hover:text-sky-300 transition cursor-pointer touch-manipulation"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onFeedback && (
            <>
              <button
                type="button"
                data-testid="msg-like-btn"
                onClick={() => onFeedback('like')}
                title="Good response"
                className={`p-1.5 rounded-lg transition cursor-pointer touch-manipulation ${
                  message.feedback === 'like'
                    ? 'text-[#2563EB] dark:text-sky-400 bg-[#DBEAFE] dark:bg-blue-500/15'
                    : 'hover:bg-[#EFF6FF] dark:hover:bg-white/5 hover:text-[#2563EB]'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="msg-dislike-btn"
                onClick={() => onFeedback('dislike')}
                title="Bad response"
                className={`p-1.5 rounded-lg transition cursor-pointer touch-manipulation ${
                  message.feedback === 'dislike'
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15'
                    : 'hover:bg-rose-50 dark:hover:bg-white/5 hover:text-rose-600'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
