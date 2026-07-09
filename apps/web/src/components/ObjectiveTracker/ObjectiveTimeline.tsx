import React from 'react';
import type { ObjectiveChange } from '@ai-commander/zeroad-adapter';

interface ObjectiveTimelineProps {
  changes: ObjectiveChange[];
  isPlayer1: boolean;
}

export function ObjectiveTimeline({ changes, isPlayer1 }: ObjectiveTimelineProps) {
  const playerColor = isPlayer1 ? '#3b82f6' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 500 }}>
        STRATEGY TIMELINE
      </div>

      <div
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {changes.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: '#666' }}>No strategy changes yet</div>
        ) : (
          changes.map((change, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.5rem',
                backgroundColor: '#1a1a1a',
                borderLeft: `3px solid ${playerColor}`,
                borderRadius: '2px',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ fontWeight: 500 }}>{change.newObjective}</div>
                <div style={{ color: '#888' }}>
                  {Math.round(change.confidence * 100)}%
                </div>
              </div>
              {change.reason && (
                <div style={{ color: '#999', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                  {change.reason}
                </div>
              )}
              <div style={{ color: '#666', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                Tick {change.tick}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
