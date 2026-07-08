import React from 'react';
import type { MatchViewState } from '@ai-commander/zeroad-adapter';

interface MatchHeaderProps {
  state: MatchViewState;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({ state }) => {
  const statusColor = {
    starting: '#fbbf24',
    running: '#10b981',
    completed: '#3b82f6',
    error: '#ef4444',
  }[state.status];

  return (
    <div style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
            {state.brain1} vs {state.brain2}
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>Match ID: {state.matchId}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: statusColor + '20',
              border: `2px solid ${statusColor}`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                backgroundColor: statusColor,
                marginRight: '0.5rem',
              }}
            />
            <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{state.status}</span>
          </div>
          {state.winner && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#059669', fontWeight: '600' }}>
              Winner: {state.winner}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
