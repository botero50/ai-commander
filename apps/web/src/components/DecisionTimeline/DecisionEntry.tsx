import React from 'react';
import type { DecisionEvent } from '@/types';

interface DecisionEntryProps {
  decision: DecisionEvent;
  isHighlighted?: boolean;
}

const getPlayerColor = (player: string): string => {
  return player === 'player1' ? '#3b82f6' : '#ef4444';
};

const getPlayerLabel = (player: string): string => {
  return player === 'player1' ? 'Player 1' : 'Player 2';
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const DecisionEntry: React.FC<DecisionEntryProps> = ({ decision, isHighlighted }) => {
  const playerColor = getPlayerColor(decision.player);
  const playerLabel = getPlayerLabel(decision.player);

  return (
    <div
      style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: isHighlighted ? '#fef3c7' : '#fff',
        transition: 'background-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2rem',
              height: '2rem',
              borderRadius: '0.375rem',
              backgroundColor: playerColor + '20',
              border: `2px solid ${playerColor}`,
              fontWeight: '600',
              color: playerColor,
              fontSize: '0.75rem',
            }}
          >
            P{decision.player === 'player1' ? '1' : '2'}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#1f2937' }}>Tick {decision.tick}</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {decision.brainName} • {formatDuration(decision.durationMs)} • {decision.commandCount} command
              {decision.commandCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
          }}
        >
          {new Date(decision.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {decision.reasoning && (
        <div style={{ marginBottom: '0.75rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Reasoning
          </div>
          <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.5' }}>{decision.reasoning}</div>
        </div>
      )}

      {decision.commands.length > 0 && (
        <div style={{ backgroundColor: '#f0f9ff', padding: '0.75rem', borderRadius: '0.375rem', borderLeft: `3px solid ${playerColor}` }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Commands ({decision.commands.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {decision.commands.map((cmd, idx) => (
              <code
                key={idx}
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#0c4a6e',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              >
                {cmd}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
