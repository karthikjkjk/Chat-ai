// Complete FREE Dual-Voice Audio System for CHAT AI
// Optimized for browser speechSynthesis & Android Chrome with zero paid APIs

export type VoiceGender = 'male' | 'female' | 'auto';
export type VoiceLanguage = 'te-IN' | 'en-IN' | 'en-US';
export type PlaybackState = 'idle' | 'speaking' | 'paused';

export interface DetectedVoice {
  voice: SpeechSynthesisVoice;
  detectedGender: 'male' | 'female' | 'unknown';
  isTelugu: boolean;
  isIndianEnglish: boolean;
  isUSEnglish: boolean;
  displayName: string;
}

export interface VoiceSupportInfo {
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  totalVoices: number;
  hasTeluguVoice: boolean;
  hasMaleVoice: boolean;
  hasFemaleVoice: boolean;
  notes: string;
}

export interface SpeakOptions {
  messageId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
  gender?: VoiceGender;
  language?: VoiceLanguage;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onPause?: () => void;
  onResume?: () => void;
}

const TELUGU_SCRIPT_REGEX = /[\u0C00-\u0C7F]/;

// Clean text for natural speech playback
export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' Code block. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split speech into natural sentence chunks to avoid Android Chrome's 15s cutoff
// and allow reliable Pause/Resume across chunks
function chunkTextForSpeech(text: string, maxChunkLength = 220): string[] {
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const chunks: string[] = [];

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length <= maxChunkLength) {
      chunks.push(sentence);
    } else {
      const words = sentence.split(/\s+/);
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length > maxChunkLength && current) {
          chunks.push(current.trim());
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
      if (current.trim()) {
        chunks.push(current.trim());
      }
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

// Synchronously unlock Android Chrome speechSynthesis during a user click/keypress
export function unlockSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      const primer = new SpeechSynthesisUtterance(' ');
      primer.volume = 0;
      primer.rate = 2;
      window.speechSynthesis.speak(primer);
    }
  } catch {
    // Ignore unlock failures on restricted contexts
  }
}

// Global Playback Controller State
class VoicePlaybackController {
  public state: PlaybackState = 'idle';
  public currentMessageId: string | null = null;
  public lastSpokenText: string | null = null;
  public lastOptions: SpeakOptions | null = null;

