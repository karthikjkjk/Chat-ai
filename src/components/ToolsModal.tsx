import React, { useState } from 'react';
import {
  X, Search, Sparkles, Code2, Languages, PenTool, FileText,
  BarChart3, Mail, BookOpen, Binary, Briefcase, CheckCircle2,
  GraduationCap, Database, Compass, TrendingUp, ArrowRight
} from 'lucide-react';
import { AITool } from '../types.ts';
import { AI_TOOLS } from '../data/tools.ts';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: AITool) => void;
}

const ICON_MAP: Record<string, any> = {
  Code2,
  Languages,
  PenTool,
  FileText,
  Sparkles,
  BarChart3,
  Mail,
  BookOpen,
  Binary,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Database,
  Compass,
  TrendingUp,
};

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All 15 Tools' },
    { id: 'code', label: 'Coding & Dev' },
    { id: 'translation', label: 'Telugu & Lingua' },
    { id: 'writing', label: 'Writing & Creative' },
    { id: 'data', label: 'Data & Analysis' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'learning', label: 'Learning & STEM' },
  ];

  const filteredTools = AI_TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.teluguName.includes(searchQuery) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#DBEAFE] dark:bg-blue-500/15 border border-[#BFDBFE] dark:border-blue-500/25 text-[#2563EB] dark:text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] dark:text-white">
                CHAT AI Tools Explorer
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                15 specialized AI intelligence engines tailored for complex tasks and regional languages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-white/[0.06] space-y-3 bg-[#F8FAFC] dark:bg-[#0F172A]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] dark:text-sky-400" />
            <input
              type="text"
              placeholder="Search tools in English or Telugu (తెలుగు)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-xs text-[#0F172A] dark:text-slate-100 placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                    : 'bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF] dark:hover:bg-white/[0.08] text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-white/[0.06]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-[#F8FAFC] dark:bg-[#111827]">
          {filteredTools.map((tool) => {
            const IconComponent = ICON_MAP[tool.iconName] || Sparkles;
            return (
              <div
                key={tool.id}
                className="group p-4 rounded-2xl bg-white dark:bg-white/[0.03] hover:bg-[#EFF6FF]/60 dark:hover:bg-white/[0.06] border border-[#E2E8F0] dark:border-white/[0.07] hover:border-[#93C5FD] flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-[#DBEAFE] dark:bg-blue-500/15 text-[#2563EB] dark:text-sky-400 group-hover:bg-[#2563EB] group-hover:text-white transition">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    {tool.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-500/15 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE] dark:border-blue-500/30">
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A] dark:text-slate-100">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-[#2563EB] dark:text-sky-400 font-medium">
                      {tool.teluguName}
                    </p>
                  </div>

                  <p className="text-xs text-[#64748B] dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-[#E2E8F0] dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTool(tool);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#EFF6FF] dark:bg-white/[0.05] group-hover:bg-[#2563EB] group-hover:text-white text-[#1E40AF] dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Launch Tool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
