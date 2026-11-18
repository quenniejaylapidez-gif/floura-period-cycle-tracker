import React from 'react';
import type { AvatarOptionId } from '../types/cycle';

interface ProfileAvatarProps {
  avatarType: AvatarOptionId;
  customImageUrl?: string | null;
  displayName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProfileAvatarProps['size']>, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-18 w-18',
  xl: 'h-20 w-20',
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarType,
  customImageUrl,
  displayName = 'User',
  size = 'lg',
  className = '',
}) => {
  const sizeClass = SIZE_CLASSES[size];

  if (avatarType === 'custom' && customImageUrl) {
    return (
      <img
        src={customImageUrl}
        alt={`${displayName} avatar`}
        referrerPolicy="no-referrer"
        className={`${sizeClass} shrink-0 rounded-full border border-[#342B2D]/14 object-cover shadow-xs dark:border-[#F6F0EA]/16 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${displayName} avatar`}
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full border border-[#342B2D]/12 shadow-xs dark:border-[#F6F0EA]/14 ${className}`}
    >
      {avatarType === 'botanical' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <rect width="80" height="80" className="fill-[#F0E9E2] dark:fill-[#231C1F]" />
          <circle
            cx="40"
            cy="40"
            r="30"
            className="stroke-[#A4AE96]/55 dark:stroke-[#B3BDAA]/45"
            strokeWidth="1.2"
          />
          <path
            d="M40 60C40 44 41 31 44 19"
            className="stroke-[#5D6B4F] dark:stroke-[#B3BDAA]"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M41 44C32 42 26 36 25 27C33 27 39 33 41 44Z"
            className="fill-[#A4AE96] dark:fill-[#8D9A81]"
          />
          <path
            d="M42 35C50 34 56 28 57 20C49 20 43 26 42 35Z"
            className="fill-[#705264]/80 dark:fill-[#D9A7AF]"
          />
          <path
            d="M40 52C48 51 53 46 55 39C48 39 42 44 40 52Z"
            className="fill-[#D8C29C] dark:fill-[#E0CCA7]"
          />
        </svg>
      )}

      {avatarType === 'floral' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <rect width="80" height="80" className="fill-[#F8F4EC] dark:fill-[#231C1F]" />
          <path
            d="M40 16C45 25 46 33 40 40C34 33 35 25 40 16Z"
            className="fill-[#C58F98] dark:fill-[#D9A7AF]"
          />
          <path
            d="M40 64C35 55 34 47 40 40C46 47 45 55 40 64Z"
            className="fill-[#C58F98]/85 dark:fill-[#D9A7AF]/80"
          />
          <path
            d="M16 40C25 35 33 34 40 40C33 46 25 45 16 40Z"
            className="fill-[#D8C29C] dark:fill-[#E0CCA7]"
          />
          <path
            d="M64 40C55 45 47 46 40 40C47 34 55 35 64 40Z"
            className="fill-[#D8C29C] dark:fill-[#E0CCA7]"
          />
          <circle cx="40" cy="40" r="6.5" className="fill-[#705264] dark:fill-[#F6F0EA]" />
        </svg>
      )}

      {avatarType === 'pastel' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <rect width="80" height="80" className="fill-[#F0E9E2] dark:fill-[#231C1F]" />
          <circle cx="56" cy="24" r="14" className="fill-[#D8C29C]/75 dark:fill-[#E0CCA7]/55" />
          <path
            d="M12 80V50C12 34.5 24.5 22 40 22C55.5 22 68 34.5 68 50V80H12Z"
            className="fill-[#C58F98]/80 dark:fill-[#D9A7AF]/65"
          />
          <path
            d="M24 80V58C24 47.5 32.5 39 43 39C53.5 39 62 47.5 62 58V80H24Z"
            className="fill-[#A4AE96]/85 dark:fill-[#B3BDAA]/65"
          />
          <circle cx="34" cy="54" r="5" className="fill-[#705264] dark:fill-[#F6F0EA]" />
        </svg>
      )}

      {(avatarType === 'minimalist' || (avatarType === 'custom' && !customImageUrl)) && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <rect width="80" height="80" className="fill-[#F0E9E2] dark:fill-[#231C1F]" />
          <circle
            cx="40"
            cy="31"
            r="11.5"
            className="stroke-[#705264] dark:stroke-[#D9A7AF]"
            strokeWidth="2.2"
          />
          <path
            d="M21 63C23.5 51.5 30.8 46.5 40 46.5C49.2 46.5 56.5 51.5 59 63"
            className="stroke-[#705264] dark:stroke-[#D9A7AF]"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle
            cx="40"
            cy="40"
            r="31"
            className="stroke-[#C58F98]/45 dark:stroke-[#D9A7AF]/30"
            strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
};
