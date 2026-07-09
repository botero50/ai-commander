import React from 'react';
import type { AIStatusService } from '@ai-commander/zeroad-adapter';
import { useAIStatus } from '../../hooks/useAIStatus';
import { PlayerAIStatus } from './PlayerAIStatus';

interface AIStatusProps {
  aiStatusService: AIStatusService | null;
}

export function AIStatus({ aiStatusService }: AIStatusProps) {
  const { statusState, isLoading } = useAIStatus(aiStatusService);

  if (isLoading || !statusState) {
    return (
      <div style={{ padding: '1rem', color: '#888' }}>
        Waiting for AI status...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid #333',
        borderBottom: '1px solid #333',
      }}
    >
      <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#888' }}>
        LIVE AI STATUS (Tick {statusState.tick})
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <PlayerAIStatus status={statusState.players[0]} isPlayer1={true} />
        <PlayerAIStatus status={statusState.players[1]} isPlayer1={false} />
      </div>
    </div>
  );
}
