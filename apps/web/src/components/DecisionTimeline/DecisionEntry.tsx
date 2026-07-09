import React from 'react';
import type { TimelineEntry } from '@ai-commander/zeroad-adapter';

interface DecisionEntryProps {
  entry: TimelineEntry;
  onClick?: (tick: number) => void;
}

const getPlayerColor = (player: string): string => {
  return player === 'player1' ? '#3b82f6' : '#ef4444';
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    economy: '#10b981',
    military: '#ef4444',
    tech: '#a855f7',
    scouting: '#0ea5e9',
    strategy: '#f59e0b',
    idle: '#9ca3af',
  };
  return colors[category] || '#6b7280';
};

const formatGameTime = (tick: number): string => {
  const seconds = Math.floor(tick / 30); // Assuming 30 ticks per second
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const DecisionEntry: React.FC<DecisionEntryProps> = ({ entry, onClick }) => {
  const playerColor = getPlayerColor(entry.player);
  const categoryColor = getCategoryColor(entry.category);

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        onClick={() => onClick?.(entry.tick)}
        style={{
          padding: '0.625rem 0.875rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background-color 0.15s ease, border-left-color 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          minHeight: '3.25rem',
          borderLeft: '3px solid transparent',
          animation: 'fadeInDown 0.25s ease-out',
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderLeftColor = '#3b82f6';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.borderLeftColor = 'transparent';
        }}
      >
      {/* Player indicator */}
      <div
        style={{
          width: '0.5rem',
          height: '3rem',
          backgroundColor: playerColor,
          borderRadius: '0.25rem',
          flexShrink: 0,
        }}
      />

      {/* Game time */}
      <div
        style={{
          minWidth: '3.25rem',
          fontWeight: '700',
          color: '#374151',
          fontSize: '0.8125rem',
          letterSpacing: '0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatGameTime(entry.tick)}
      </div>

      {/* Summary (main content) */}
      <div
        style={{
          flex: 1,
          fontWeight: '600',
          color: '#1f2937',
          fontSize: '0.9375rem',
          lineHeight: '1.4',
        }}
      >
        {entry.summary}
      </div>

      {/* Category badge */}
      <div
        style={{
          padding: '0.375rem 0.625rem',
          backgroundColor: categoryColor + '15',
          color: categoryColor,
          borderRadius: '0.375rem',
          fontSize: '0.7rem',
          fontWeight: '600',
          flexShrink: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          border: `1px solid ${categoryColor}30`,
        }}
      >
        {entry.category}
      </div>

      {/* Confidence percentage */}
      <div
        style={{
          minWidth: '2.75rem',
          textAlign: 'right',
          color: '#6b7280',
          fontSize: '0.8125rem',
          fontWeight: '500',
          opacity: 0.7 + entry.confidence * 0.3,
        }}
      >
        {Math.round(entry.confidence * 100)}%
      </div>

      {/* Major indicator */}
      {entry.isMajor && (
        <div
          style={{
            fontSize: '1rem',
            flexShrink: 0,
          }}
        >
          ✨
        </div>
      )}
      </div>
    </>
  );
};
