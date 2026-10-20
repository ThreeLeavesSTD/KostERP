"use client";

import React from "react";

interface AiIconProps {
  size?: number;
  className?: string;
}

/**
 * Canonical 4-pointed curved AI Sparkle Icon (Rapzeuz Motion UI)
 * Features a neon lime gradient (#F5FF7D -> #D9FF43 -> #84CC16),
 * secondary white sparkle at top-right, and tertiary micro dot at bottom-left.
 */
export function AiIcon({ size = 22, className = "" }: AiIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`ai-icon-svg shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aiGlowGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5FF7D" />
          <stop offset="0.5" stopColor="#D9FF43" />
          <stop offset="1" stopColor="#84CC16" />
        </linearGradient>
      </defs>
      {/* 4-pointed curved primary AI star */}
      <path
        d="M12 2C12 7.2 7.2 12 2 12C7.2 12 12 16.8 12 22C12 16.8 16.8 12 22 12C16.8 12 12 7.2 12 2Z"
        fill="url(#aiGlowGrad)"
      />
      {/* Secondary sparkle top-right */}
      <path
        d="M19 2C19 3.8 17.8 5 16 5C17.8 5 19 6.2 19 8C19 6.2 20.2 5 22 5C20.2 5 19 3.8 19 2Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      {/* Tertiary micro accent circle bottom-left */}
      <circle cx="5.5" cy="18.5" r="1.5" fill="#D9FF43" opacity="0.85" />
    </svg>
  );
}
