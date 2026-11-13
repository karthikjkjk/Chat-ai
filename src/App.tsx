/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Conversation, Message, User, AppSettings, Attachment, AITool } from './types.ts';
import { 
  getStoredUser, saveStoredUser, 
  getStoredSettings, saveStoredSettings, 
  getStoredConversations, saveStoredConversations,
  playNotificationSound 
} from './utils/storage.ts';
import { AVAILABLE_MODELS } from './data/models.ts';
import { AI_TOOLS } from './data/tools.ts';
import { speakText, stopSpeaking, unlockSpeechSynthesis } from './utils/voice.ts';

// Components
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { HomePage } from './components/HomePage.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ToolsModal } from './components/ToolsModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { VoiceChatModal } from './components/VoiceChatModal.tsx';
import { ImageGenerator } from './components/ImageGenerator.tsx';

export default function App() {
  // Navigation View: 'home' is the default landing page
  const [currentView, setCurrentView] = useState<'home' | 'chat' | 'images'>('home');

  // Global States
  const [user, setUser] = useState<User>(() => getStoredUser());
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
  const [conversations, setConversations] = useState<Conversation[]>(() => 
    getStoredConversations(user.id)
  );

  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const list = getStoredConversations(user.id);
    return list[0]?.id || `conv_${Date.now()}`;
  });

  const [currentModel, setCurrentModel] = useState<string>(
    settings.general.defaultModel || 'gemini-3.1-flash-lite'
  );

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'te'>(
    settings.language.interfaceLanguage || 'en'
  );

  // Modals & Drawers
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'help'>('general');
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [voiceChatModalOpen, setVoiceChatModalOpen] = useState(false);

  // Track previous view so closing Settings returns cleanly (falls back to 'home')
  const previousViewRef = useRef<'home' | 'chat' | 'images'>('home');
  const conversationsRef = useRef<Conversation[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Active Tool Context (system prompt override for current chat)
  const [activeToolPrompt, setActiveToolPrompt] = useState<string | null>(null);

  // Streaming State & Abort Controller
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resolve active theme ('dark' | 'light') including 'system'
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    settings.appearance.theme === 'system'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : settings.appearance.theme;

  const themeStyle = useMemo(() => {
    const isLight = resolvedTheme === 'light';
    const chatBg = settings.appearance.chatBgColor || (isLight ? '#F8FAFC' : '#0B1020');
    const userBubble =
      settings.appearance.userBubbleColor ||
      'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)';
    const textColor = settings.appearance.textColor || (isLight ? '#0F172A' : '#F8FAFC');

    return {
      '--chat-bg': chatBg,
      '--chat-panel': isLight ? '#FFFFFF' : '#111827',
      '--chat-sidebar': isLight ? '#FFFFFF' : '#0F172A',
      '--chat-surface-soft': isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.16)',
      '--chat-surface-subtle': isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)',
      '--chat-input-bg': isLight ? '#FFFFFF' : '#111827',
      '--chat-ai-bg': isLight ? '#FFFFFF' : '#111827',
      '--chat-user-bubble': userBubble,
      '--chat-text': textColor,
      '--chat-text-secondary': isLight ? '#64748B' : '#94A3B8',
      '--chat-border': isLight ? '#E2E8F0' : 'rgba(226, 232, 240, 0.12)',
      '--chat-border-blue': isLight ? '#BFDBFE' : 'rgba(56, 189, 248, 0.28)',
      '--chat-accent': isLight ? '#2563EB' : '#38BDF8',
      '--chat-accent-dark': '#1E40AF',
      '--chat-accent-light': isLight ? '#DBEAFE' : 'rgba(37, 99, 235, 0.2)',
      '--chat-accent-sky': '#38BDF8',
      backgroundColor: chatBg,
      color: textColor,
    } as React.CSSProperties;
  }, [resolvedTheme, settings.appearance]);

  // Sync theme to document root & body so modals/scrollbars match
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.body.style.backgroundColor =
      settings.appearance.chatBgColor || (resolvedTheme === 'light' ? '#F8FAFC' : '#0B1020');
    document.body.style.color =
      settings.appearance.textColor || (resolvedTheme === 'light' ? '#0F172A' : '#F8FAFC');
  }, [resolvedTheme, settings.appearance.chatBgColor, settings.appearance.textColor]);

  // Sync state to storage
  useEffect(() => {
    saveStoredUser(user);
  }, [user]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredConversations(user.id, conversations);
  }, [conversations, user.id]);

  // Handle URL hash changes for browser back/forward and refresh
  useEffect(() => {
    const syncFromHash = (isInitialMount = false) => {
      const hash = window.location.hash;
      if (hash.startsWith('#chat/')) {
        const id = hash.replace('#chat/', '');
        const exists = conversationsRef.current.some((c) => c.id === id);
        if (exists) {
          setActiveConversationId(id);
          setCurrentView('chat');
          setSettingsModalOpen(false);
        } else {
          setCurrentView('home');
          setSettingsModalOpen(false);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else if (hash === '#images') {
        setSettingsModalOpen(false);
        setCurrentView('images');
      } else if (hash === '#settings') {
        if (isInitialMount) {
          // On browser refresh, never trap the user on Settings; return cleanly to Home
          setSettingsModalOpen(false);
          setCurrentView('home');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          setSettingsModalOpen(true);
        }
      } else {
        setSettingsModalOpen(false);
        setCurrentView('home');
      }
    };

    syncFromHash(true);

    const handleHashChange = () => syncFromHash(false);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut for New Chat (⌘N / Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user.id]);

  // Current active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || {
    id: activeConversationId,
    userId: user.id,
    title: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modelUsed: currentModel,
    messages: [],
  };

  // Open Settings Modal and remember current page
  const handleOpenSettings = (tab: 'general' | 'help' = 'general') => {
    previousViewRef.current = currentView;
    setSettingsInitialTab(tab);
    setSettingsModalOpen(true);
  };

  // Close Settings Modal and restore previous page (or Home if none/invalid)
  const handleCloseSettings = () => {
    stopSpeaking();
    setSettingsModalOpen(false);
    if (window.location.hash === '#settings') {
      const targetHash =
        previousViewRef.current === 'chat' && activeConversationId
          ? `#chat/${activeConversationId}`
          : previousViewRef.current === 'images'
          ? '#images'
          : '';
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + targetHash
      );
    }
    if (previousViewRef.current === 'images') {
      setCurrentView('images');
    } else if (
      previousViewRef.current === 'chat' &&
      conversationsRef.current.some((c) => c.id === activeConversationId)
    ) {
      setCurrentView('chat');
    } else {
      setCurrentView('home');
    }
  };

  // Navigate to Home Page
  const handleNavigateHome = () => {
    stopSpeaking();
    setSettingsModalOpen(false);
    setToolsModalOpen(false);
    setProfileModalOpen(false);
    setShareModalOpen(false);
    setAuthModalOpen(false);
    setVoiceChatModalOpen(false);
    setSidebarOpen(false);
    setCurrentView('home');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Navigate to AI Image Generator
  const handleOpenImageGenerator = () => {
    stopSpeaking();
    setSettingsModalOpen(false);
    setToolsModalOpen(false);
    setProfileModalOpen(false);
    setShareModalOpen(false);
    setAuthModalOpen(false);
    setVoiceChatModalOpen(false);
    setSidebarOpen(false);
    setCurrentView('images');
    window.location.hash = '#images';
  };

  // Open specific conversation
  const handleOpenConversation = (id: string) => {
    stopSpeaking();
    setSettingsModalOpen(false);
    setActiveConversationId(id);
    setCurrentView('chat');
    window.location.hash = `#chat/${id}`;
  };

  // Create New Chat
  const handleNewChat = () => {
    stopSpeaking();
    // Avoid duplicating an empty chat when already viewing an empty chat
    const existingActive = conversationsRef.current.find((c) => c.id === activeConversationId);
    if (currentView === 'chat' && existingActive && existingActive.messages.length === 0) {
      setActiveToolPrompt(null);
      return;
    }

    const newConvId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      userId: user.id,
      title: currentLanguage === 'te' ? 'కొత్త సంభాషణ' : 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelUsed: currentModel,
      messages: [],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConvId);
    setActiveToolPrompt(null);
    setCurrentView('chat');
    window.location.hash = `#chat/${newConvId}`;
  };

  // Rename Chat
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Pin Chat
  const handlePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  // Archive Chat
  const handleArchiveConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isArchived: !c.isArchived } : c))
    );
  };

  // Delete Single Chat (persists cleanly without resurrecting deleted/default chats)
  const handleDeleteConversation = (id: string) => {
    stopSpeaking();
    const filtered = conversationsRef.current.filter((c) => c.id !== id);
    setConversations(filtered);

    if (id === activeConversationId) {
      if (filtered.length > 0) {
        const nextId = filtered[0].id;
        setActiveConversationId(nextId);
        if (currentView === 'chat') {
          window.location.hash = `#chat/${nextId}`;
        }
      } else {
        setActiveConversationId('');
        setCurrentView('home');
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    }
  };

  // Delete All Chats for Current User (preserves user account, auth, and settings)
  const handleDeleteAllConversations = () => {
    stopSpeaking();
    setConversations([]);
    setActiveConversationId('');
    setActiveToolPrompt(null);
    setCurrentView('home');
    setSettingsModalOpen(false);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Build dynamic system instruction with user instructions and memories
  const buildSystemInstruction = (): string => {
    const parts: string[] = [];

    // Base instruction: natural, direct, adaptive depth + official creator identity
    parts.push(
      `You are CHAT AI, created, founded, and owned by KARTHIK JANNE. Whenever asked who created you, who is your owner, who is your founder, who developed you, or who made you, always reply: "I was created by KARTHIK JANNE, the founder and owner of CHAT AI." Whenever asked in Telugu ("నిన్ను ఎవరు తయారు చేశారు?", "నీ ఓనర్ ఎవరు?"), always reply: "నన్ను KARTHIK JANNE రూపొందించారు. ఆయనే CHAT AI వ్యవస్థాపకుడు మరియు యజమాని." Reply naturally and directly without repeating the user's question. Give short, friendly replies to greetings and brief answers to simple questions without unnecessary explanation or taglines. When the user says "Explain fully", provide a detailed explanation; when they say "Step by step", give clear numbered steps. Answer fluently in Telugu (తెలుగు) when asked in Telugu, and in English when asked in English.`
    );

    // Language mode
    if (currentLanguage === 'te' || settings.language.interfaceLanguage === 'te') {
      parts.push(
        `Language Directive: The user prefers Telugu (తెలుగు). Respond naturally in Telugu script.`
      );
    }
    if (settings.language.bilingualResponses) {
      parts.push(
        `Bilingual Directive: For technical or educational explanations, provide key explanations in both Telugu and English.`
      );
    }

    // Active tool system prompt
    if (activeToolPrompt) {
      parts.push(`Active Specialized Tool Directive:\n${activeToolPrompt}`);
    }

    // User personalization
    if (settings.personalization.aboutUser.trim()) {
      parts.push(`User Background & Context:\n${settings.personalization.aboutUser.trim()}`);
    }
    if (settings.personalization.responseStyle.trim()) {
      parts.push(`User Style Preference (always defer to explicit user length/format requests like "short", "Explain fully", or "Step by step"):\n${settings.personalization.responseStyle.trim()}`);
    }
    if (settings.personalization.preferredTone) {
      parts.push(`Tone: ${settings.personalization.preferredTone}`);
    }

    // Memory items
    if (settings.memory.enabled && settings.memory.memories.length > 0) {
      const memList = settings.memory.memories.map((m) => `- ${m.content}`).join('\n');
      parts.push(`Persistent Memories About User:\n${memList}`);
    }

    return parts.join('\n\n');
  };

  // Send message and trigger streaming
  const handleSendMessage = async (
    content: string,
    attachments?: Attachment[],
    targetConvId?: string,
    options?: { webSearch?: boolean }
  ) => {
    if (isStreaming) return;
    stopSpeaking();
    if (settings.voice.autoReadAloud) {
      unlockSpeechSynthesis();
    }

    const webSearch = Boolean(options?.webSearch);
    const convId = targetConvId || activeConversationId || `conv_${Date.now()}`;
    let targetConversation = conversationsRef.current.find((c) => c.id === convId);
    const titleBase = content.trim() || attachments?.[0]?.name || 'New conversation';
    const previewTitle = titleBase.slice(0, 32).trim() + (titleBase.length > 32 ? '...' : '');

    // If conversation does not exist, create it
    if (!targetConversation) {
      targetConversation = {
        id: convId,
        userId: user.id,
        title: previewTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelUsed: currentModel,
        messages: [],
      };
      setConversations((prev) => [targetConversation!, ...prev]);
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
      webSearchUsed: webSearch,
    };

    const assistantPlaceholderId = `msg_${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: currentModel,
      webSearchUsed: webSearch,
    };

    // Auto title if first user message
    const isFirstMessage = targetConversation.messages.length === 0;
    const generatedTitle = isFirstMessage ? previewTitle : targetConversation.title;

    const updatedMessages = [...targetConversation.messages, userMessage, assistantMessage];

    // Transition to chat view
    setCurrentView('chat');
    setActiveConversationId(convId);
    window.location.hash = `#chat/${convId}`;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: generatedTitle,
              updatedAt: Date.now(),
              modelUsed: currentModel,
              messages: updatedMessages,
            }
          : c
      )
    );

    // Update user stats
    setUser((prev) => ({
      ...prev,
      totalMessages: prev.totalMessages + 1,
      totalConversations: isFirstMessage ? prev.totalConversations + 1 : prev.totalConversations,
    }));

    // Start SSE stream
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';
    try {
      const messagesForAPI = [...targetConversation.messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForAPI,
          model: currentModel,
          systemInstruction: buildSystemInstruction(),
          webSearch,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status} Error`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith(':') || !line.trim()) continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                accumulatedText += data.text;
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantPlaceholderId
                              ? { ...m, content: accumulatedText, isError: false }
                              : m
                          ),
                        }
                      : c
                  )
                );
              }
              if (Array.isArray(data.webSources) && data.webSources.length > 0) {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantPlaceholderId
                              ? { ...m, webSources: data.webSources }
                              : m
                          ),
                        }
                      : c
                  )
                );
              }
            } catch (e: any) {
              if (e?.message && e.message !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }
      }

      // If stream ended without text and wasn't aborted, trigger fallback
      if (!accumulatedText.trim()) {
        throw new Error('Stream completed without content, falling back to direct generation');
      }

      setIsStreaming(false);

      if (settings.general.soundEffects) {
        playNotificationSound();
      }

      if (settings.voice.autoReadAloud && accumulatedText) {
        speakText(accumulatedText, {
          messageId: assistantPlaceholderId,
          voiceURI: settings.voice.selectedVoiceURI,
          rate: settings.voice.speechRate,
          pitch: settings.voice.speechPitch,
          volume: settings.voice.volume,
          gender: settings.voice.voiceGender,
          language: settings.voice.voiceLanguage,
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsStreaming(false);
        // If stopped before any token arrived, clean up blank assistant bubble
        if (!accumulatedText.trim()) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.filter((m) => m.id !== assistantPlaceholderId),
                  }
                : c
            )
          );
        }
        return;
      }

      let providerError = err?.message || 'Unable to connect to the AI model.';

      // Fallback to /api/chat/generate
      try {
        const messagesForAPI = [...targetConversation.messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

        const fallbackResponse = await fetch('/api/chat/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesForAPI,
            model: currentModel,
            systemInstruction: buildSystemInstruction(),
            webSearch,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackText = fallbackData.text || '';
          const fallbackSources = Array.isArray(fallbackData.webSources)
            ? fallbackData.webSources
            : undefined;

          if (fallbackText.trim()) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantPlaceholderId
                          ? {
                              ...m,
                              content: fallbackText,
                              webSources: fallbackSources,
                              isError: false,
                            }
                          : m
                      ),
                    }
                  : c
              )
            );

            setIsStreaming(false);

            if (settings.general.soundEffects) {
              playNotificationSound();
            }

            if (settings.voice.autoReadAloud) {
              speakText(fallbackText, {
                messageId: assistantPlaceholderId,
                voiceURI: settings.voice.selectedVoiceURI,
                rate: settings.voice.speechRate,
                pitch: settings.voice.speechPitch,
                volume: settings.voice.volume,
                gender: settings.voice.voiceGender,
                language: settings.voice.voiceLanguage,
              });
            }
            return;
          }
        } else {
          const errJson = await fallbackResponse.json().catch(() => ({}));
          if (errJson?.error) {
            providerError = errJson.error;
          }
        }
      } catch (fallbackErr: any) {
        if (fallbackErr?.message) {
          providerError = fallbackErr.message;
        }
      }

      setIsStreaming(false);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        isError: true,
                        errorMessage: providerError,
                      }
                    : m
                ),
              }
            : c
        )
      );
    }
  };

  // Start chat from Homepage
  const handleStartChatFromHome = (
    promptText: string,
    attachments?: Attachment[],
    options?: { webSearch?: boolean }
  ) => {
    const newConvId = `conv_${Date.now()}`;
    handleSendMessage(promptText, attachments, newConvId, options);
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopSpeaking();
    setIsStreaming(false);
  };

  // Regenerate message
  const handleRegenerateMessage = (assistantIndex: number) => {
    if (isStreaming) return;
    const historyBefore = activeConversation.messages.slice(0, assistantIndex);
    const lastUserMsg = [...historyBefore].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: historyBefore,
            }
          : c
      )
    );

    handleSendMessage(lastUserMsg.content, lastUserMsg.attachments);
  };

  // Edit user message and re-run
  const handleEditMessage = (userIndex: number, newContent: string) => {
    if (isStreaming) return;
    const historyBefore = activeConversation.messages.slice(0, userIndex);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: historyBefore,
            }
          : c
      )
    );
    handleSendMessage(newContent);
  };

  // Delete message from thread
  const handleDeleteMessage = (messageIndex: number) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: c.messages.filter((_, idx) => idx !== messageIndex),
            }
          : c
      )
    );
  };

  // Like / Dislike Feedback
  const handleFeedbackMessage = (messageIndex: number, type: 'like' | 'dislike') => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: c.messages.map((m, idx) =>
                idx === messageIndex ? { ...m, feedback: m.feedback === type ? null : type } : m
              ),
            }
          : c
      )
    );
  };

  // Retry failed message
  const handleRetryMessage = (messageIndex: number) => {
    handleRegenerateMessage(messageIndex);
  };

  // Select AI Tool
  const handleSelectTool = (tool: AITool) => {
    const newConvId = `conv_${Date.now()}`;
    setActiveToolPrompt(tool.systemPrompt);
    handleSendMessage(tool.promptTemplate, undefined, newConvId);
  };

  // Export full JSON data
  const handleExportAllData = () => {
    const fullBackup = {
      user,
      settings,
      conversations,
      exportedAt: new Date().toISOString(),
      app: 'CHAT AI',
      version: '2.5.0',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chat_ai_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Clear all chats (alias to handleDeleteAllConversations)
  const handleClearAllHistory = () => {
    handleDeleteAllConversations();
  };

  // Language quick toggle (EN <-> TE)
  const handleToggleLanguage = () => {
    const nextLang = currentLanguage === 'en' ? 'te' : 'en';
    setCurrentLanguage(nextLang);
    setSettings((prev) => ({
      ...prev,
      language: {
        ...prev.language,
        interfaceLanguage: nextLang,
      },
    }));
  };

  // Auto Voice quick toggle (ON <-> OFF)
  const handleToggleAutoVoice = () => {
    const nextEnabled = !settings.voice.autoReadAloud;
    if (nextEnabled) {
      unlockSpeechSynthesis();
    } else {
      stopSpeaking();
    }
    setSettings((prev) => ({
      ...prev,
      voice: {
        ...prev.voice,
        autoReadAloud: nextEnabled,
      },
    }));
  };

  return (
    <div
      data-testid="chatai-root"
      data-theme={resolvedTheme}
      style={themeStyle}
      className="chatai-root min-h-[100dvh] flex flex-col antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200"
    >
      {/* Top Header */}
      <Header
        currentModel={currentModel}
        onSelectModel={setCurrentModel}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        onNavigateHome={handleNavigateHome}
        isHomeActive={currentView === 'home'}
        onOpenShare={() => setShareModalOpen(true)}
        onOpenTools={() => setToolsModalOpen(true)}
        onOpenImageGenerator={handleOpenImageGenerator}
        isImageGenActive={currentView === 'images'}
        onOpenVoiceMode={() => setVoiceChatModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        currentLanguage={currentLanguage}
        onToggleLanguage={handleToggleLanguage}
        autoVoiceEnabled={settings.voice.autoReadAloud}
        onToggleAutoVoice={handleToggleAutoVoice}
        user={user}
      />

      {/* Main Workspace: Sidebar + (HomePage / ImageGenerator / ChatArea) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          isHomeActive={currentView === 'home'}
          onNavigateHome={handleNavigateHome}
          onSelectConversation={(id) => {
            handleOpenConversation(id);
            setSidebarOpen(false);
          }}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onPinConversation={handlePinConversation}
          onArchiveConversation={handleArchiveConversation}
          onDeleteConversation={handleDeleteConversation}
          onDeleteAllConversations={handleDeleteAllConversations}
          onOpenSettings={() => handleOpenSettings('general')}
          onOpenHelp={() => handleOpenSettings('help')}
          onOpenTools={() => setToolsModalOpen(true)}
          onOpenImageGenerator={handleOpenImageGenerator}
          isImageGenActive={currentView === 'images'}
          onSelectTool={(toolId) => {
            const tool = AI_TOOLS.find((t) => t.id === toolId);
            if (tool) handleSelectTool(tool);
          }}
          onOpenProfile={() => setProfileModalOpen(true)}
          user={user}
        />

        {/* View Switcher: HomePage, ImageGenerator, or ChatArea */}
        {currentView === 'home' ? (
          <HomePage
            user={user}
            settings={settings}
            conversations={conversations}
            activeModel={AVAILABLE_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MODELS[0]}
            onSwitchToVisionModel={() => setCurrentModel('gemini-3.8-flash')}
            onStartChat={handleStartChatFromHome}
            onOpenConversation={handleOpenConversation}
            onOpenTools={() => setToolsModalOpen(true)}
            onSelectTool={handleSelectTool}
            onOpenImageGenerator={handleOpenImageGenerator}
            onOpenVoiceMode={() => setVoiceChatModalOpen(true)}
            currentLanguage={currentLanguage}
          />
        ) : currentView === 'images' ? (
          <ImageGenerator
            settings={settings}
            currentLanguage={currentLanguage}
            onBackHome={handleNavigateHome}
          />
        ) : (
          <ChatArea
            conversation={activeConversation}
            user={user}
            settings={settings}
            activeModel={AVAILABLE_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MODELS[0]}
            onSwitchToVisionModel={() => setCurrentModel('gemini-3.8-flash')}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onRegenerateMessage={handleRegenerateMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onFeedbackMessage={handleFeedbackMessage}
            onRetryMessage={handleRetryMessage}
            onOpenImageGenerator={handleOpenImageGenerator}
            onOpenVoiceMode={() => setVoiceChatModalOpen(true)}
            currentLanguage={currentLanguage}
          />
        )}
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={handleCloseSettings}
        initialTab={settingsInitialTab}
        settings={settings}
        onSaveSettings={setSettings}
        user={user}
        onClearAllHistory={handleClearAllHistory}
        onExportAllData={handleExportAllData}
      />

      <ToolsModal
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        onSelectTool={handleSelectTool}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onUpdateUser={setUser}
        onLogout={() => setAuthModalOpen(true)}
        onDeleteAccount={handleClearAllHistory}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        conversation={activeConversation}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(authUser) => {
          setUser(authUser);
          const userChats = getStoredConversations(authUser.id);
          setConversations(userChats);
          setActiveConversationId(userChats[0]?.id || '');
          if (!userChats[0] && currentView === 'chat') {
            setCurrentView('home');
          }
        }}
      />

      {/* Dedicated Voice Chat Mode Modal */}
      <VoiceChatModal
        isOpen={voiceChatModalOpen}
        onClose={() => setVoiceChatModalOpen(false)}
        onSendMessage={async (spokenPrompt) => {
          await handleSendMessage(spokenPrompt);
        }}
        lastAssistantMessage={
          activeConversation.messages
            .filter((m) => m.role === 'assistant')
            .slice(-1)[0]?.content
        }
        isAIStreaming={isStreaming}
        settings={settings}
        onUpdateSettings={setSettings}
        user={user}
      />
    </div>
  );
}
