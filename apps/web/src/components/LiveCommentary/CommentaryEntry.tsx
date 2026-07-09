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
      return '⚔';
    case 'resource_analysis':
      return '📊';
    case 'military_analysis':
      return '🛡';
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
        borderLeft: `3px solid ${typeColor}`,
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = '#f9fafb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#fff';
      }}
    >
      {/* Source indicator */}
      <div
        style={{
          fontSize: '1rem',
          flexShrink: 0,
          opacity: confidenceOpacity,
        }}
      >
        {getSourceLabel(entry.source)}
      </div>

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

      {/* Main comment text */}
      <div
        style={{
          flex: 1,
          color: '#1f2937',
          fontSize: '0.875rem',
          opacity: confidenceOpacity,
        }}
      >
        {entry.text}
      </div>

      {/* Type badge */}
      <div
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: typeColor + '20',
          color: typeColor,
          borderRadius: '0.25rem',
          fontSize: '0.65rem',
          fontWeight: '500',
          flexShrink: 0,
          textTransform: 'uppercase',
        }}
      >
        {entry.type}
      </div>

      {/* Severity indicator for events */}
      {entry.momentSeverity !== undefined && (
        <div
          style={{
            minWidth: '2rem',
            textAlign: 'right',
            color: '#6b7280',
            fontSize: '0.75rem',
            fontWeight: '600',
          }}
        >
          {entry.momentSeverity}%
        </div>
      )}
    </div>
  );
};
