import React from 'react';
import type { CommentaryEntry } from '@ai-commander/zeroad-adapter';

interface CommentaryEntryProps {
  entry: CommentaryEntry;
  onClick?: (tick: number) => void;
}

const formatGameTime = (tick: number): string => {
  const seconds = Math.floor(tick / 30); // Assuming 30 ticks per second
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getTypeColor = (type: 'event' | 'status'): string => {
  return type === 'event' ? '#f59e0b' : '#3b82f6'; // gold for events, blue for status
};

const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'dramatic_moment':
      return '⚔️';
    case 'resource_analysis':
      return '📊';
    case 'military_analysis':
      return '🛡️';
    case 'status':
      return '📢';
    default:
      return '•';
  }
};

export const CommentaryEntry: React.FC<CommentaryEntryProps> = ({
  entry,
  onClick,
}) => {
  const typeColor = getTypeColor(entry.type);
  const confidenceOpacity = 0.6 + entry.confidence * 0.4; // 0.6 to 1.0

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
          borderLeft: `3px solid ${typeColor}`,
          animation: 'fadeInDown 0.25s ease-out',
        }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = '#f3f4f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#fff';
      }}
    >
      {/* Source indicator */}
      <div
        style={{
          fontSize: '1.125rem',
          flexShrink: 0,
          opacity: confidenceOpacity,
          lineHeight: '1',
        }}
      >
        {getSourceLabel(entry.source)}
      </div>

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

      {/* Main comment text */}
      <div
        style={{
          flex: 1,
          color: '#1f2937',
          fontSize: '0.9375rem',
          lineHeight: '1.4',
          opacity: confidenceOpacity,
        }}
      >
        {entry.text}
      </div>

      {/* Type badge */}
      <div
        style={{
          padding: '0.375rem 0.625rem',
          backgroundColor: typeColor + '15',
          color: typeColor,
          borderRadius: '0.375rem',
          fontSize: '0.7rem',
          fontWeight: '600',
          flexShrink: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          border: `1px solid ${typeColor}30`,
        }}
      >
        {entry.type}
      </div>

      {/* Severity indicator for events */}
      {entry.momentSeverity !== undefined && (
        <div
          style={{
            minWidth: '2.25rem',
            textAlign: 'right',
            color: '#6b7280',
            fontSize: '0.8125rem',
            fontWeight: '600',
          }}
        >
          {entry.momentSeverity}%
        </div>
      )}
      </div>
    </>
  );
};
