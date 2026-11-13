import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Send,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import {
  voiceController,
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  unlockSpeechSynthesis,
  SpeechRecognitionSession,
  auditDeviceVoices,
  VoiceGender,
  VoiceLanguage,
  PlaybackState,
} from '../utils/voice.ts';
import { AppSettings, User as UserType } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string) => Promise<void> | void;
  lastAssistantMessage?: string;
  isAIStreaming: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  user: UserType;
}

type VoiceModeStatus = 'ready' | 'listening' | 'thinking' | 'speaking' | 'paused';

const WAVEFORM_BAR_SEEDS = [
  0.35, 0.58, 0.82, 0.45, 0.95, 0.68, 0.52, 0.88, 0.4, 0.74, 0.92, 0.55, 0.78, 0.42, 0.66, 0.38,
];

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  lastAssistantMessage,
  isAIStreaming,
  settings,
  onUpdateSettings,
}) => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPausedState, setIsPausedState] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [waveTick, setWaveTick] = useState(0);
  const [supportInfo, setSupportInfo] = useState(() => auditDeviceVoices());

  const speechSessionRef = useRef<SpeechRecognitionSession | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingAIReplyRef = useRef(false);
  const previousMessageRef = useRef<string | undefined>(lastAssistantMessage);
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!isOpen) return;
    setSupportInfo(auditDeviceVoices());
    setVoiceNotice(null);
    setElapsedSeconds(0);
    setIsPausedState(false);
    awaitingAIReplyRef.current = false;
    previousMessageRef.current = lastAssistantMessage;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const onVoices = () => setSupportInfo(auditDeviceVoices());
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = voiceController.subscribe((state) => {
      setPlaybackState(state);
    });
    return unsub;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (
      awaitingAIReplyRef.current &&
      !isAIStreaming &&
      lastAssistantMessage &&
      lastAssistantMessage !== previousMessageRef.current
    ) {
      awaitingAIReplyRef.current = false;
      previousMessageRef.current = lastAssistantMessage;
      setIsPausedState(false);
      speakText(lastAssistantMessage, {
        rate: settings.voice.speechRate,
        pitch: settings.voice.speechPitch,
        volume: settings.voice.volume,
        gender: settings.voice.voiceGender,
        language: settings.voice.voiceLanguage,
        voiceURI: settings.voice.selectedVoiceURI,
      });
    }
  }, [isOpen, lastAssistantMessage, isAIStreaming, settings.voice]);

  const status: VoiceModeStatus = (() => {
    if (isPausedState || playbackState === 'paused') return 'paused';
    if (isListening) return 'listening';
    if (isAIStreaming || awaitingAIReplyRef.current) return 'thinking';
    if (playbackState === 'speaking') return 'speaking';
    return 'ready';
  })();

  useEffect(() => {
    if (!isOpen) return;
    if (status === 'ready' || status === 'paused') return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, status]);

  useEffect(() => {
    if (!isOpen) return;
    if (status === 'paused' || status === 'ready') return;

    const interval = setInterval(() => {
      setWaveTick((prev) => prev + 1);
    }, 140);
    return () => clearInterval(interval);
  }, [isOpen, status]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopListening = () => {
    clearSilenceTimer();
    if (speechSessionRef.current) {
      speechSessionRef.current.stop();
      speechSessionRef.current = null;
    }
    setIsListening(false);
  };

  const handleSendSpokenInput = async (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;

    stopListening();
    stopSpeaking();
    setTranscript('');
    setIsPausedState(false);
    awaitingAIReplyRef.current = true;
    previousMessageRef.current = lastAssistantMessage;

    await onSendMessage(clean);
  };

  const startListening = () => {
    stopSpeaking();
    unlockSpeechSynthesis();
    setIsPausedState(false);
    setVoiceNotice(null);

    const audit = auditDeviceVoices();
    if (!audit.hasSpeechRecognition) {
      setVoiceNotice(
        'Browser speech recognition (microphone capture) is not supported in this browser. Use Chrome on Android or Desktop for live voice input.'
      );
      return;
    }

    const recognitionLang = settings.voice.voiceLanguage;

    const session = new SpeechRecognitionSession(
      (text, isFinal) => {
        setTranscript(text);
        clearSilenceTimer();

        const delayMs = isFinal ? 1300 : 2000;
        silenceTimerRef.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            handleSendSpokenInput(transcriptRef.current.trim());
          }
        }, delayMs);
      },
      (err) => {
        const lower = String(err).toLowerCase();
        if (lower.includes('not-allowed') || lower.includes('permission')) {
          setVoiceNotice(
            'Microphone permission denied. Please allow microphone access in browser site settings and tap the microphone again.'
          );
        } else if (lower.includes('no-speech')) {
          setVoiceNotice('No speech detected. Tap the microphone and speak clearly.');
        } else if (lower.includes('audio-capture')) {
          setVoiceNotice('No active microphone found or speech capture is unavailable in this browser environment.');
        } else if (lower.includes('network')) {
          setVoiceNotice('Browser speech recognition service is unavailable in this environment. Use Chrome on Android or Desktop with internet access.');
        } else {
          setVoiceNotice(`Microphone error: ${err}`);
        }
        setIsListening(false);
      },
      (listening) => {
        setIsListening(listening);
      },
      recognitionLang
    );

    speechSessionRef.current = session;
    session.start();
  };

  const handleToggleMic = () => {
    if (playbackState === 'speaking') {
      startListening();
      return;
    }
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        handleSendSpokenInput(transcript.trim());
      }
    } else {
      startListening();
    }
  };

  const handlePauseResume = () => {
    if (playbackState === 'speaking') {
      pauseSpeaking();
      setIsPausedState(true);
      return;
    }
    if (playbackState === 'paused' || isPausedState) {
      setIsPausedState(false);
      if (playbackState === 'paused') {
        resumeSpeaking();
      } else {
        startListening();
      }
      return;
    }
    if (isListening) {
      stopListening();
      setIsPausedState(true);
    }
  };

  const handleFullStop = () => {
    awaitingAIReplyRef.current = false;
    stopListening();
    stopSpeaking();
    setIsPausedState(false);
    setTranscript('');
    setElapsedSeconds(0);
  };

  const handleCloseModal = () => {
    handleFullStop();
    onClose();
  };

  const handleChangeGender = (gender: VoiceGender) => {
    onUpdateSettings({
      ...settings,
      voice: { ...settings.voice, voiceGender: gender },
    });
    stopSpeaking();
  };

  const handleChangeLanguage = (lang: VoiceLanguage) => {
    onUpdateSettings({
      ...settings,
      voice: { ...settings.voice, voiceLanguage: lang },
    });
    stopSpeaking();
    if (isListening) {
      stopListening();
    }
  };

  if (!isOpen) return null;

  const statusText =
    status === 'listening'
      ? 'Listening'
      : status === 'thinking'
      ? 'Thinking'
      : status === 'speaking'
      ? 'Speaking'
      : status === 'paused'
      ? 'Paused'
      : 'Ready';

  const statusSubtext =
    status === 'listening'
      ? 'Speak now — tap Mic or pause briefly to send'
      : status === 'thinking'
      ? 'CHAT AI is thinking...'
      : status === 'speaking'
      ? 'Tap Mic anytime to interrupt'
      : status === 'paused'
      ? 'Session paused — tap Resume to continue'
      : 'Tap the microphone to start speaking';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CHAT AI Voice Mode"
      data-testid="voice-mode-modal"
      className="fixed inset-0 z-50 h-[100dvh] w-full bg-[#F8FAFC] dark:bg-[#060914] text-[#0F172A] dark:text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Subtle Ambient Blue & Sky Glow Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] sm:w-[36rem] sm:h-[36rem] rounded-full blur-[110px] transition-opacity duration-500 ${
            status === 'speaking'
              ? 'bg-gradient-to-tr from-[#DBEAFE] via-[#93C5FD] to-[#38BDF8]/40 dark:from-blue-600/35 dark:via-sky-500/30 dark:to-blue-400/20 opacity-90'
              : status === 'listening'
              ? 'bg-gradient-to-tr from-[#38BDF8]/35 via-[#DBEAFE] to-[#2563EB]/25 opacity-85'
              : 'bg-[#DBEAFE]/70 dark:bg-blue-900/20 opacity-70'
          }`}
        />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3">
        <BrandLogo size="sm" showText={true} showTagline={false} />

        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-[#E2E8F0] dark:border-white/15 shadow-2xs">
          <span data-testid="voice-state-label" className="font-bold text-[#2563EB] dark:text-sky-300">
            {statusText}
          </span>
          <span aria-hidden="true" className="text-[#CBD5E1] dark:text-slate-500">
            ·
          </span>
          <span
            data-testid="voice-timer"
            className="font-mono tabular-nums text-[#0F172A] dark:text-slate-200"
          >
            {formatTimer(elapsedSeconds)}
          </span>
        </div>

        <button
          type="button"
          data-testid="voice-close-btn"
          aria-label="Close Voice Mode"
          onClick={handleCloseModal}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white dark:bg-white/[0.08] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.15] border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 shadow-xs transition cursor-pointer touch-manipulation"
          title="Close Voice Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Section: Blue Animated Waveform + Live Transcript */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-4 space-y-7 max-w-2xl mx-auto w-full">
        {voiceNotice && (
          <div
            role="alert"
            data-testid="voice-error-banner"
            className="w-full max-w-md px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-100 text-xs flex items-start gap-2.5 shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{voiceNotice}</span>
          </div>
        )}

        {/* Blue & Sky Waveform */}
        <div
          data-testid="voice-waveform"
          aria-label={`Audio waveform (${statusText})`}
          className="flex items-center justify-center gap-1.5 sm:gap-2 h-36 sm:h-44 px-4"
        >
          {WAVEFORM_BAR_SEEDS.map((seed, idx) => {
            let scale = 0.22;
            if (status === 'listening') {
              const wave = Math.abs(Math.sin((waveTick + idx * 0.7) * 0.65));
              scale = 0.28 + seed * wave * 0.72;
            } else if (status === 'speaking') {
              const wave = Math.abs(Math.cos((waveTick + idx * 0.9) * 0.8));
              scale = 0.35 + seed * wave * 0.65;
            } else if (status === 'thinking') {
              const pulse = 0.35 + 0.25 * Math.sin((waveTick - idx * 0.45) * 0.55);
              scale = pulse;
            } else if (status === 'paused') {
              scale = 0.18 + seed * 0.15;
            } else {
              scale = 0.16 + seed * 0.14;
            }

            return (
              <div
                key={idx}
                style={{
                  transform: `scaleY(${scale.toFixed(3)})`,
                }}
                className={`w-2 sm:w-2.5 h-32 sm:h-40 rounded-full transition-transform duration-150 origin-center ${
                  idx % 2 === 0
                    ? 'bg-gradient-to-t from-[#1E40AF] via-[#2563EB] to-[#38BDF8]'
                    : 'bg-gradient-to-t from-[#2563EB] via-[#38BDF8] to-[#93C5FD]'
                } ${status === 'ready' || status === 'paused' ? 'opacity-50' : 'opacity-95'}`}
              />
            );
          })}
        </div>

        {/* Status Headline & Subtext */}
        <div className="text-center space-y-1.5">
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
            {statusText}
          </p>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">{statusSubtext}</p>
        </div>

        {/* Live Recognized Transcript / AI Reply Preview */}
        <div className="w-full max-w-lg text-center px-3 min-h-[4.5rem] flex flex-col items-center justify-center gap-2">
          {transcript ? (
            <div className="space-y-2 w-full">
              <p
                data-testid="voice-transcript-text"
                className="text-sm sm:text-base text-[#0F172A] dark:text-slate-100 font-medium leading-relaxed"
              >
                "{transcript}"
              </p>
              <button
                type="button"
                data-testid="voice-send-transcript-btn"
                onClick={() => handleSendSpokenInput(transcript)}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
            </div>
          ) : status === 'thinking' ? (
            <p className="text-xs sm:text-sm text-[#2563EB] dark:text-sky-300 font-semibold">
              Sending to CHAT AI backend...
            </p>
          ) : status === 'speaking' && lastAssistantMessage ? (
            <p
              data-testid="voice-reply-preview"
              className="text-xs sm:text-sm text-[#0F172A] dark:text-slate-300 line-clamp-3 leading-relaxed"
            >
              {lastAssistantMessage}
            </p>
          ) : (
            <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              {!supportInfo.hasSpeechRecognition
                ? 'SpeechRecognition unavailable here — TTS playback & settings active.'
                : !supportInfo.hasTeluguVoice && settings.voice.voiceLanguage === 'te-IN'
                ? 'No native Telugu voice detected on this device; browser fallback voice will be used.'
                : `Free browser voice active (${supportInfo.totalVoices} device voices detected)`}
            </p>
          )}
        </div>
      </div>

      {/* Floating White & Blue Control Panel at Bottom */}
      <div className="relative z-10 px-3 sm:px-6 pb-4 sm:pb-6 w-full max-w-xl mx-auto">
        <div className="rounded-3xl bg-white/95 dark:bg-[#0D1326]/95 backdrop-blur-xl border border-[#E2E8F0] dark:border-white/10 p-4 sm:p-5 shadow-xl shadow-blue-900/10 space-y-4">
          {/* Voice Language & Male/Female Gender Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <div className="flex items-center p-1 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E2E8F0] dark:border-white/[0.08]">
              {(['male', 'female', 'auto'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleChangeGender(g)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium capitalize transition cursor-pointer touch-manipulation ${
                    settings.voice.voiceGender === g
                      ? 'bg-[#2563EB] text-white font-semibold shadow-2xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
                  }`}
                >
                  {g === 'auto' ? 'Auto' : `${g.charAt(0).toUpperCase() + g.slice(1)}`}
                </button>
              ))}
            </div>

            <div className="flex items-center p-1 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E2E8F0] dark:border-white/[0.08]">
              {[
                { id: 'te-IN', label: 'తెలుగు' },
                { id: 'en-IN', label: 'en-IN' },
                { id: 'en-US', label: 'en-US' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleChangeLanguage(l.id as VoiceLanguage)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer touch-manipulation ${
                    settings.voice.voiceLanguage === l.id
                      ? 'bg-[#1E40AF] text-white font-semibold shadow-2xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Floating Action Row */}
          <div className="flex items-center justify-center gap-5 sm:gap-7">
            <button
              type="button"
              data-testid="voice-pause-resume-btn"
              onClick={handlePauseResume}
              disabled={status === 'ready' || status === 'thinking'}
              aria-label={status === 'paused' ? 'Resume Voice' : 'Pause Voice'}
              className={`min-w-[56px] min-h-[56px] px-4 rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition cursor-pointer touch-manipulation ${
                status === 'ready' || status === 'thinking'
                  ? 'bg-[#F8FAFC] dark:bg-white/[0.03] border-[#E2E8F0] dark:border-white/[0.06] text-[#94A3B8] dark:text-slate-600 cursor-not-allowed'
                  : 'bg-[#EFF6FF] dark:bg-white/[0.07] hover:bg-[#DBEAFE] dark:hover:bg-white/[0.14] border-[#BFDBFE] dark:border-white/15 text-[#1E40AF] dark:text-slate-100'
              }`}
              title={status === 'paused' ? 'Resume' : 'Pause'}
            >
              {status === 'paused' ? (
                <>
                  <Play className="w-5 h-5 text-[#2563EB] dark:text-sky-400 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5 text-[#2563EB] dark:text-slate-200" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="voice-mic-btn"
              onClick={handleToggleMic}
              aria-label={isListening ? 'Stop listening and send' : 'Tap to speak'}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform duration-150 active:scale-95 cursor-pointer touch-manipulation ${
                isListening
                  ? 'bg-gradient-to-br from-[#38BDF8] to-[#2563EB] text-white ring-4 ring-[#DBEAFE]'
                  : 'bg-gradient-to-br from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white ring-4 ring-[#DBEAFE] dark:ring-blue-500/30'
              }`}
              title={
                status === 'speaking'
                  ? 'Tap to interrupt & speak'
                  : isListening
                  ? 'Listening (tap to finish)'
                  : 'Tap to speak'
              }
            >
              {isListening ? (
                <MicOff className="w-8 h-8" />
              ) : status === 'speaking' ? (
                <Volume2 className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <button
              type="button"
              data-testid="voice-stop-btn"
              onClick={handleFullStop}
              aria-label="Stop Voice Mode"
              className="min-w-[56px] min-h-[56px] px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold shadow-md transition cursor-pointer touch-manipulation"
              title="Stop speech & microphone immediately"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
