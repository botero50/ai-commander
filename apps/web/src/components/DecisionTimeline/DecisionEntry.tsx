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
    <div
      onClick={() => onClick?.(entry.tick)}
      style={{
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minHeight: '3rem',
        ':hover': onClick ? { backgroundColor: '#f9fafb' } : {},
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = '#f9fafb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#fff';
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
          minWidth: '3rem',
          fontWeight: '600',
          color: '#1f2937',
          fontSize: '0.875rem',
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
          fontSize: '0.875rem',
        }}
      >
        {entry.summary}
      </div>

      {/* Category badge */}
      <div
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: categoryColor + '20',
          color: categoryColor,
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: '500',
          flexShrink: 0,
        }}
      >
        {entry.category}
      </div>

      {/* Confidence percentage */}
      <div
        style={{
          minWidth: '2.5rem',
          textAlign: 'right',
          color: '#6b7280',
          fontSize: '0.75rem',
          opacity: 0.6 + entry.confidence * 0.4,
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
  );
};