  private activePlaybackId = 0;
  private chunks: string[] = [];
  private currentChunkIndex = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<(state: PlaybackState, messageId: string | null) => void> = new Set();
  private voicesListeners: Set<(voices: DetectedVoice[]) => void> = new Set();
  private cachedDetectedVoices: DetectedVoice[] = [];
  private hasStartedCurrentPlayback = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.refreshVoices();
      };
      this.refreshVoices();
    }
  }

  public subscribe(callback: (state: PlaybackState, messageId: string | null) => void) {
    this.listeners.add(callback);
    callback(this.state, this.currentMessageId);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeVoices(callback: (voices: DetectedVoice[]) => void) {
    this.voicesListeners.add(callback);
    callback(this.getDetectedVoices());
    return () => {
      this.voicesListeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.state, this.currentMessageId));
  }

  private notifyVoices() {
    this.voicesListeners.forEach((cb) => cb(this.cachedDetectedVoices));
  }

  public refreshVoices(): DetectedVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    const rawVoices = window.speechSynthesis.getVoices();
    this.cachedDetectedVoices = rawVoices.map((v) => {
      const nameLower = v.name.toLowerCase();
      const langLower = (v.lang || '').toLowerCase();

      let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';

      const maleKeywords = [
        'male', 'guy', 'david', 'mark', 'george', 'james', 'ravi',
        'daniel', 'tom', 'oliver', 'rishi', 'steffan', 'alex', 'brian', 'prabhat', 'mohan'
      ];
      const femaleKeywords = [
        'female', 'girl', 'zira', 'jenny', 'sonia', 'heera', 'swara',
        'samantha', 'victoria', 'karen', 'veena', 'ananya', 'priya', 'susan', 'neerja', 'shruti'
      ];

      if (nameLower.includes('female') || nameLower.includes('woman') || femaleKeywords.some(k => nameLower.includes(k))) {
        detectedGender = 'female';
      } else if (nameLower.includes('male') || nameLower.includes('man') || maleKeywords.some(k => nameLower.includes(k))) {
        detectedGender = 'male';
      }

      const isTelugu = langLower.startsWith('te');
      const isIndianEnglish = langLower.includes('en-in') || (langLower.startsWith('en') && nameLower.includes('india'));
      const isUSEnglish = langLower.includes('en-us') || (langLower.startsWith('en') && (nameLower.includes('us') || nameLower.includes('united states')));

      return {
        voice: v,
        detectedGender,
        isTelugu,
        isIndianEnglish,
        isUSEnglish,
        displayName: `${v.name} (${v.lang})${detectedGender !== 'unknown' ? ` • ${detectedGender}` : ''}`,
      };
    });

    this.notifyVoices();
    return this.cachedDetectedVoices;
  }

  public getDetectedVoices(): DetectedVoice[] {
    if (this.cachedDetectedVoices.length === 0) {
      this.refreshVoices();
    }
    return this.cachedDetectedVoices;
  }

  public resolveVoice(
    gender: VoiceGender = 'auto',
    language: VoiceLanguage = 'en-US',
    manualVoiceURI?: string
  ): { voice: SpeechSynthesisVoice | null; simulatedPitchMod: number; isFallback: boolean; warning?: string } {
    const all = this.getDetectedVoices();
    if (all.length === 0) {
      return { voice: null, simulatedPitchMod: 1.0, isFallback: true, warning: 'No system voices loaded yet.' };
    }

    // 1. Manual selection takes precedence unless auto-switched for Telugu script
    if (manualVoiceURI) {
      const match = all.find((d) => d.voice.voiceURI === manualVoiceURI);
      if (match) {
        return { voice: match.voice, simulatedPitchMod: 1.0, isFallback: false };
      }
    }

    // 2. Filter by target language
    let langMatches = all.filter((d) => {
      const l = (d.voice.lang || '').toLowerCase();
      if (language === 'te-IN') return l.startsWith('te');
      if (language === 'en-IN') return l.includes('en-in') || (l.startsWith('en') && d.voice.name.toLowerCase().includes('india'));
      return l.includes('en-us') || l.startsWith('en');
    });

    let warning: string | undefined;
    let isFallback = false;

    if (language === 'te-IN' && langMatches.length === 0) {
      warning = 'No native Telugu (te-IN) voice found on this device. Android Chrome can install Telugu voices via Android Settings > Accessibility / System > Text-to-speech.';
      isFallback = true;
      langMatches = all.filter((d) => d.isIndianEnglish || d.voice.lang.toLowerCase().startsWith('en'));
      if (langMatches.length === 0) langMatches = all;
    }

    // 3. Filter by gender if requested
    let simulatedPitchMod = 1.0;
    let finalVoice: SpeechSynthesisVoice | null = null;

    if (gender === 'male' || gender === 'female') {
      const genderMatches = langMatches.filter((d) => d.detectedGender === gender);
      if (genderMatches.length > 0) {
        finalVoice = genderMatches[0].voice;
      } else {
        finalVoice = langMatches[0]?.voice || all[0].voice;
        simulatedPitchMod = gender === 'male' ? 0.85 : 1.15;
      }
    } else {
      finalVoice = langMatches[0]?.voice || all[0].voice;
    }

    return {
      voice: finalVoice,
      simulatedPitchMod,
      isFallback,
      warning,
    };
  }

  private speakNextChunk(playbackId: number, options?: SpeakOptions) {
    if (playbackId !== this.activePlaybackId) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (this.currentChunkIndex >= this.chunks.length) {
      this.state = 'idle';
      this.currentMessageId = null;
      this.currentUtterance = null;
      this.notify();
      options?.onEnd?.();
      return;
    }

    const chunkText = this.chunks[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    // Automatically match Telugu voice when Telugu script is detected in the chunk
    const containsTelugu = TELUGU_SCRIPT_REGEX.test(chunkText);
    const requestedLang: VoiceLanguage = containsTelugu
      ? 'te-IN'
      : options?.language === 'te-IN'
      ? 'en-IN'
      : options?.language || 'en-US';

    const useManualURI = containsTelugu ? undefined : options?.voiceURI;
    const { voice, simulatedPitchMod } = this.resolveVoice(
      options?.gender || 'auto',
      requestedLang,
      useManualURI
    );

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || requestedLang;
    } else {
      utterance.lang = requestedLang;
    }

    const baseRate = options?.rate ?? 1.0;
    const basePitch = (options?.pitch ?? 1.0) * simulatedPitchMod;
    const baseVolume = options?.volume ?? 1.0;

    utterance.rate = Math.max(0.5, Math.min(2.0, baseRate));
    utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch));
    utterance.volume = Math.max(0.0, Math.min(1.0, baseVolume));

    utterance.onstart = () => {
      if (playbackId !== this.activePlaybackId) return;
      this.state = 'speaking';
      this.notify();
      if (!this.hasStartedCurrentPlayback) {
        this.hasStartedCurrentPlayback = true;
        options?.onStart?.();
      }
    };

    utterance.onpause = () => {
      if (playbackId !== this.activePlaybackId) return;
      this.state = 'paused';
      this.notify();
      options?.onPause?.();
    };

    utterance.onresume = () => {
      if (playbackId !== this.activePlaybackId) return;
      this.state = 'speaking';
      this.notify();
      options?.onResume?.();
    };

    utterance.onend = () => {
      if (playbackId !== this.activePlaybackId) return;
      if (this.state === 'paused') {
        // Android Chrome sometimes triggers onend instead of holding pause;
        // preserve paused state and wait for resume() to continue from currentChunkIndex
        return;
      }
      this.currentChunkIndex += 1;
      this.speakNextChunk(playbackId, options);
    };

    utterance.onerror = (e: any) => {
      if (playbackId !== this.activePlaybackId) return;
      // Ignore interruption errors triggered during deliberate stop/cancel
      if (e?.error === 'interrupted' || e?.error === 'canceled') return;
      this.state = 'idle';
      this.currentMessageId = null;
      this.currentUtterance = null;
      this.notify();
      options?.onError?.(e);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Play text (prevents overlapping voices by invalidating & cancelling any prior playback)
  public speak(text: string, options?: SpeakOptions) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    // Immediately stop any active speech to prevent overlapping voices
    this.stop();

    this.activePlaybackId += 1;
    const playbackId = this.activePlaybackId;

    this.lastSpokenText = text;
    this.lastOptions = options || null;
    this.currentMessageId = options?.messageId || null;
    this.chunks = chunkTextForSpeech(clean);
    this.currentChunkIndex = 0;
    this.hasStartedCurrentPlayback = false;
    this.state = 'speaking';
    this.notify();

    this.speakNextChunk(playbackId, options);
  }

  // Pause
  public pause() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.state !== 'speaking') return;

    try {
      window.speechSynthesis.pause();
    } catch {
      // Fallback handled by state tracking
    }
    this.state = 'paused';
    this.notify();
    this.lastOptions?.onPause?.();
  }

  // Resume
  public resume() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.state !== 'paused') return;

    this.state = 'speaking';
    this.notify();
    this.lastOptions?.onResume?.();

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        // Verify Chrome didn't silently drop the utterance while paused
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          this.speakNextChunk(this.activePlaybackId, this.lastOptions || undefined);
        }
      } else {
        // Android Chrome sometimes ends/drops utterances instead of pausing;
        // cleanly continue from the active chunk index!
        this.speakNextChunk(this.activePlaybackId, this.lastOptions || undefined);
      }
    } catch {
      this.speakNextChunk(this.activePlaybackId, this.lastOptions || undefined);
    }
  }

  // Stop / Interrupt immediately
  public stop() {
    this.activePlaybackId += 1;
    this.chunks = [];
    this.currentChunkIndex = 0;
    this.currentUtterance = null;
    this.currentMessageId = null;
    this.state = 'idle';

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  // Replay
  public replay() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, this.lastOptions || undefined);
    }
  }
}

