import React, { useState } from 'react';
import {
  X, User, LogOut, Calendar
} from 'lucide-react';
import { User as UserType } from '../types.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onDeleteAccount,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name: name.trim() || user.name,
      email: email.trim() || user.email,
      avatar,
    });
    onClose();
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('Passwords do not match.');
      return;
    }

    setPasswordStatus('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(null), 3000);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText.toLowerCase() === 'delete') {
      onDeleteAccount();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Account Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white hover:bg-[#EFF6FF] dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-[#64748B] dark:text-slate-300">
          {/* Avatar & Summary */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.02] border border-[#E2E8F0] dark:border-white/[0.06]">
            <div className="relative group">
              <img
                src={avatar}
                alt={name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-[#BFDBFE] dark:ring-sky-500/50"
              />
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="font-bold text-sm text-[#0F172A] dark:text-white">{name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBEAFE] dark:bg-blue-500/20 text-[#1E40AF] dark:text-sky-300 border border-[#BFDBFE] dark:border-blue-500/30">
                  {user.plan}
                </span>
              </div>
              <p className="text-[#64748B] dark:text-slate-400 text-xs">{email}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-[#64748B] dark:text-slate-400 justify-center sm:justify-start">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#2563EB] dark:text-sky-400" /> Member since {user.joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Avatars */}
          <div>
            <label className="block font-semibold text-[#0F172A] dark:text-slate-200 mb-2">Choose Avatar Preset</label>
            <div className="flex items-center gap-3">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatar(url)}
                  className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition cursor-pointer ${
                    avatar === url ? 'ring-[#2563EB] scale-105' : 'ring-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <h4 className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs border-b border-[#E2E8F0] dark:border-white/[0.06] pb-1">
              Edit Details
            </h4>
            <div>
              <label className="block text-[11px] text-[#64748B] dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#64748B] dark:text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold transition shadow-sm cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>

          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
            <h4 className="font-semibold text-[#0F172A] dark:text-slate-200 text-xs border-b border-[#E2E8F0] dark:border-white/[0.06] pb-1">
              Change Password
            </h4>
            <div>
              <label className="block text-[11px] text-[#64748B] dark:text-slate-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#64748B] dark:text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748B] dark:text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-100 text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {passwordStatus && (
              <p className={`text-xs font-medium ${passwordStatus.includes('success') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {passwordStatus}
              </p>
            )}

            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-[#EFF6FF] dark:bg-white/5 hover:bg-[#DBEAFE] dark:hover:bg-white/10 border border-[#BFDBFE] dark:border-white/10 text-[#1E40AF] dark:text-slate-200 font-semibold transition cursor-pointer"
            >
              Update Password
            </button>
          </form>

          {/* Account Actions: Logout & Delete */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-white/[0.08] space-y-3">
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#EFF6FF] dark:hover:bg-white/10 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-slate-200 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
              <span>Log Out of Session</span>
            </button>

            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full py-2 px-3 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-center font-medium transition cursor-pointer"
              >
                Delete Account
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 space-y-2">
                <p className="font-semibold text-rose-700 dark:text-rose-300">Permanently Delete Account?</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                  Type <strong className="text-[#0F172A] dark:text-white">DELETE</strong> to confirm permanent deletion of all chats and account data.
                </p>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="flex-1 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-[#E2E8F0] dark:border-transparent text-[#0F172A] dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmationText.toLowerCase() !== 'delete'}
                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
