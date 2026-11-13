import React, { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight, Check } from 'lucide-react';
import { User as UserType } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('karthikjk630@gmail.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Karthik');
  const [recoveryCodeSent, setRecoveryCodeSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      setRecoveryCodeSent(true);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const authenticatedUser: UserType = {
      id: `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: mode === 'signup' ? name.trim() || 'New User' : (email.includes('karthik') ? 'Karthik' : 'CHAT AI User'),
      email: email.trim(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: 'CHAT AI Pro',
      joinedDate: 'November 2024',
      totalMessages: 52,
      totalConversations: 7,
    };

    onLoginSuccess(authenticatedUser);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <BrandLogo size="md" showText={true} showTagline={true} />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-white">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your CHAT AI account'}
            {mode === 'forgot' && 'Reset your password'}
          </h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            {mode === 'login' && 'Sign in to access your saved conversations, memories, and tools.'}
            {mode === 'signup' && 'Join CHAT AI for high-speed streaming intelligence.'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {recoveryCodeSent ? (
          <div className="p-4 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-500/30 space-y-3 text-xs text-center">
            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] dark:bg-blue-600/20 text-[#2563EB] flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-semibold text-[#0F172A] dark:text-slate-200">Recovery email sent!</p>
            <p className="text-[#64748B] dark:text-slate-400">
              We've dispatched password reset instructions to <strong className="text-[#0F172A] dark:text-white">{email}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setRecoveryCodeSent(false);
                setMode('login');
              }}
              className="text-[#2563EB] dark:text-sky-400 hover:underline pt-2 font-semibold cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'signup' && (
              <div>
                <label className="block font-semibold text-[#0F172A] dark:text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] dark:text-sky-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-[#0F172A] dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] dark:text-sky-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-[#0F172A] dark:text-slate-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[#2563EB] dark:text-sky-400 hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] dark:text-sky-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition cursor-pointer"
            >
              <span>
                {mode === 'login' && 'Sign In to CHAT AI'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/[0.06] text-center text-xs text-[#64748B] dark:text-slate-400">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="text-[#2563EB] dark:text-sky-400 font-semibold hover:underline cursor-pointer">
                Sign Up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-[#2563EB] dark:text-sky-400 font-semibold hover:underline cursor-pointer">
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <button type="button" onClick={() => setMode('login')} className="text-[#2563EB] dark:text-sky-400 font-semibold hover:underline cursor-pointer">
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
