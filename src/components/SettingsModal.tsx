import React, { useState, useEffect, useRef } from 'react';
import {
  X, Settings, Palette, Globe, User, Brain, Database, Volume2,
  Bell, Shield, KeyRound, Cpu, HelpCircle, Info, Trash2, Plus,
  Check, Download, Sun, Moon, Monitor, Laptop, Smartphone,
  Save, RefreshCw, Play, Square, Radio, ChevronLeft
} from 'lucide-react';
import { AppSettings, User as UserType, SavedMemory } from '../types.ts';
import { AVAILABLE_MODELS } from '../data/models.ts';
import {
  getDetailedVoices, auditDeviceVoices, speakText, stopSpeaking,
  DetectedVoice
} from '../utils/voice.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  user: UserType;
  onClearAllHistory: () => void;
  onExportAllData: () => void;
  initialTab?: TabKey;
}

type TabKey =
  | 'general'
  | 'appearance'
  | 'language'
  | 'personalization'
  | 'memory'
  | 'data'
  | 'history'
  | 'voice'
  | 'notifications'
  | 'security'
  | 'account'
  | 'api'
  | 'help'
  | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  onClearAllHistory,
  onExportAllData,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [detectedVoices, setDetectedVoices] = useState<DetectedVoice[]>(() => getDetailedVoices());
  const [voiceAudit, setVoiceAudit] = useState(() => auditDeviceVoices());
  const [mobileShowingContent, setMobileShowingContent] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearMemories, setConfirmClearMemories] = useState(false);
  const [themeSavedMsg, setThemeSavedMsg] = useState(false);

  const wasOpenRef = useRef(false);

  const handleClose = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopSpeaking();
    setIsTestingVoice(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setLocalSettings(settings);
      setActiveTab(initialTab);
      setMobileShowingContent(initialTab !== 'general');
    } else if (!isOpen && wasOpenRef.current) {
      stopSpeaking();
      setIsTestingVoice(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialTab, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopSpeaking();
        setIsTestingVoice(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const voices = getDetailedVoices();
    setDetectedVoices(voices);
    setVoiceAudit(auditDeviceVoices());

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const handleVoicesChanged = () => {
        const v = getDetailedVoices();
        setDetectedVoices(v);
        setVoiceAudit(auditDeviceVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, [isOpen]);

  const handleTestVoice = () => {
    if (isTestingVoice) {
      stopSpeaking();
      setIsTestingVoice(false);
      return;
    }

    setIsTestingVoice(true);
    let sampleText = 'Hello! This is a test of the CHAT AI free dual-voice system. Your AI. Your World.';
    if (localSettings.voice.voiceLanguage === 'te-IN') {
      sampleText = 'నమస్కారం! ఇది CHAT AI ఉచిత వాయిస్ పరీక్ష. మీ AI. మీ ప్రపంచం.';
    } else if (localSettings.voice.voiceLanguage === 'en-IN') {
      sampleText = 'Namaste! This is a test of the CHAT AI Indian English voice system.';
    }

    speakText(sampleText, {
      rate: localSettings.voice.speechRate,
      pitch: localSettings.voice.speechPitch,
      volume: localSettings.voice.volume,
      gender: localSettings.voice.voiceGender,
      language: localSettings.voice.voiceLanguage,
      voiceURI: localSettings.voice.selectedVoiceURI,
      onEnd: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    });
  };

  const handleUpdate = <K extends keyof AppSettings>(section: K, updates: Partial<AppSettings[K]>) => {
    const updated = {
      ...localSettings,
      [section]: {
        ...localSettings[section],
        ...updates,
      },
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const addMemory = () => {
    if (!newMemoryText.trim()) return;
    const newMem: SavedMemory = {
      id: `mem_${Date.now()}`,
      content: newMemoryText.trim(),
      createdAt: Date.now(),
    };
    const updatedMemories = [...localSettings.memory.memories, newMem];
    handleUpdate('memory', { memories: updatedMemories });
    setNewMemoryText('');
  };

  const deleteMemory = (id: string) => {
    const updatedMemories = localSettings.memory.memories.filter((m) => m.id !== id);
    handleUpdate('memory', { memories: updatedMemories });
  };

  const clearAllMemories = () => {
    handleUpdate('memory', { memories: [] });
    setConfirmClearMemories(false);
  };

  const tabList = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'language', label: 'Language Selection', icon: Globe },
    { key: 'personalization', label: 'Personalization', icon: User },
    { key: 'memory', label: 'Memory Settings', icon: Brain },
    { key: 'data', label: 'Data Controls', icon: Database },
    { key: 'history', label: 'Chat History', icon: RefreshCw },
    { key: 'voice', label: 'Voice Settings', icon: Volume2 },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'account', label: 'Account & Login', icon: KeyRound },
    { key: 'api', label: 'API & Models', icon: Cpu },
    { key: 'help', label: 'Help & Support', icon: HelpCircle },
    { key: 'about', label: 'About CHAT AI', icon: Info },
  ];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      data-testid="settings-modal"
      onClick={handleClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md animate-in fade-in"
    >
      <div
        data-testid="settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[92vh] sm:h-[85vh] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Tab Navigation */}
        <div
          className={`w-full md:w-64 bg-[#F8FAFC] dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-white/[0.08] flex flex-col shrink-0 ${
            mobileShowingContent ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
          }`}
        >
          <div className="p-4 border-b border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#0F172A]">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Settings</h3>
            </div>
            <div className="flex items-center gap-2">
              {savedToast && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
              <button
                type="button"
                aria-label="Close Settings"
                data-testid="settings-mobile-close-btn"
                onClick={handleClose}
                className="md:hidden relative z-20 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#64748B] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/10 cursor-pointer touch-manipulation transition"
                title="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {tabList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key as TabKey);
                    setMobileShowingContent(true);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#DBEAFE] dark:bg-blue-600/20 text-[#1E40AF] dark:text-sky-200 font-semibold border border-[#93C5FD] dark:border-blue-500/30'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 hover:bg-[#EFF6FF] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2563EB] dark:text-sky-400' : 'text-[#64748B] dark:text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-[#94A3B8] rotate-180 md:hidden" />
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-[#E2E8F0] dark:border-white/[0.08] text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between bg-white dark:bg-[#0F172A]">
            <span>CHAT AI v2.6.0</span>
            <span className="text-[10px] text-[#2563EB] dark:text-sky-400 font-semibold">By KARTHIK JANNE</span>
          </div>
        </div>

        {/* Right Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-[#111827] ${
            !mobileShowingContent ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-[#F8FAFC] dark:bg-[#0F172A]/60 relative z-10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileShowingContent(false)}
                className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#1E40AF] dark:text-sky-300 bg-[#DBEAFE] dark:bg-blue-500/15 hover:bg-[#BFDBFE] border border-[#93C5FD] dark:border-blue-500/30 text-xs font-semibold touch-manipulation cursor-pointer"
                title="Back to Settings Menu"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>
              <h4 className="font-bold text-sm text-[#0F172A] dark:text-slate-100 capitalize">
                {tabList.find((t) => t.key === activeTab)?.label}
              </h4>
            </div>

            <button
              type="button"
              aria-label="Close Settings"
              data-testid="settings-close-btn"
              onClick={handleClose}
              title="Close Settings & Return to App"
              className="relative z-20 min-w-[38px] min-h-[38px] px-2.5 py-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/10 transition flex items-center justify-center gap-1.5 text-xs cursor-pointer touch-manipulation"
            >
              <span className="hidden sm:inline font-medium">Close</span>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm text-[#64748B] dark:text-slate-300">
            {/* 1. GENERAL SETTINGS */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    Default AI Model
                  </label>
                  <select
                    value={localSettings.general.defaultModel}
                    onChange={(e) => handleUpdate('general', { defaultModel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.isFreeTier ? 'Free Tier' : 'Pro Reasoning'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between py-2.5 border-b border-[#E2E8F0] dark:border-white/[0.06]">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Send message on Enter</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Press Shift+Enter for new line when enabled</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.general.enterSendsMessage}
                    onChange={(e) => handleUpdate('general', { enterSendsMessage: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5 border-b border-[#E2E8F0] dark:border-white/[0.06]">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Audio chime &amp; sound effects</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Play pleasant sound cue when responses complete</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.general.soundEffects}
                    onChange={(e) => handleUpdate('general', { soundEffects: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Smooth Auto-Scroll</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Automatically follow text streaming into view</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.general.autoScroll}
                    onChange={(e) => handleUpdate('general', { autoScroll: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 2. APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Interface Theme: Light / Dark / System */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
                    Interface Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Blue & White', icon: Sun },
                      { id: 'dark', label: 'Dark Mode', icon: Moon },
                      { id: 'system', label: 'System Default', icon: Monitor },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = localSettings.appearance.theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          data-testid={`theme-mode-${t.id}`}
                          onClick={() => {
                            const themeChoice = t.id as 'dark' | 'light' | 'system';
                            const updates: Partial<AppSettings['appearance']> = { theme: themeChoice };
                            if (themeChoice === 'light') {
                              updates.chatBgColor = '#F8FAFC';
                              updates.textColor = '#0F172A';
                            } else if (themeChoice === 'dark') {
                              updates.chatBgColor = '#0B1020';
                              updates.textColor = '#F8FAFC';
                            }
                            handleUpdate('appearance', updates);
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] dark:border-sky-400 text-[#1E40AF] dark:text-sky-200 font-semibold shadow-2xs'
                              : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A]'
                          }`}
                        >
                          <Icon className="w-5 h-5 text-[#2563EB] dark:text-sky-400" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chat Background Color */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200">
                      Chat Background Color
                    </label>
                    <span className="text-[11px] font-mono text-[#2563EB] dark:text-sky-300 font-semibold">
                      {localSettings.appearance.chatBgColor || '#F8FAFC'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: '#F8FAFC', label: 'Crisp Snow' },
                      { id: '#EFF6FF', label: 'Ice Blue' },
                      { id: '#FFFFFF', label: 'Pure White' },
                      { id: '#0B1020', label: 'Deep Navy' },
                      { id: '#0F172A', label: 'Midnight Slate' },
                    ].map((preset) => {
                      const active = localSettings.appearance.chatBgColor === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-testid={`bg-swatch-${preset.id.replace('#', '')}`}
                          onClick={() => handleUpdate('appearance', { chatBgColor: preset.id })}
                          className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 text-xs transition cursor-pointer ${
                            active
                              ? 'border-[#2563EB] bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-white font-semibold'
                              : 'border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/[0.02] text-[#0F172A] dark:text-slate-300 hover:border-[#93C5FD]'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 dark:border-white/25 shrink-0"
                            style={{ backgroundColor: preset.id }}
                          />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                    <label className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF] flex items-center gap-2 text-xs text-[#0F172A] dark:text-slate-200 cursor-pointer">
                      <input
                        type="color"
                        data-testid="custom-chat-bg-input"
                        value={localSettings.appearance.chatBgColor?.startsWith('#') ? localSettings.appearance.chatBgColor : '#F8FAFC'}
                        onChange={(e) => handleUpdate('appearance', { chatBgColor: e.target.value })}
                        className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </div>

                {/* User Message Bubble Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
                    User Message Bubble Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      {
                        id: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                        label: 'Royal Blue',
                        testId: 'bubble-swatch-royal-blue',
                      },
                      {
                        id: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 100%)',
                        label: 'Sky & Cobalt',
                        testId: 'bubble-swatch-cyan-blue',
                      },
                      {
                        id: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                        label: 'Blue & Indigo',
                        testId: 'bubble-swatch-blue-purple',
                      },
                      {
                        id: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                        label: 'Emerald Teal',
                        testId: 'bubble-swatch-emerald',
                      },
                      {
                        id: '#1E293B',
                        label: 'Deep Slate',
                        testId: 'bubble-swatch-slate',
                      },
                    ].map((bubble) => {
                      const active = localSettings.appearance.userBubbleColor === bubble.id;
                      return (
                        <button
                          key={bubble.testId}
                          type="button"
                          data-testid={bubble.testId}
                          onClick={() => handleUpdate('appearance', { userBubbleColor: bubble.id })}
                          className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 text-xs transition cursor-pointer ${
                            active
                              ? 'border-[#2563EB] bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-white font-semibold'
                              : 'border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/[0.02] text-[#0F172A] dark:text-slate-300 hover:border-[#93C5FD]'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                            style={{ background: bubble.id }}
                          />
                          <span>{bubble.label}</span>
                        </button>
                      );
                    })}
                    <label className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF] flex items-center gap-2 text-xs text-[#0F172A] dark:text-slate-200 cursor-pointer">
                      <input
                        type="color"
                        data-testid="custom-bubble-bg-input"
                        value={
                          localSettings.appearance.userBubbleColor?.startsWith('#')
                            ? localSettings.appearance.userBubbleColor
                            : '#2563EB'
                        }
                        onChange={(e) => handleUpdate('appearance', { userBubbleColor: e.target.value })}
                        className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200">
                      Main Text Color
                    </label>
                    <span className="text-[11px] font-mono text-[#2563EB] dark:text-sky-300 font-semibold">
                      {localSettings.appearance.textColor || '#0F172A'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: '#0F172A', label: 'Slate Ink' },
                      { id: '#1E293B', label: 'Charcoal' },
                      { id: '#1E40AF', label: 'Deep Blue' },
                      { id: '#FFFFFF', label: 'Pure White' },
                      { id: '#E2E8F0', label: 'Soft Silver' },
                    ].map((tc) => {
                      const active = localSettings.appearance.textColor === tc.id;
                      return (
                        <button
                          key={tc.id}
                          type="button"
                          data-testid={`text-swatch-${tc.id.replace('#', '')}`}
                          onClick={() => handleUpdate('appearance', { textColor: tc.id })}
                          className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 text-xs transition cursor-pointer ${
                            active
                              ? 'border-[#2563EB] bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-white font-semibold'
                              : 'border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/[0.02] text-[#0F172A] dark:text-slate-300 hover:border-[#93C5FD]'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 dark:border-white/25 shrink-0"
                            style={{ backgroundColor: tc.id }}
                          />
                          <span>{tc.label}</span>
                        </button>
                      );
                    })}
                    <label className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF] flex items-center gap-2 text-xs text-[#0F172A] dark:text-slate-200 cursor-pointer">
                      <input
                        type="color"
                        data-testid="custom-text-color-input"
                        value={localSettings.appearance.textColor?.startsWith('#') ? localSettings.appearance.textColor : '#0F172A'}
                        onChange={(e) => handleUpdate('appearance', { textColor: e.target.value })}
                        className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
                    Accent Color
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'blue', label: 'Primary Blue', color: 'bg-[#2563EB]' },
                      { id: 'cyan', label: 'Sky Blue', color: 'bg-[#38BDF8]' },
                      { id: 'emerald', label: 'Emerald Mint', color: 'bg-emerald-500' },
                      { id: 'purple', label: 'Royal Indigo', color: 'bg-indigo-600' },
                    ].map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleUpdate('appearance', { accentColor: acc.id as any })}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs cursor-pointer ${
                          localSettings.appearance.accentColor === acc.id
                            ? 'border-[#2563EB] bg-[#DBEAFE] dark:bg-blue-500/20 font-semibold text-[#1E40AF] dark:text-white'
                            : 'border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-transparent text-[#64748B] dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${acc.color}`} />
                        <span>{acc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
                    Font Size &amp; Density
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['compact', 'normal', 'spacious'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleUpdate('appearance', { fontSize: size })}
                        className={`p-2.5 rounded-xl border text-xs capitalize transition cursor-pointer ${
                          localSettings.appearance.fontSize === size
                            ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] dark:border-sky-400 text-[#1E40AF] dark:text-sky-200 font-semibold'
                            : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B] dark:text-slate-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save & Reset Theme Controls */}
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    data-testid="reset-theme-btn"
                    onClick={() => {
                      handleUpdate('appearance', {
                        theme: 'light',
                        accentColor: 'blue',
                        fontSize: 'normal',
                        chatBgColor: '#F8FAFC',
                        userBubbleColor: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                        textColor: '#0F172A',
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.04] hover:bg-[#EFF6FF] border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-300 text-xs font-medium cursor-pointer transition"
                  >
                    Reset Default Theme
                  </button>

                  <div className="flex items-center gap-2">
                    {themeSavedMsg && (
                      <span
                        data-testid="theme-saved-badge"
                        className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Theme Saved!
                      </span>
                    )}
                    <button
                      type="button"
                      data-testid="save-theme-btn"
                      onClick={() => {
                        onSaveSettings(localSettings);
                        setThemeSavedMsg(true);
                        showSavedNotification();
                        setTimeout(() => setThemeSavedMsg(false), 2500);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/25 cursor-pointer transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Theme</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. LANGUAGE SELECTION */}
            {activeTab === 'language' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    Primary Interface Language
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdate('language', { interfaceLanguage: 'en' })}
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                        localSettings.language.interfaceLanguage === 'en'
                          ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] text-[#1E40AF] dark:text-sky-200 font-bold'
                          : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B]'
                      }`}
                    >
                      <p className="font-semibold text-[#0F172A] dark:text-white">English (US)</p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400">Default global language</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('language', { interfaceLanguage: 'te' })}
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                        localSettings.language.interfaceLanguage === 'te'
                          ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] text-[#1E40AF] dark:text-sky-200 font-bold'
                          : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B]'
                      }`}
                    >
                      <p className="font-semibold text-[#0F172A] dark:text-white">తెలుగు (Telugu)</p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400">పూర్తి తెలుగు అనుభవం</p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 border-b border-[#E2E8F0] dark:border-white/[0.06]">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Auto-detect Telugu queries</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Respond in Telugu whenever prompt is typed in Telugu script</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.language.autoDetectTelugu}
                    onChange={(e) => handleUpdate('language', { autoDetectTelugu: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Bilingual English + Telugu Explanations</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Provide both Telugu summary and English technical terms</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.language.bilingualResponses}
                    onChange={(e) => handleUpdate('language', { bilingualResponses: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. PERSONALIZATION & CUSTOM INSTRUCTIONS */}
            {activeTab === 'personalization' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                    What would you like CHAT AI to know about you to provide better responses?
                  </label>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-2">
                    Share your profession, interests, background, tech stack, or location.
                  </p>
                  <textarea
                    rows={3}
                    value={localSettings.personalization.aboutUser}
                    onChange={(e) => handleUpdate('personalization', { aboutUser: e.target.value })}
                    placeholder="e.g., Senior Full-Stack Engineer working with React, TypeScript and Node. Fluent in English and Telugu."
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-xs text-[#0F172A] dark:text-slate-200 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                    How would you like CHAT AI to respond?
                  </label>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-2">
                    Set formatting preferences, code standards, level of detail, or tone.
                  </p>
                  <textarea
                    rows={3}
                    value={localSettings.personalization.responseStyle}
                    onChange={(e) => handleUpdate('personalization', { responseStyle: e.target.value })}
                    placeholder="e.g., Provide concise answers with production-ready code blocks and real-world edge cases."
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-xs text-[#0F172A] dark:text-slate-200 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    Preferred Response Tone
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['balanced', 'concise', 'detailed', 'creative'] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => handleUpdate('personalization', { preferredTone: tone })}
                        className={`p-2 rounded-xl border text-xs capitalize transition cursor-pointer ${
                          localSettings.personalization.preferredTone === tone
                            ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] text-[#1E40AF] dark:text-sky-200 font-semibold'
                            : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B]'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. MEMORY SETTINGS */}
            {activeTab === 'memory' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-white/[0.08]">
                  <div>
                    <h5 className="font-semibold text-xs text-[#0F172A] dark:text-slate-200">CHAT AI Adaptive Memory</h5>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Remember facts and user preferences across chats</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.memory.enabled}
                    onChange={(e) => handleUpdate('memory', { enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemoryText}
                    onChange={(e) => setNewMemoryText(e.target.value)}
                    placeholder="Add a new custom memory item..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-xs text-[#0F172A] dark:text-slate-200 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  />
                  <button
                    type="button"
                    onClick={addMemory}
                    className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
                    <span>Stored Memories ({localSettings.memory.memories.length})</span>
                    {localSettings.memory.memories.length > 0 && (
                      confirmClearMemories ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={clearAllMemories}
                            className="text-white bg-rose-600 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Confirm Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClearMemories(false)}
                            className="text-[#64748B] hover:text-[#0F172A] text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearMemories(true)}
                          className="text-rose-600 dark:text-rose-400 hover:underline text-[11px] cursor-pointer font-medium"
                        >
                          Clear All
                        </button>
                      )
                    )}
                  </div>

                  {localSettings.memory.memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] border border-[#E2E8F0] dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-[#0F172A] dark:text-slate-200">{mem.content}</span>
                      <button
                        type="button"
                        onClick={() => deleteMemory(mem.id)}
                        className="p-1 text-[#64748B] hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. DATA CONTROLS */}
            {activeTab === 'data' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-semibold text-xs text-[#0F172A] dark:text-slate-200">Export All Conversations &amp; Data</h5>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Download a full JSON archive of your chats and settings</p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportAllData}
                    className="px-3 py-1.5 rounded-xl bg-[#EFF6FF] dark:bg-white/5 hover:bg-[#DBEAFE] border border-[#BFDBFE] dark:border-white/10 text-[#1E40AF] dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                    Export
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="font-semibold text-xs text-rose-700 dark:text-rose-300">Clear All Chat History</h5>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Permanently delete all stored chats for this account</p>
                  </div>
                  {confirmClearHistory ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(false)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-[#F8FAFC] border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmClearHistory(false);
                          onClearAllHistory();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Confirm Delete All
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 7. CHAT HISTORY SETTINGS */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2.5 border-b border-[#E2E8F0] dark:border-white/[0.06]">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Save Conversation History</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Automatically save chats to sidebar and local database</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.dataControls.historyEnabled}
                    onChange={(e) => handleUpdate('dataControls', { historyEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    Auto-delete history retention
                  </label>
                  <select
                    value={localSettings.dataControls.autoDeleteDays}
                    onChange={(e) => handleUpdate('dataControls', { autoDeleteDays: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 text-xs focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value={0}>Never auto-delete (Keep forever)</option>
                    <option value={30}>Auto-delete after 30 days</option>
                    <option value={90}>Auto-delete after 90 days</option>
                  </select>
                </div>
              </div>
            )}

            {/* 8. CHAT AI VOICE SETTINGS */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                {/* Dual-Voice Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
                    Dual-Voice Gender Persona
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'male', label: 'Male Voice', sub: 'Deep resonant tone' },
                      { id: 'female', label: 'Female Voice', sub: 'Bright articulate tone' },
                      { id: 'auto', label: 'Auto (System)', sub: 'Default device voice' },
                    ].map((g) => {
                      const isSelected = localSettings.voice.voiceGender === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleUpdate('voice', { voiceGender: g.id as any })}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] text-[#1E40AF] dark:text-sky-200 font-bold shadow-2xs'
                              : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B] hover:border-[#93C5FD]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">{g.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />}
                          </div>
                          <p className="text-[10px] text-[#64748B] dark:text-slate-400 mt-0.5">{g.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spoken Language */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
                    Spoken Voice Language
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'te-IN', label: 'తెలుగు (te-IN)', sub: 'Telugu Native' },
                      { id: 'en-IN', label: 'English (en-IN)', sub: 'Indian English' },
                      { id: 'en-US', label: 'English (en-US)', sub: 'US Accent' },
                    ].map((l) => {
                      const isSelected = localSettings.voice.voiceLanguage === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleUpdate('voice', { voiceLanguage: l.id as any })}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#DBEAFE] dark:bg-blue-600/20 border-[#2563EB] text-[#1E40AF] dark:text-sky-200 font-bold shadow-2xs'
                              : 'bg-[#F8FAFC] dark:bg-white/[0.02] border-[#E2E8F0] dark:border-white/10 text-[#64748B] hover:border-[#93C5FD]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">{l.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />}
                          </div>
                          <p className="text-[10px] text-[#64748B] dark:text-slate-400 mt-0.5">{l.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual Voice Selection Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                    Manual Voice Selection ({detectedVoices.length} available)
                  </label>
                  <select
                    value={localSettings.voice.selectedVoiceURI}
                    onChange={(e) => handleUpdate('voice', { selectedVoiceURI: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 text-xs focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Auto-matched according to Gender &amp; Language</option>
                    {detectedVoices.map((dv) => (
                      <option key={dv.voice.voiceURI} value={dv.voice.voiceURI}>
                        {dv.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speed & Volume Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#0F172A] dark:text-slate-200">Speech Speed</span>
                      <span className="text-[#2563EB] dark:text-sky-300 font-mono font-bold">{localSettings.voice.speechRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={localSettings.voice.speechRate}
                      onChange={(e) => handleUpdate('voice', { speechRate: parseFloat(e.target.value) })}
                      className="w-full accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[10px] text-[#64748B]">
                      <span>0.5x Slow</span>
                      <span>1.0x Normal</span>
                      <span>2.0x Fast</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#0F172A] dark:text-slate-200">Volume</span>
                      <span className="text-[#2563EB] dark:text-sky-300 font-mono font-bold">
                        {Math.round((localSettings.voice.volume ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={localSettings.voice.volume ?? 1.0}
                      onChange={(e) => handleUpdate('voice', { volume: parseFloat(e.target.value) })}
                      className="w-full accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[10px] text-[#64748B]">
                      <span>0% Mute</span>
                      <span>50%</span>
                      <span>100% Max</span>
                    </div>
                  </div>
                </div>

                {/* Auto Voice ON/OFF toggle */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] border border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-100 text-xs">Auto Voice (Automatic Speech Playback)</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">Automatically speak every real AI response aloud without clicking Play</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localSettings.voice.autoReadAloud}
                    data-testid="settings-auto-voice-switch"
                    onClick={() => handleUpdate('voice', { autoReadAloud: !localSettings.voice.autoReadAloud })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer touch-manipulation shrink-0 ${
                      localSettings.voice.autoReadAloud
                        ? 'bg-[#2563EB] border-[#1E40AF] text-white'
                        : 'bg-white dark:bg-white/[0.05] border-[#E2E8F0] dark:border-white/15 text-[#64748B] dark:text-slate-300'
                    }`}
                  >
                    {localSettings.voice.autoReadAloud ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Test Voice Button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      isTestingVoice
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                        : 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white shadow-md shadow-blue-600/25'
                    }`}
                  >
                    {isTestingVoice ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isTestingVoice ? 'Stop Test Voice' : 'Test Selected Voice'}</span>
                  </button>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                    Plays sample audio in {localSettings.voice.voiceLanguage} using {localSettings.voice.voiceGender} voice
                  </span>
                </div>

                {/* Device Voice Audit */}
                <div className="p-4 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/25 border border-[#BFDBFE] dark:border-blue-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E40AF] dark:text-sky-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                      Device Voice Diagnostics Report
                    </span>
                    <span className="text-[10px] font-mono text-[#2563EB] dark:text-sky-300 font-semibold">
                      {detectedVoices.length} Voices Found
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-[#E2E8F0] dark:border-white/5">
                      <p className="text-[10px] text-[#64748B]">SpeechSynthesis</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">Supported (Free)</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-[#E2E8F0] dark:border-white/5">
                      <p className="text-[10px] text-[#64748B]">Telugu (te-IN)</p>
                      <p className={`font-bold ${voiceAudit.hasTeluguVoice ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {voiceAudit.hasTeluguVoice ? 'Installed' : 'Using Fallback'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-[#E2E8F0] dark:border-white/5">
                      <p className="text-[10px] text-[#64748B]">Male Voices</p>
                      <p className={`font-bold ${voiceAudit.hasMaleVoice ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#2563EB] dark:text-sky-300'}`}>
                        {voiceAudit.hasMaleVoice ? 'Detected' : 'Resonance Mode'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-[#E2E8F0] dark:border-white/5">
                      <p className="text-[10px] text-[#64748B]">Female Voices</p>
                      <p className={`font-bold ${voiceAudit.hasFemaleVoice ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#2563EB] dark:text-sky-300'}`}>
                        {voiceAudit.hasFemaleVoice ? 'Detected' : 'Resonance Mode'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                    <strong>Android Chrome Tip:</strong> To install official Google Telugu or Indian English voice packages on Android: Open <em>Settings &gt; System / Accessibility &gt; Text-to-speech output &gt; Google Text-to-Speech Engine settings &gt; Install voice data</em>.
                  </p>
                </div>
              </div>
            )}

            {/* 9. NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2.5 border-b border-[#E2E8F0] dark:border-white/[0.06]">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Audio Notifications</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Play pleasant chime when a response completes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.soundAlerts}
                    onChange={(e) => handleUpdate('notifications', { soundAlerts: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs">Desktop Notifications</p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Notify when response finishes while backgrounded</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.desktopNotifications}
                    onChange={(e) => handleUpdate('notifications', { desktopNotifications: e.target.checked })}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 10. SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] border border-[#E2E8F0] dark:border-white/[0.08]">
                  <div>
                    <h5 className="font-semibold text-xs text-[#0F172A] dark:text-slate-200">Two-Factor Authentication (2FA)</h5>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">Protects account with OTP challenge</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-[#0F172A] dark:text-slate-200">Active Sessions</h5>
                  {localSettings.security.sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {sess.device.includes('Mobile') ? (
                          <Smartphone className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                        ) : (
                          <Laptop className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                        )}
                        <div>
                          <p className="font-semibold text-[#0F172A] dark:text-slate-200">{sess.device}</p>
                          <p className="text-[10px] text-[#64748B]">{sess.browser} • {sess.ip}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400">{sess.lastActive}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. LOGIN & ACCOUNT */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] border border-[#E2E8F0] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-[#BFDBFE] dark:ring-sky-500/40" />
                    <div>
                      <h4 className="font-bold text-[#0F172A] dark:text-slate-100">{user.name}</h4>
                      <p className="text-xs text-[#64748B] dark:text-slate-400">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE]">
                        {user.plan}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 12. API PROVIDER CONFIG */}
            {activeTab === 'api' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/30 border border-[#BFDBFE] dark:border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                    <h5 className="font-bold text-[#1E40AF] dark:text-sky-200">Google Gemini GenAI Provider</h5>
                  </div>
                  <p className="text-[#0F172A] dark:text-slate-300 leading-relaxed">
                    CHAT AI calls Google Gemini models securely from server-side handlers via the official <code className="text-[#1E40AF] dark:text-sky-300 bg-[#DBEAFE] dark:bg-black/40 px-1.5 py-0.5 rounded font-semibold">@google/genai</code> SDK.
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    Telemetry: Request headers configured with <code className="text-[#2563EB] dark:text-sky-300">User-Agent: aistudio-build</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] space-y-1">
                  <p className="font-semibold text-[#0F172A] dark:text-slate-200">API Key Management</p>
                  <p className="text-[#64748B] dark:text-slate-400 text-[11px]">
                    Your API key is stored securely in environment variables (<code className="text-[#2563EB] dark:text-sky-400">GEMINI_API_KEY</code>) and injected automatically via the <strong>Settings &gt; Secrets</strong> panel. It is never exposed to browser bundles.
                  </p>
                </div>
              </div>
            )}

            {/* 13. HELP & SUPPORT */}
            {activeTab === 'help' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <h5 className="font-semibold text-[#0F172A] dark:text-slate-200">Frequently Asked Questions</h5>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] space-y-1">
                    <p className="font-semibold text-[#1E40AF] dark:text-sky-300">How do I switch to Telugu?</p>
                    <p className="text-[#64748B] dark:text-slate-400">Click the language button (EN / తెలుగు) in the header or in Settings &gt; Language Selection.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] space-y-1">
                    <p className="font-semibold text-[#1E40AF] dark:text-sky-300">How does Voice Speech-to-Text work?</p>
                    <p className="text-[#64748B] dark:text-slate-400">Click the microphone icon in the message bar. Speak in English or Telugu to dictate text in real-time.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06] space-y-1">
                    <p className="font-semibold text-[#1E40AF] dark:text-sky-300">Who created and owns CHAT AI?</p>
                    <p className="text-[#64748B] dark:text-slate-400">CHAT AI was created by <strong className="text-[#0F172A] dark:text-slate-200">KARTHIK JANNE</strong>, the founder and owner of CHAT AI.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06]">
                  <h5 className="font-semibold text-[#0F172A] dark:text-slate-200 mb-2">Keyboard Shortcuts</h5>
                  <div className="grid grid-cols-2 gap-2 text-[#64748B] dark:text-slate-400">
                    <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-black/40 border border-[#E2E8F0] dark:border-white/20 text-[#0F172A] dark:text-slate-200">⌘N</kbd> New Chat</div>
                    <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-black/40 border border-[#E2E8F0] dark:border-white/20 text-[#0F172A] dark:text-slate-200">Enter</kbd> Send Message</div>
                    <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-black/40 border border-[#E2E8F0] dark:border-white/20 text-[#0F172A] dark:text-slate-200">Shift+Enter</kbd> New Line</div>
                  </div>
                </div>
              </div>
            )}

            {/* 14. ABOUT */}
            {activeTab === 'about' && (
              <div data-testid="settings-about-section" className="space-y-4 text-center py-4">
                <div className="flex justify-center">
                  <BrandLogo size="lg" showText={false} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-[#0F172A] dark:text-white">CHAT AI</h3>
                  <p className="text-xs text-[#2563EB] dark:text-sky-300 font-semibold tracking-wider">Your AI. Your World.</p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">Version 2.6.0 • Enterprise Edition</p>
                </div>

                <div
                  data-testid="about-creator-card"
                  className="max-w-md mx-auto rounded-2xl bg-gradient-to-br from-[#EFF6FF] via-white to-[#DBEAFE]/60 dark:from-blue-600/15 dark:via-[#111827] dark:to-sky-500/10 border border-[#BFDBFE] dark:border-blue-500/30 p-4 text-left space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                      Creator &amp; Ownership
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-sky-300">Official</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-0.5">
                    <div>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400">Creator &amp; Founder</p>
                      <p className="font-bold text-[#0F172A] dark:text-white tracking-wide mt-0.5">KARTHIK JANNE</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400">Owner &amp; Developer</p>
                      <p className="font-bold text-[#0F172A] dark:text-white tracking-wide mt-0.5">KARTHIK JANNE</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#0F172A] dark:text-slate-300 pt-1.5 border-t border-[#E2E8F0] dark:border-white/[0.08]">
                    CHAT AI వ్యవస్థాపకుడు మరియు యజమాని: <strong className="text-[#1E40AF] dark:text-sky-300">KARTHIK JANNE</strong>
                  </p>
                </div>

                <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Created and owned by <strong className="text-[#0F172A] dark:text-slate-200">KARTHIK JANNE</strong>. Engineered as a full-featured, next-generation AI assistant delivering streaming intelligence, dual-voice capabilities, file analysis, web search, and Telugu &amp; English support.
                </p>

                <div className="pt-2 flex justify-center gap-4 text-xs text-[#64748B] dark:text-slate-400">
                  <span className="hover:text-[#2563EB] cursor-pointer">Privacy Policy</span>
                  <span>•</span>
                  <span className="hover:text-[#2563EB] cursor-pointer">Terms of Service</span>
                  <span>•</span>
                  <span className="hover:text-[#2563EB] cursor-pointer">Security Overview</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
