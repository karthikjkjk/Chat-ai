export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'CHAT AI Free' | 'CHAT AI Pro' | 'NEXORA Free' | 'NEXORA Pro';
  joinedDate: string;
  totalMessages: number;
  totalConversations: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  mimeType: string;
  data: string; // Base64 data URL (used for image previews and multimodal upload)
  kind?: 'image' | 'pdf' | 'docx' | 'doc' | 'text';
  extractedText?: string;
  pageCount?: number;
  truncated?: boolean;
  sourceCategory?: 'photos' | 'camera' | 'documents' | 'files';
}

export interface WebSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  attachments?: Attachment[];
  webSearchUsed?: boolean;
  webSources?: WebSource[];
  feedback?: 'like' | 'dislike' | null;
  isError?: boolean;
  errorMessage?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  isArchived?: boolean;
  isPinned?: boolean;
  modelUsed?: string;
  tags?: string[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  family: string;
  description: string;
  isFreeTier: boolean;
  speed: string;
  contextWindow: string;
  capabilities: string[];
  recommended: boolean;
  requiresPaidKey: boolean;
  supportsImageInput: boolean;
  supportsWebSearch: boolean;
}

export interface AITool {
  id: string;
  name: string;
  teluguName: string;
  category: 'code' | 'writing' | 'translation' | 'data' | 'productivity' | 'learning';
  description: string;
  iconName: string;
  promptTemplate: string;
  systemPrompt: string;
  badge?: string;
}

export interface SavedMemory {
  id: string;
  content: string;
  createdAt: number;
}

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface AppSettings {
  general: {
    defaultModel: string;
    enterSendsMessage: boolean;
    soundEffects: boolean;
    autoScroll: boolean;
    codeTheme: 'dark' | 'monokai' | 'dracula';
  };
  appearance: {
    theme: 'dark' | 'light' | 'system';
    accentColor: 'purple' | 'cyan' | 'blue' | 'emerald';
    fontSize: 'compact' | 'normal' | 'spacious';
    chatBgColor: string;
    userBubbleColor: string;
    textColor: string;
  };
  language: {
    interfaceLanguage: 'en' | 'te';
    speechLanguage: 'en-US' | 'te-IN';
    autoDetectTelugu: boolean;
    bilingualResponses: boolean;
  };
  personalization: {
    userProfession: string;
    aboutUser: string;
    responseStyle: string;
    preferredTone: 'balanced' | 'concise' | 'detailed' | 'creative';
  };
  memory: {
    enabled: boolean;
    memories: SavedMemory[];
  };
  voice: {
    speechRate: number;
    speechPitch: number;
    volume: number;
    selectedVoiceURI: string;
    voiceGender: 'male' | 'female' | 'auto';
    voiceLanguage: 'te-IN' | 'en-IN' | 'en-US';
    autoReadAloud: boolean;
  };
  notifications: {
    soundAlerts: boolean;
    desktopNotifications: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessions: UserSession[];
  };
  dataControls: {
    historyEnabled: boolean;
    autoDeleteDays: number;
  };
}
