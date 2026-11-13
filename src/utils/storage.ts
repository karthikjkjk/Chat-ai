import { Conversation, User, AppSettings, SavedMemory } from '../types.ts';

const DEFAULT_USER: User = {
  id: 'user_karthik_01',
  name: 'Karthik',
  email: 'karthikjk630@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  plan: 'CHAT AI Pro',
  joinedDate: 'November 2024',
  totalMessages: 48,
  totalConversations: 6,
};

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    defaultModel: 'gemini-3.1-flash-lite',
    enterSendsMessage: true,
    soundEffects: true,
    autoScroll: true,
    codeTheme: 'dark',
  },
  appearance: {
    theme: 'light',
    accentColor: 'blue',
    fontSize: 'normal',
    chatBgColor: '#F8FAFC',
    userBubbleColor: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
    textColor: '#0F172A',
  },
  language: {
    interfaceLanguage: 'en',
    speechLanguage: 'en-US',
    autoDetectTelugu: true,
    bilingualResponses: false,
  },
  personalization: {
    userProfession: 'Software Engineer & AI Builder',
    aboutUser: 'Values natural, direct answers in English and Telugu (తెలుగు), and modern TypeScript & React engineering.',
    responseStyle: 'Natural, direct, and concise by default. Provide detailed or step-by-step explanations when asked.',
    preferredTone: 'balanced',
  },
  memory: {
    enabled: true,
    memories: [
      {
        id: 'mem_1',
        content: 'Prefers TypeScript over plain JavaScript with strict types.',
        createdAt: Date.now() - 86400000 * 3,
      },
      {
        id: 'mem_2',
        content: 'Fluent in both English and Telugu (తెలుగు).',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'mem_3',
        content: 'Building CHAT AI as an enterprise-grade AI assistant.',
        createdAt: Date.now() - 86400000,
      },
    ],
  },
  voice: {
    speechRate: 1.0,
    speechPitch: 1.0,
    volume: 1.0,
    selectedVoiceURI: '',
    voiceGender: 'auto',
    voiceLanguage: 'en-US',
    autoReadAloud: false,
  },
  notifications: {
    soundAlerts: true,
    desktopNotifications: false,
  },
  security: {
    twoFactorEnabled: true,
    sessions: [
      {
        id: 'sess_1',
        device: 'Chrome on Linux / Android',
        browser: 'Chrome 131',
        ip: '192.168.1.42',
        lastActive: 'Active now',
        isCurrent: true,
      },
      {
        id: 'sess_2',
        device: 'Pixel 9 Pro Mobile',
        browser: 'Chrome Mobile',
        ip: '104.28.19.12',
        lastActive: '2 hours ago',
        isCurrent: false,
      },
    ],
  },
  dataControls: {
    historyEnabled: true,
    autoDeleteDays: 0,
  },
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_welcome',
    userId: 'user_karthik_01',
    title: 'Welcome to CHAT AI',
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 4,
    modelUsed: 'gemini-3.1-flash-lite',
    isPinned: true,
    messages: [
      {
        id: 'msg_welcome_1',
        role: 'user',
        content: 'What makes CHAT AI special?',
        timestamp: Date.now() - 3600000 * 4,
      },
      {
        id: 'msg_welcome_2',
        role: 'assistant',
        content: `# Welcome to CHAT AI 🚀
*Your AI. Your World.*

CHAT AI was created by **KARTHIK JANNE**, the founder and owner of CHAT AI — designed as a next-generation AI companion engineered for high-performance reasoning, creative flow, and multimodal intelligence.

### Core Capabilities:
- **Streaming Intelligence**: Powered by Google's latest Gemini models with zero-latency streaming.
- **Bilingual English & Telugu Support**: Natural comprehension, translation, and cultural depth in both languages (ఇంగ్లీష్ మరియు తెలుగు).
- **15 Integrated AI Tools**: Specialized suites for Code Architecture, Telugu Translation, Writing, STEM, Data Analysis, and Strategy.
- **Speech & Voice Capabilities**: Real-time microphone dictation and free dual-voice audio playback.
- **Full Privacy & Controls**: Local data management, customizable memories, and custom response instructions.

Feel free to ask a question, choose a model above, or select one of the AI Tools from the sidebar!`,
        timestamp: Date.now() - 3600000 * 4 + 1000,
        model: 'gemini-3.1-flash-lite',
        feedback: 'like',
      },
    ],
  },
  {
    id: 'conv_telugu_demo',
    userId: 'user_karthik_01',
    title: 'తెలుగు అనువాదం & కవిత్వం (Telugu Demo)',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    modelUsed: 'gemini-3.8-flash',
    messages: [
      {
        id: 'msg_te_1',
        role: 'user',
        content: 'CHAT AI గురించి ఒక అందమైన తెలుగు కవిత రాయండి.',
        timestamp: Date.now() - 3600000 * 2,
      },
      {
        id: 'msg_te_2',
        role: 'assistant',
        content: `**CHAT AI పై ఒక చిన్న కవిత:**

విజ్ఞాన వీధుల్లో వెలుగుల CHAT AI,  
జ్ఞానపు లోకంలో సరికొత్త తోడుగా నిలిచేరా!  
మాటల మూటలను క్షణాల్లో విప్పేసి,  
ప్రశ్నల సందేహం మంచులా కరిగించేసి...  

కోడింగ్ అయినా... కవితలైనా...  
నీ ఆలోచనలకు రెక్కలు తొడిగే తోడు CHAT AI! ✨  
**Your AI. Your World.**`,
        timestamp: Date.now() - 3600000 * 2 + 1500,
        model: 'gemini-3.8-flash',
        feedback: 'like',
      },
    ],
  },
];

