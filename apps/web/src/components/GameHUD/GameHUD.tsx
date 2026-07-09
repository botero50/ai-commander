import React from 'react';
import { useGameStateHUD } from '@/hooks/useGameStateHUD';
import type { GameSession } from '@/types';
import { PlayerHUD } from './PlayerHUD';

interface GameHUDProps {
  gameSession: GameSession | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({ gameSession }) => {
  const { hudState, isLoading } = useGameStateHUD(gameSession);

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
        Loading game state...
      </div>
    );
  }

  if (!hudState) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
        Waiting for game data...
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderBottom: '2px solid #3b82f6',
        padding: '1rem 1.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Game Time Header */}
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2rem',
        }}
      >
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#fff',
            letterSpacing: '0.05em',
            fontFamily: 'monospace',
          }}
        >
          ⏱️ {hudState.gameTime}
        </div>
        <div
          style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            letterSpacing: '0.02em',
          }}
        >
          Tick {hudState.tick}
        </div>
      </div>

      {/* Two-Column Player HUD Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          minHeight: '120px',
        }}
      >
        <PlayerHUD player={hudState.players[0]} isPlayer1 />
        <PlayerHUD player={hudState.players[1]} isPlayer2 />
      </div>
    </div>
  );
};