export const voiceController = new VoicePlaybackController();

// Convenience functions
export function speakText(text: string, options?: SpeakOptions): void {
  voiceController.speak(text, options);
}

export function pauseSpeaking(): void {
  voiceController.pause();
}

export function resumeSpeaking(): void {
  voiceController.resume();
}

export function stopSpeaking(): void {
  voiceController.stop();
}

export function replaySpeaking(): void {
  voiceController.replay();
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return voiceController.getDetectedVoices().map((d) => d.voice);
}

export function getDetailedVoices(): DetectedVoice[] {
  return voiceController.getDetectedVoices();
}

// Device Voice Audit & Diagnostics
export function auditDeviceVoices(): VoiceSupportInfo {
  const hasRecognition = typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const hasSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const voices = voiceController.getDetectedVoices();
  const hasTelugu = voices.some((v) => v.isTelugu);
  const hasMale = voices.some((v) => v.detectedGender === 'male');
  const hasFemale = voices.some((v) => v.detectedGender === 'female');

  let notes = 'Free browser speech synthesis is fully active.';
  if (!hasSynthesis) {
    notes = 'SpeechSynthesis is not supported in this browser environment.';
  } else if (!hasTelugu) {
    notes = 'No dedicated Telugu voice installed on this device. English/Device voice fallback will be used.';
  }

  return {
    hasSpeechRecognition: hasRecognition,
    hasSpeechSynthesis: hasSynthesis,
    totalVoices: voices.length,
    hasTeluguVoice: hasTelugu,
    hasMaleVoice: hasMale,
    hasFemaleVoice: hasFemale,
    notes,
  };
}