export function getStoredUser(): User {
  try {
    const raw = localStorage.getItem('chatai_user') || localStorage.getItem('nexora_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.plan === 'NEXORA Pro') parsed.plan = 'CHAT AI Pro';
      if (parsed.plan === 'NEXORA Free') parsed.plan = 'CHAT AI Free';
      return parsed;
    }
  } catch (e) {
    console.error('Error reading stored user', e);
  }
  return DEFAULT_USER;
}

export function saveStoredUser(user: User): void {
  try {
    localStorage.setItem('chatai_user', JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user', e);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('chatai_settings') || localStorage.getItem('nexora_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const mergedAppearance = { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance || {}) };

      // One-time migration for untouched legacy dark/purple defaults -> Blue & White theme
      const migrationKey = 'chatai_blue_white_migrated_v1';
      if (!localStorage.getItem(migrationKey)) {
        const isLegacyDefault =
          parsed?.appearance?.theme === 'dark' &&
          (!parsed?.appearance?.chatBgColor || parsed.appearance.chatBgColor === '#0B1020') &&
          (!parsed?.appearance?.textColor || parsed.appearance.textColor === '#FFFFFF');
        if (isLegacyDefault) {
          mergedAppearance.theme = 'light';
          mergedAppearance.accentColor = 'blue';
          mergedAppearance.chatBgColor = '#F8FAFC';
          mergedAppearance.userBubbleColor = 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)';
          mergedAppearance.textColor = '#0F172A';
        }
        localStorage.setItem(migrationKey, '1');
      }

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) },
        appearance: mergedAppearance,
        language: { ...DEFAULT_SETTINGS.language, ...(parsed.language || {}) },
        personalization: { ...DEFAULT_SETTINGS.personalization, ...(parsed.personalization || {}) },
        memory: { ...DEFAULT_SETTINGS.memory, ...(parsed.memory || {}) },
        voice: { ...DEFAULT_SETTINGS.voice, ...(parsed.voice || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
        security: { ...DEFAULT_SETTINGS.security, ...(parsed.security || {}) },
        dataControls: { ...DEFAULT_SETTINGS.dataControls, ...(parsed.dataControls || {}) },
      };
    }
  } catch (e) {
    console.error('Error reading stored settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem('chatai_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function getStoredConversations(userId: string): Conversation[] {
  try {
    const raw =
      localStorage.getItem(`chatai_conversations_${userId}`) ??
      localStorage.getItem(`nexora_conversations_${userId}`);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Deduplicate by id while preserving order
        const seen = new Set<string>();
        return parsed.filter((c) => {
          if (!c || !c.id || seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
      }
    }
  } catch (e) {
    console.error('Error reading conversations', e);
  }
  return INITIAL_CONVERSATIONS;
}

export function saveStoredConversations(userId: string, conversations: Conversation[]): void {
  const seen = new Set<string>();
  const deduped = conversations.filter((c) => {
    if (!c || !c.id || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  try {
    localStorage.setItem(`chatai_conversations_${userId}`, JSON.stringify(deduped));
  } catch (e) {
    console.error('Error saving conversations to localStorage, trimming attachments if needed', e);
    try {
      // Fallback: strip heavy base64 attachment payloads if quota exceeded
      const compact = deduped.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({
          ...m,
          attachments: m.attachments?.map((a) => ({ ...a, data: '' })),
        })),
      }));
      localStorage.setItem(`chatai_conversations_${userId}`, JSON.stringify(compact));
    } catch (innerErr) {
      console.error('Unable to persist conversations:', innerErr);
    }
  }
}

export function playNotificationSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Audio context may not be allowed before interaction
  }
}
