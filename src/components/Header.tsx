import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, Plus, Share2, Sparkles, ChevronDown, Check, Globe,
  Cpu, Zap, ShieldCheck, Home, Volume2, VolumeX, Image as ImageIcon
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { User } from '../types.ts';
import { AVAILABLE_MODELS } from '../data/models.ts';

interface HeaderProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onNavigateHome: () => void;
  isHomeActive: boolean;
  onOpenShare: () => void;
  onOpenTools: () => void;
  onOpenImageGenerator: () => void;
  isImageGenActive?: boolean;
  onOpenVoiceMode: () => void;
  onOpenProfile: () => void;
  currentLanguage: 'en' | 'te';
  onToggleLanguage: () => void;
  autoVoiceEnabled: boolean;
  onToggleAutoVoice: () => void;
  user: User;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  onSelectModel,
  onToggleSidebar,
  onNewChat,
  onNavigateHome,
  isHomeActive,
  onOpenShare,
  onOpenTools,
  onOpenImageGenerator,
  isImageGenActive = false,
  onOpenVoiceMode,
  onOpenProfile,
  currentLanguage,
  onToggleLanguage,
  autoVoiceEnabled,
  onToggleAutoVoice,
  user,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeModel = AVAILABLE_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="h-14 w-full bg-white/95 dark:bg-[#0F172A]/95 border-b border-[#E2E8F0] dark:border-white/10 backdrop-blur-md sticky top-0 z-30 px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 shadow-xs"
    >
      {/* Left: Mobile sidebar toggle + Brand Logo + Home button */}
      <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink-0">
        <button
          type="button"
          data-testid="header-sidebar-toggle"
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar"
          className="p-2 rounded-xl text-[#2563EB] dark:text-sky-400 hover:bg-[#EFF6FF] dark:hover:bg-white/10 transition cursor-pointer touch-manipulation shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo with click to Home */}
        <BrandLogo
          size="sm"
          showText={true}
          showTagline={false}
          onClick={onNavigateHome}
          className="hover:opacity-90 shrink-0"
        />

        {/* Explicit Home Button */}
        <button
          type="button"
          data-testid="header-home-btn"
          onClick={onNavigateHome}
          title="Go to Home"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer touch-manipulation shrink-0 ${
            isHomeActive
              ? 'bg-[#DBEAFE] dark:bg-blue-600/25 text-[#1E40AF] dark:text-sky-200 border border-[#93C5FD] dark:border-blue-500/40 shadow-xs'
              : 'text-[#64748B] dark:text-slate-300 hover:text-[#2563EB] dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/5 border border-transparent'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
          <span className="hidden sm:inline">Home</span>
        </button>
      </div>

      {/* Center: Model Selector Dropdown */}
      <div className="relative min-w-0 flex-1 flex justify-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.06] hover:bg-[#EFF6FF] dark:hover:bg-white/10 border border-[#E2E8F0] dark:border-white/10 hover:border-[#93C5FD] transition text-[11px] sm:text-sm font-medium text-[#0F172A] dark:text-slate-100 max-w-full min-w-0 shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-1.5 truncate max-w-[82px] sm:max-w-none">
            <Cpu className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400 shrink-0" />
            <span className="font-semibold truncate">{activeModel.name}</span>
          </div>
          {activeModel.isFreeTier && (
            <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE] dark:border-blue-500/30 shrink-0">
              Free Tier
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 transition-transform duration-200 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {modelDropdownOpen && (
          <div className="fixed sm:absolute left-1/2 -translate-x-1/2 top-14 sm:top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-blue-500/20 shadow-xl shadow-slate-900/10 dark:shadow-black/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
              <span className="font-semibold text-[#0F172A] dark:text-slate-100">Select Intelligence Engine</span>
              <span className="flex items-center gap-1 text-[11px] text-[#2563EB] dark:text-sky-400 font-semibold">
                <Cpu className="w-3 h-3" />
                Google Gemini
              </span>
            </div>

            <div className="py-1 space-y-1">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = model.id === currentModel;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(model.id);
                      setModelDropdownOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF6FF] dark:bg-blue-600/20 border border-[#93C5FD] dark:border-blue-500/40'
                        : 'hover:bg-[#F8FAFC] dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#EFF6FF] dark:bg-white/5 border border-[#BFDBFE] dark:border-white/20 flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-[#2563EB] dark:text-sky-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#0F172A] dark:text-slate-100">
                          {model.name}
                        </span>
                        {model.isFreeTier ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE] dark:border-blue-500/30">
                            Free Tier
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-indigo-500/20 text-[#2563EB] dark:text-blue-300 border border-[#BFDBFE] dark:border-blue-500/30">
                            Pro Reasoning
                          </span>
                        )}
                        {model.recommended && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2563EB] text-white">
                            Recommended
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 line-clamp-2">
                        {model.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#64748B] dark:text-slate-400 font-mono">
                        <span>Speed: <strong className="text-[#0F172A] dark:text-slate-200">{model.speed}</strong></span>
                        <span>•</span>
                        <span>Context: <strong className="text-[#0F172A] dark:text-slate-200">{model.contextWindow}</strong></span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-[#E2E8F0] dark:border-white/10 text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                Live API &amp; Zero Data Leakage
              </span>
              <span>Settings &gt; Secrets</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Actions: Language Toggle, Voice, Tools, Share, New Chat, Profile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Language Quick Toggle */}
        <button
          type="button"
          onClick={onToggleLanguage}
          title={currentLanguage === 'en' ? 'Switch to Telugu (తెలుగు)' : 'Switch to English'}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] hover:bg-[#EFF6FF] dark:hover:bg-white/10 border border-[#E2E8F0] dark:border-white/10 hover:border-[#93C5FD] text-xs font-medium text-[#0F172A] dark:text-slate-200 transition cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
          <span>{currentLanguage === 'en' ? 'EN' : 'తెలుగు'}</span>
        </button>

        {/* Auto Voice ON/OFF Quick Toggle */}
        <button
          type="button"
          data-testid="header-auto-voice-toggle"
          onClick={onToggleAutoVoice}
          title={autoVoiceEnabled ? 'Auto Voice is ON (tap to turn OFF)' : 'Auto Voice is OFF (tap to turn ON)'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer touch-manipulation ${
            autoVoiceEnabled
              ? 'bg-[#DBEAFE] dark:bg-blue-600/25 hover:bg-[#BFDBFE] border-[#93C5FD] dark:border-sky-400/50 text-[#1E40AF] dark:text-sky-200'
              : 'bg-white dark:bg-white/[0.05] hover:bg-[#EFF6FF] dark:hover:bg-white/10 border-[#E2E8F0] dark:border-white/10 text-[#64748B] dark:text-slate-300 hover:text-[#2563EB]'
          }`}
        >
          {autoVoiceEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
          )}
          <span className="hidden md:inline">Auto Voice: {autoVoiceEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Dedicated Voice Chat Mode Button */}
        <button
          type="button"
          data-testid="header-voice-mode-btn"
          onClick={onOpenVoiceMode}
          title="Open Dedicated Voice Chat Mode (Hands-free Speech)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#EFF6FF] dark:bg-blue-500/15 hover:bg-[#DBEAFE] dark:hover:bg-blue-500/25 border border-[#BFDBFE] dark:border-sky-500/30 text-xs font-semibold text-[#1E40AF] dark:text-sky-300 transition cursor-pointer touch-manipulation"
        >
          <span className="hidden sm:inline">Voice Mode</span>
          <span className="sm:hidden">Voice</span>
        </button>

        {/* AI Image Generator Button */}
        <button
          type="button"
          data-testid="header-image-gen-btn"
          onClick={onOpenImageGenerator}
          title="Open Free AI Image Generator"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer touch-manipulation ${
            isImageGenActive
              ? 'bg-[#2563EB] border-[#1E40AF] text-white shadow-sm'
              : 'bg-[#EFF6FF] dark:bg-blue-500/15 hover:bg-[#DBEAFE] dark:hover:bg-blue-500/25 border-[#BFDBFE] dark:border-blue-500/30 text-[#1E40AF] dark:text-blue-200'
          }`}
        >
          <ImageIcon className={`w-3.5 h-3.5 ${isImageGenActive ? 'text-white' : 'text-[#2563EB] dark:text-sky-400'}`} />
          <span className="hidden md:inline">Image Gen</span>
        </button>

        {/* AI Tools Modal Launcher */}
        <button
          type="button"
          onClick={onOpenTools}
          title="Explore 15 AI Tools"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EFF6FF] dark:bg-blue-500/15 hover:bg-[#DBEAFE] dark:hover:bg-blue-500/25 border border-[#BFDBFE] dark:border-blue-500/30 text-xs font-semibold text-[#1E40AF] dark:text-sky-300 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
          <span>AI Tools</span>
        </button>

        {/* Share Conversation */}
        <button
          type="button"
          onClick={onOpenShare}
          title="Share Conversation"
          className="hidden sm:flex p-2 rounded-xl text-[#2563EB] dark:text-sky-400 hover:bg-[#EFF6FF] dark:hover:bg-white/10 transition cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          title="New Chat (⌘N)"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white font-semibold text-xs shadow-sm shadow-blue-600/25 transition cursor-pointer touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>

        {/* User Profile Avatar */}
        <button
          type="button"
          onClick={onOpenProfile}
          title="User Profile & Settings"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-2 ring-[#BFDBFE] dark:ring-sky-500/40 hover:ring-[#2563EB] transition shrink-0 cursor-pointer"
        >
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  );
};