export const checkVoiceSupport = auditDeviceVoices;

// Speech Recognition (Speech-to-Text)
export class SpeechRecognitionSession {
  private recognition: any = null;
  public isListening: boolean = false;
  private hasStarted: boolean = false;
  private hadError: boolean = false;
  private startWatchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private onResult: (transcript: string, isFinal: boolean) => void,
    private onError: (error: string) => void,
    private onStateChange: (listening: boolean) => void,
    private language: string = 'en-US'
  ) {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;

      this.recognition.onstart = () => {
        if (this.startWatchdog) {
          clearTimeout(this.startWatchdog);
          this.startWatchdog = null;
        }
        // Interrupt ongoing AI speech when user starts talking
        voiceController.stop();
        this.hasStarted = true;
        this.isListening = true;
        this.onStateChange(true);
      };

      this.recognition.onend = () => {
        if (this.startWatchdog) {
          clearTimeout(this.startWatchdog);
          this.startWatchdog = null;
        }
        const neverStarted = !this.hasStarted && !this.hadError;
        this.isListening = false;
        this.onStateChange(false);
        if (neverStarted) {
          this.hadError = true;
          this.onError('audio-capture');
        }
      };

      this.recognition.onerror = (event: any) => {
        if (this.startWatchdog) {
          clearTimeout(this.startWatchdog);
          this.startWatchdog = null;
        }
        this.hadError = true;
        this.isListening = false;
        this.onStateChange(false);
        this.onError(event.error || 'Speech recognition encountered an issue.');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        if (text) {
          this.onResult(text, Boolean(finalTranscript));
        }
      };
    }
  }

  start() {
    if (!this.recognition) {
      this.onError('Speech recognition is not supported in your browser (Chrome on Android or desktop recommended).');
      return;
    }
    this.hasStarted = false;
    this.hadError = false;
    this.startWatchdog = setTimeout(() => {
      if (!this.hasStarted && !this.hadError) {
        this.hadError = true;
        try {
          this.recognition.abort?.();
        } catch {
          // ignore
        }
        this.onStateChange(false);
        this.onError('audio-capture');
      }
    }, 1500);

    try {
      this.recognition.start();
    } catch (e: any) {
      if (this.startWatchdog) {
        clearTimeout(this.startWatchdog);
        this.startWatchdog = null;
      }
      this.hadError = true;
      this.onError(e?.message || 'Could not start microphone.');
    }
  }

  stop() {
    if (this.startWatchdog) {
      clearTimeout(this.startWatchdog);
      this.startWatchdog = null;
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
  }
}
