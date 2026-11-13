import React, { useState } from 'react';
import { X, Share2, Copy, Check, Download, FileText } from 'lucide-react';
import { Conversation } from '../types.ts';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  conversation,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/chat/${conversation.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMarkdown = () => {
    const markdownContent = conversation.messages
      .map((m) => `### ${m.role === 'user' ? 'User' : 'CHAT AI'}\n\n${m.content}\n\n---`)
      .join('\n\n');
    navigator.clipboard.writeText(markdownContent);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversation, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${conversation.title.replace(/\s+/g, '_')}_chat.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Share Conversation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-[#64748B] dark:text-slate-300">
          <div>
            <p className="font-semibold text-[#0F172A] dark:text-slate-200 mb-1">Public Share Link</p>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-2">
              Messages up to this point will be viewable by anyone with this link.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-300 text-xs font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/[0.06] space-y-2">
            <p className="font-semibold text-[#0F172A] dark:text-slate-200">Export &amp; Download</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 flex items-center justify-center gap-2 font-semibold transition cursor-pointer"
              >
                {copiedMarkdown ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />}
                <span>{copiedMarkdown ? 'Copied Markdown' : 'Copy as Markdown'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJSON}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.07] border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 flex items-center justify-center gap-2 font-semibold transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
