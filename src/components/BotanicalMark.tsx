import React from 'react';

export const BotanicalSprig: React.FC<{ className?: string }> = ({ className = 'h-6 w-12' }) => (
  <svg
    viewBox="0 0 64 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M4 22C18 20 33 14 58 6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M22 17C20 11 23 6 29 5C29 11 26 15 22 17Z"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    <path
      d="M36 12.5C35 7 38 3 43.5 2.5C43 8 40 11 36 12.5Z"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    <path
      d="M32 14C37 16.5 40 20.5 39.5 24.5C34.5 23 32 19 32 14Z"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
  </svg>
);

export const BotanicalStemDivider: React.FC<{ className?: string }> = ({
  className = 'w-full',
}) => (
  <div className={`flex items-center gap-4 ${className}`} aria-hidden="true">
    <div className="h-px flex-1 bg-[#342B2D]/10 dark:bg-[#F6F0EA]/12" />
    <svg
      viewBox="0 0 28 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-6 text-[#A4AE96] dark:text-[#B3BDAA]"
    >
      <path
        d="M14 18V4M14 12C10 11.5 7 9 7 5.5C10.5 5.5 13 8 14 12ZM14 9C18 8.5 21 6 21 2.5C17.5 2.5 15 5 14 9Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <div className="h-px flex-1 bg-[#342B2D]/10 dark:bg-[#F6F0EA]/12" />
  </div>
);

export const FlouraEmblem: React.FC<{ className?: string }> = ({ className = 'h-7 w-7' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <circle
      cx="18"
      cy="18"
      r="16.5"
      className="fill-[#F0E9E2] stroke-[#342B2D]/12 dark:fill-[#282024] dark:stroke-[#F6F0EA]/15"
      strokeWidth="1"
    />
    <path
      d="M18 7.5C21.5 12 22.8 16 21.2 20.2C20 23.2 18 25 18 25C18 25 16 23.2 14.8 20.2C13.2 16 14.5 12 18 7.5Z"
      className="fill-[#705264] dark:fill-[#D4B4C6]"
    />
    <circle
      cx="18"
      cy="18.2"
      r="2.4"
      className="fill-[#F8F4EC] dark:fill-[#191416]"
    />
    <path
      d="M11 24.5C13 26.8 15.4 28 18 28C20.6 28 23 26.8 25 24.5"
      className="stroke-[#C58F98] dark:stroke-[#D9A7AF]"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
