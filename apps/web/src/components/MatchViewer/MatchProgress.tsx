import React from 'react';
import type { MatchViewState } from '@ai-commander/zeroad-adapter';

interface MatchProgressProps {
  state: MatchViewState;
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

export const MatchProgress: React.FC<MatchProgressProps> = ({ state }) => {
  const progress = (state.currentTick / state.totalTicks) * 100;

  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Tick {state.currentTick.toLocaleString()} / {state.totalTicks.toLocaleString()}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {formatDuration(state.duration)}
        </span>
      </div>

      <div style={{ position: 'relative', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: '#3b82f6',
            transition: 'width 0.1s ease-out',
          }}
        />
      </div>

      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
        Progress: {Math.round(progress)}%
      </div>
    </div>
  );
};
