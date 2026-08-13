import React from 'react';

interface VerbumLogoProps {
  size?: number;
  className?: string;
}

export const VerbumLogo: React.FC<VerbumLogoProps> = ({ size = 30, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`verbum-sacred-logo ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 6px var(--accent-gold-soft))',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease',
      }}
    >
      <defs>
        <linearGradient id="verbumGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-gold)" />
          <stop offset="60%" stopColor="var(--accent-gold)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* Radiating Light Halo */}
      <g stroke="url(#verbumGoldGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.85">
        <line x1="32" y1="6" x2="32" y2="14" />
        <line x1="20" y1="10" x2="23" y2="17" />
        <line x1="44" y1="10" x2="41" y2="17" />
        <line x1="10" y1="19" x2="16" y2="24" />
        <line x1="54" y1="19" x2="48" y2="24" />
        <line x1="6" y1="31" x2="13" y2="33" />
        <line x1="58" y1="31" x2="51" y2="33" />
      </g>

      {/* Radiant Arc Beam */}
      <path
        d="M16 28 C22 18, 42 18, 48 28"
        stroke="url(#verbumGoldGradient)"
        strokeWidth="1.8"
        strokeDasharray="2 3"
        fill="none"
        opacity="0.6"
      />

      {/* Open Scripture Book Wings */}
      <path
        d="M32 26 C25 22, 14 23, 8 28 L8 50 C14 45, 25 44, 32 48 C39 44, 50 45, 56 50 L56 28 C50 23, 39 22, 32 26 Z"
        fill="url(#verbumGoldGradient)"
        fillOpacity="0.16"
        stroke="url(#verbumGoldGradient)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Book Spine Center Line */}
      <line
        x1="32"
        y1="26"
        x2="32"
        y2="48"
        stroke="url(#verbumGoldGradient)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Inner Scripture Text Lines / Pages */}
      <path
        d="M14 33 C19 30, 26 31, 28 33 M14 38 C19 35, 26 36, 28 38 M14 43 C19 40, 26 41, 28 43"
        stroke="url(#verbumGoldGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Cross / Sacred Monograph on Right Page */}
      <g stroke="url(#verbumGoldGradient)" strokeWidth="1.8" strokeLinecap="round" opacity="0.9">
        <line x1="42" y1="31" x2="42" y2="43" />
        <line x1="37" y1="35" x2="47" y2="35" />
      </g>

      {/* Bottom Pedestal / Base Crest */}
      <path
        d="M24 53 C28 55, 36 55, 40 53 L32 58 Z"
        fill="url(#verbumGoldGradient)"
        opacity="0.9"
      />
    </svg>
  );
};
