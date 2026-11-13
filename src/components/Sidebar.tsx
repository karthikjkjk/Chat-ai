import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, MessageSquare, Pin, Archive, Trash2, Edit2,
  Sparkles, Settings, HelpCircle, ChevronRight, X, Check,
  Home, MoreVertical, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { Conversation, User } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { AI_TOOLS } from '../data/tools.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  isHomeActive: boolean;
  onNavigateHome: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onPinConversation: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteAllConversations: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenTools: () => void;
  onOpenImageGenerator: () => void;
  isImageGenActive?: boolean;
  onSelectTool: (toolId: string) => void;
  onOpenProfile: () => void;
  user: User;
}

type ConfirmDeleteState =
  | { type: 'single'; conv: Conversation }
  | { type: 'all' }
  | null;

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  isHomeActive,
  onNavigateHome,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onPinConversation,
  onArchiveConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  onOpenSettings,
  onOpenHelp,
  onOpenTools,
  onOpenImageGenerator,
  isImageGenActive = false,
  onSelectTool,
  onOpenProfile,
  user,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Close open three-dot menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuId]);

  // Filter conversations
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const matchTitle = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchContent = c.messages.some((m) =>
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchTitle || matchContent;
  });

  const pinnedChats = filtered.filter((c) => c.isPinned && !c.isArchived);
  const regularChats = filtered.filter((c) => !c.isPinned && !c.isArchived);
  const archivedChats = filtered.filter((c) => c.isArchived);

  // Group regular conversations by date
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const todayChats = regularChats.filter((c) => now - c.updatedAt < ONE_DAY);
  const yesterdayChats = regularChats.filter(
    (c) => now - c.updatedAt >= ONE_DAY && now - c.updatedAt < 2 * ONE_DAY
  );
  const last7DaysChats = regularChats.filter(
    (c) => now - c.updatedAt >= 2 * ONE_DAY && now - c.updatedAt < 7 * ONE_DAY
  );
  const olderChats = regularChats.filter((c) => now - c.updatedAt >= 7 * ONE_DAY);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string, e: React.FormEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleConfirmDeletion = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'single') {
      onDeleteConversation(confirmDelete.conv.id);
    } else {
      onDeleteAllConversations();
    }
    setConfirmDelete(null);
    setOpenMenuId(null);
  };

  const renderChatItem = (conv: Conversation) => {
    const isActive = !isHomeActive && conv.id === activeConversationId;
    const isRenaming = editingId === conv.id;
    const isMenuOpen = openMenuId === conv.id;

    return (
      <div
        key={conv.id}
        data-testid={`chat-item-${conv.id}`}
        onClick={() => {
          if (isRenaming) return;
          setOpenMenuId(null);
          onSelectConversation(conv.id);
          if (window.innerWidth < 768) onClose();
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-150 ${
          isActive
            ? 'bg-[#DBEAFE] dark:bg-blue-600/20 text-[#1E40AF] dark:text-white border border-[#93C5FD] dark:border-sky-400/40 font-semibold shadow-2xs'
            : 'text-[#0F172A] dark:text-slate-300 hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
          <MessageSquare
            className={`w-4 h-4 shrink-0 ${
              isActive
                ? 'text-[#2563EB] dark:text-sky-400'
                : 'text-[#64748B] dark:text-slate-400 group-hover:text-[#2563EB]'
            }`}
          />

          {isRenaming ? (
            <div
              className="flex items-center gap-1.5 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                data-testid="chat-rename-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(conv.id, e);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-[#2563EB] text-[#0F172A] dark:text-white focus:outline-none"
              />
              <button
                type="button"
                data-testid="chat-rename-save"
                onClick={(e) => handleSaveRename(conv.id, e)}
                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 rounded cursor-pointer"
                title="Save name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(null);
                }}
                className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-white/10 rounded cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="truncate text-xs tracking-tight">
              {conv.title || 'Untitled conversation'}
            </span>
          )}
        </div>

        {/* Always-accessible Three-Dot Menu Button */}
        {!isRenaming && (
          <div
            className="relative shrink-0"
            ref={isMenuOpen ? menuContainerRef : null}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-testid={`chat-menu-btn-${conv.id}`}
              aria-label={`Options for ${conv.title || 'conversation'}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : conv.id);
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer touch-manipulation ${
                isMenuOpen
                  ? 'bg-[#DBEAFE] dark:bg-white/15 text-[#1E40AF] dark:text-white'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-white hover:bg-[#DBEAFE]/60 dark:hover:bg-white/10'
              }`}
              title="Chat options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                data-testid="chat-menu-dropdown"
                className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/15 shadow-xl shadow-slate-900/10 dark:shadow-black/70 py-1 z-50"
              >
                <button
                  type="button"
                  data-testid="chat-menu-rename"
                  onClick={(e) => startRename(conv, e)}
                  className="w-full px-3 py-2 text-left text-xs text-[#0F172A] dark:text-slate-200 hover:bg-[#EFF6FF] dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                  <span>Rename Chat</span>
                </button>
                <button
                  type="button"
                  data-testid="chat-menu-pin"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(null);
                    onPinConversation(conv.id);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#0F172A] dark:text-slate-200 hover:bg-[#EFF6FF] dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                  <span>{conv.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                </button>
                <button
                  type="button"
                  data-testid="chat-menu-archive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(null);
                    onArchiveConversation(conv.id);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#0F172A] dark:text-slate-200 hover:bg-[#EFF6FF] dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-[#1E40AF] dark:text-sky-300" />
                  <span>{conv.isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                </button>
                <div className="my-1 border-t border-[#E2E8F0] dark:border-white/10" />
                <button
                  type="button"
                  data-testid="chat-menu-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(null);
                    setConfirmDelete({ type: 'single', conv });
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Chat</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        data-testid="sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0 pointer-events-auto shadow-2xl md:shadow-none'
            : '-translate-x-full pointer-events-none md:pointer-events-auto md:translate-x-0 md:w-72 sm:md:w-80'
        }`}
      >
        {/* Top Header: Brand + Close button on mobile */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
          <BrandLogo
            size="md"
            showText={true}
            showTagline={true}
            onClick={() => {
              onNavigateHome();
              if (window.innerWidth < 768) onClose();
            }}
          />
          <button
            type="button"
            aria-label="Close sidebar"
            data-testid="sidebar-close-btn"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/5 cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Actions: Home, New Chat, Image Generator */}
        <div className="p-3 space-y-2">
          {/* Home Button */}
          <button
            type="button"
            data-testid="sidebar-home-btn"
            onClick={() => {
              onNavigateHome();
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full py-2.5 px-3 rounded-xl font-medium text-sm flex items-center gap-2.5 transition duration-150 cursor-pointer touch-manipulation ${
              isHomeActive
                ? 'bg-[#DBEAFE] dark:bg-blue-600/20 text-[#1E40AF] dark:text-white border border-[#93C5FD] dark:border-sky-400/40 font-semibold shadow-2xs'
                : 'bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] text-[#0F172A] dark:text-slate-200 border border-[#E2E8F0] dark:border-white/[0.08]'
            }`}
          >
            <Home className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
            <span>Home</span>
            <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded bg-white/80 dark:bg-black/30 text-[#64748B] dark:text-slate-400 border border-[#E2E8F0] dark:border-transparent">
              Landing
            </span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            data-testid="sidebar-new-chat-btn"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition duration-150 cursor-pointer touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Chat</span>
            <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded bg-white/20 text-white">
              ⌘N
            </span>
          </button>

          {/* AI Image Generator Button */}
          <button
            type="button"
            data-testid="sidebar-image-gen-btn"
            onClick={() => {
              onOpenImageGenerator();
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full py-2.5 px-3 rounded-xl font-medium text-sm flex items-center gap-2.5 transition duration-150 cursor-pointer touch-manipulation ${
              isImageGenActive
                ? 'bg-[#DBEAFE] dark:bg-blue-600/20 text-[#1E40AF] dark:text-white border border-[#93C5FD] dark:border-sky-400/40 font-semibold shadow-2xs'
                : 'bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] text-[#0F172A] dark:text-slate-200 border border-[#E2E8F0] dark:border-white/[0.08]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
            <span>Image Generator</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] dark:text-sky-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-[#E2E8F0] dark:border-white/10 text-xs text-[#0F172A] dark:text-slate-100 placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] dark:focus:ring-sky-500/30 transition"
            />
          </div>
        </div>

        {/* Middle Scrollable Section: Conversations + Tools */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Quick AI Tools shortcuts */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold tracking-wider uppercase text-[#1E40AF] dark:text-sky-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#2563EB] dark:text-sky-400" />
                Featured AI Tools
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenTools();
                  if (window.innerWidth < 768) onClose();
                }}
                className="text-[10px] text-[#2563EB] dark:text-sky-400 hover:text-[#1E40AF] font-bold lowercase flex items-center gap-0.5 cursor-pointer"
              >
                view all (15) <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {AI_TOOLS.slice(0, 4).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    onSelectTool(tool.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] border border-[#E2E8F0] dark:border-white/[0.07] hover:border-[#93C5FD] text-left transition group cursor-pointer"
                >
                  <p className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-200 truncate group-hover:text-[#2563EB] dark:group-hover:text-sky-300">
                    {tool.name.split(' ')[0]} {tool.name.split(' ')[1] || ''}
                  </p>
                  <p className="text-[9px] text-[#64748B] dark:text-slate-400 truncate">
                    {tool.teluguName}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat History Header + Delete All Button */}
          {conversations.length > 0 && (
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
                Chat History ({conversations.length})
              </span>
              <button
                type="button"
                data-testid="sidebar-delete-all-btn"
                onClick={() => setConfirmDelete({ type: 'all' })}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer touch-manipulation"
                title="Delete all chats"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete All</span>
              </button>
            </div>
          )}

          {/* Pinned Chats */}
          {pinnedChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400 flex items-center gap-1">
                <Pin className="w-3 h-3 text-[#2563EB] dark:text-sky-400" />
                Pinned
              </div>
              {pinnedChats.map(renderChatItem)}
            </div>
          )}

          {/* Today */}
          {todayChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
                Today
              </div>
              {todayChats.map(renderChatItem)}
            </div>
          )}

          {/* Yesterday */}
          {yesterdayChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
                Yesterday
              </div>
              {yesterdayChats.map(renderChatItem)}
            </div>
          )}

          {/* Last 7 Days */}
          {last7DaysChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
                Previous 7 Days
              </div>
              {last7DaysChats.map(renderChatItem)}
            </div>
          )}

          {/* Older */}
          {olderChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
                Older
              </div>
              {olderChats.map(renderChatItem)}
            </div>
          )}

          {/* Archived Chats toggle */}
          {archivedChats.length > 0 && (
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-slate-200 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                  Archived ({archivedChats.length})
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-90' : ''}`}
                />
              </button>
              {showArchived && (
                <div className="space-y-1 mt-1">{archivedChats.map(renderChatItem)}</div>
              )}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div
              data-testid="sidebar-empty-history"
              className="text-center py-8 text-xs text-[#64748B] dark:text-slate-400"
            >
              {conversations.length === 0
                ? 'No saved chats yet. Start a conversation!'
                : 'No matching conversations found.'}
            </div>
          )}
        </div>

        {/* Footer Navigation: Settings, Help, Profile */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-white/10 space-y-1 bg-white dark:bg-[#0F172A]">
          <button
            type="button"
            data-testid="sidebar-settings-btn"
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] transition cursor-pointer touch-manipulation"
          >
            <Settings className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            data-testid="sidebar-help-btn"
            onClick={() => {
              onOpenHelp();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#0F172A] dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] transition cursor-pointer touch-manipulation"
          >
            <HelpCircle className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
            <span>Help &amp; Support</span>
          </button>

          {/* User profile card */}
          <div
            onClick={() => {
              onOpenProfile();
              if (window.innerWidth < 768) onClose();
            }}
            className="pt-2 mt-1 border-t border-[#E2E8F0] dark:border-white/[0.06] flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#EFF6FF] dark:hover:bg-white/[0.06] cursor-pointer transition"
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#DBEAFE] dark:ring-sky-500/40 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 truncate">{user.name}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE] dark:border-blue-500/30">
                  {user.plan.replace('CHAT AI ', '')}
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
          </div>

          <p
            data-testid="sidebar-creator-info"
            className="text-[10px] text-[#64748B] dark:text-slate-400 text-center pt-1 select-none"
          >
            Founded &amp; Owned by <span className="font-semibold text-[#2563EB] dark:text-sky-400">KARTHIK JANNE</span>
          </p>
        </div>
      </aside>

      {/* In-App Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="confirm-delete-modal"
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/15 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {confirmDelete.type === 'all' ? 'Delete All Chats?' : 'Delete Chat?'}
                </h4>
                <p className="text-xs text-[#64748B] dark:text-slate-300 mt-1 leading-relaxed">
                  {confirmDelete.type === 'all'
                    ? `Are you sure you want to permanently delete all ${conversations.length} saved chats? Your account and settings will not be affected.`
                    : `Are you sure you want to delete "${confirmDelete.conv.title || 'this conversation'}"? This action cannot be undone.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                data-testid="confirm-cancel-btn"
                onClick={() => setConfirmDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#0F172A] dark:text-slate-200 bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#EFF6FF] dark:hover:bg-white/10 border border-[#E2E8F0] dark:border-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-btn"
                onClick={handleConfirmDeletion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition cursor-pointer"
              >
                {confirmDelete.type === 'all' ? 'Delete All Chats' : 'Delete Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
