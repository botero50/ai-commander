import React from 'react';
import type { MinimapService } from '@ai-commander/zeroad-adapter';
import { useMinimap } from '../../hooks/useMinimap';
import { MinimapCanvas } from './MinimapCanvas';

interface MinimapProps {
  minimapService: MinimapService | null;
  width?: number;
  height?: number;
}

export function Minimap({ minimapService, width = 300, height = 300 }: MinimapProps) {
  const { minimapState, isLoading } = useMinimap(minimapService);

  if (isLoading || !minimapState) {
    return (
      <div
        style={{
          width,
          height,
          backgroundColor: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '0.875rem',
        }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 500 }}>
        MAP OVERVIEW (Tick {minimapState.tick})
      </div>

      <MinimapCanvas state={minimapState} width={width} height={height} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: '#888',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6' }} />
          P1: {minimapState.player1Units.length}U {minimapState.player1Buildings.length}B
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444' }} />
          P2: {minimapState.player2Units.length}U {minimapState.player2Buildings.length}B
        </div>
      </div>
    </div>
  );
}
