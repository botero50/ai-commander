import React from 'react';
import type { GameEvent } from '@ai-commander/zeroad-adapter';

interface EventBadgeProps {
  event: GameEvent;
}

export function EventBadge({ event }: EventBadgeProps) {
  const playerColor = event.playerId === 'player1' ? '#3b82f6' : '#ef4444';

  const getSeverityColor = (severity: string): string => {
    if (severity === 'critical') return '#ef4444';
    if (severity === 'major') return '#eab308';
    return '#888';
  };

  const getBgColor = (severity: string): string => {
    if (severity === 'critical') return '#7f1d1d';
    if (severity === 'major') return '#713f12';
    return '#1a1a1a';
  };

  const severityColor = getSeverityColor(event.severity);
  const bgColor = getBgColor(event.severity);

  return (
    <div
      style={{
        display: 'inline-block',
        padding: '0.5rem 0.75rem',
        backgroundColor: bgColor,
        borderLeft: `3px solid ${severityColor}`,
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: '#fff',
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{event.title}</div>
      <div style={{ color: '#aaa', fontSize: '0.7rem' }}>{event.description}</div>
      <div style={{ color: '#888', fontSize: '0.65rem', marginTop: '0.25rem' }}>
        Tick {event.tick} • {event.type}
      </div>
    </div>
  );
}
