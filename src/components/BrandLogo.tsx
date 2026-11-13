import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  onClick?: () => void;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  onClick,
  className = '',
}) => {
  const sizeMap = {
    xs: { icon: 20, text: 'text-sm', badge: 'text-[9px]', sub: 'text-[9px]' },
    sm: { icon: 26, text: 'text-base', badge: 'text-[10px]', sub: 'text-[10px]' },
    md: { icon: 34, text: 'text-xl', badge: 'text-xs', sub: 'text-xs' },
    lg: { icon: 46, text: 'text-2xl', badge: 'text-sm', sub: 'text-xs' },
    xl: { icon: 60, text: 'text-3xl', badge: 'text-base', sub: 'text-sm' },
  };

  const dim = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {/* CHAT AI Blue & White Intelligence Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{ width: dim.icon, height: dim.icon }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(37,99,235,0.22)]"
        >
          <defs>
            <linearGradient id="chatAiGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="55%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="chatAiGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <radialGradient id="chatCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2563EB" />
            </radialGradient>
          </defs>

          {/* Outer Rounded Chat Bubble */}
          <path
            d="M24 4C13.507 4 5 12.059 5 22C5 26.685 6.895 30.957 10.05 34.15L8.2 41.5C8.03 42.18 8.65 42.75 9.3 42.48L17.3 39.12C19.42 39.7 21.66 40 24 40C34.493 40 43 31.941 43 22C43 12.059 34.493 4 24 4Z"
            fill="#DBEAFE"
            fillOpacity="0.65"
            stroke="url(#chatAiGrad1)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Geometric Intelligence Infinity Loop */}
          <path
            d="M17 18C14.791 18 13 19.791 13 22C13 24.209 14.791 26 17 26C19.8 26 21.2 22 24 22C26.8 22 28.2 26 31 26C33.209 26 35 24.209 35 22C35 19.791 33.209 18 31 18C28.2 18 26.8 22 24 22C21.2 22 19.8 18 17 18Z"
            stroke="url(#chatAiGrad2)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Blue Node */}
          <circle cx="24" cy="22" r="2.75" fill="url(#chatCore)" />
          <circle cx="24" cy="22" r="4.5" stroke="#38BDF8" strokeWidth="0.9" strokeOpacity="0.7" />
        </svg>
      </div>

      {/* Typography: CHAT AI */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-[#0F172A] dark:text-white ${dim.text} group-hover:text-[#2563EB] dark:group-hover:text-sky-300 transition-colors`}
            >
              CHAT
            </span>
            <span
              className={`font-extrabold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white tracking-wider shadow-sm ${dim.badge}`}
            >
              AI
            </span>
          </div>

          {showTagline && (
            <span
              className={`text-[#64748B] dark:text-slate-400 font-medium tracking-normal mt-0.5 ${dim.sub}`}
            >
              Your AI. Your World.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
