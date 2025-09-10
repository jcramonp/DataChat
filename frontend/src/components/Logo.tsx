import React from 'react';

type Props = {
  size?: number; // alto del ícono
  withText?: boolean; // mostrar "DataChat" a la derecha
};

export default function Logo({ size = 28, withText = true }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Ícono tipo “burbuja de chat” con barras y degradado */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: 14 }}
      >
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6BA8FF" />
            <stop offset="1" stopColor="#C77DFF" />
          </linearGradient>
        </defs>
        <rect x="6" y="8" width="44" height="34" rx="12" fill="url(#g)" />
        {/* colita del chat */}
        <path d="M26 42 L30 56 L40 42" fill="url(#g)" />
        {/* barras más centradas */}
        <rect x="16" y="26" width="6" height="12" rx="2" fill="#fff" />
        <rect x="26" y="22" width="6" height="16" rx="2" fill="#fff" />
        <rect x="36" y="18" width="6" height="20" rx="2" fill="#fff" />
      </svg>

      {withText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: 20,
            lineHeight: 1,
            background: 'linear-gradient(90deg, #2F6BFF, #9B6BFF)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          DataChat
        </span>
      )}
    </div>
  );
}
