import React from 'react';
import type { HUDPlayer } from '@ai-commander/zeroad-adapter';
import { ResourceIcon } from './ResourceIcon';
import { PopulationBar } from './PopulationBar';

interface PlayerHUDProps {
  player: HUDPlayer;
  isPlayer1?: boolean;
  isPlayer2?: boolean;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({ player, isPlayer1, isPlayer2 }) => {
  const playerColor = isPlayer1 ? '#3b82f6' : '#ef4444'; // Blue for P1, Red for P2
  const bgColor = isPlayer1 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(239, 68, 68, 0.05)';
  const borderColor = isPlayer1 ? '#3b82f6' : '#ef4444';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Player Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: '0.75rem',
          marginBottom: '0.25rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: playerColor,
            }}
          >
            {player.name}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {player.civ}
          </div>
        </div>
      </div>

      {/* Resources Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem',
          fontSize: '0.875rem',
        }}
      >
        <ResourceIcon label="Food" value={player.food} emoji="🍖" color="#10b981" />
        <ResourceIcon label="Wood" value={player.wood} emoji="🌲" color="#8b5a2b" />
        <ResourceIcon label="Stone" value={player.stone} emoji="🪨" color="#9ca3af" />
        <ResourceIcon label="Metal" value={player.metal} emoji="⛏️" color="#60a5fa" />
      </div>

      {/* Military & Workers Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          fontSize: '0.875rem',
          paddingTop: '0.5rem',
          borderTop: `1px solid ${borderColor}30`,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
            Workers
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>
            {player.workerCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
            Military
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>
            {player.militaryCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
            Army Value
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fbbf24' }}>
            {player.armyValue}
          </div>
        </div>
      </div>

      {/* Technology Count Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0.5rem',
          fontSize: '0.875rem',
          paddingTop: '0.5rem',
          borderTop: `1px solid ${borderColor}30`,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
            Technologies
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#60a5fa' }}>
            {player.technologyCount} buildings
          </div>
        </div>
      </div>

      {/* Population Bar */}
      <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${borderColor}30` }}>
        <PopulationBar
          current={player.populationCurrent}
          max={player.populationMax}
          playerColor={playerColor}
        />
      </div>
    </div>
  );
};
