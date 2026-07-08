import React from 'react';
import type { MatchViewState } from '@ai-commander/zeroad-adapter';

interface MatchStatsProps {
  state: MatchViewState;
}

interface PlayerStatsPanelProps {
  playerName: string;
  commands: number;
  errors: number;
  totalTicks: number;
}

const PlayerStatsPanel: React.FC<PlayerStatsPanelProps> = ({ playerName, commands, errors, totalTicks }) => {
  const commandsPerTick = totalTicks > 0 ? (commands / totalTicks).toFixed(2) : '0.00';
  const errorRate = commands > 0 ? ((errors / commands) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
      <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600' }}>{playerName}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Commands
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>{commands.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {commandsPerTick} per tick
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Errors
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', color: '#ef4444' }}>
            {errors.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {errorRate}% error rate
          </div>
        </div>
      </div>
    </div>
  );
};

export const MatchStats: React.FC<MatchStatsProps> = ({ state }) => {
  const { brain1, brain2, player1Stats, player2Stats, totalTicks } = state;

  return (
    <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <PlayerStatsPanel
        playerName={brain1}
        commands={player1Stats.commands}
        errors={player1Stats.errors}
        totalTicks={totalTicks}
      />
      <PlayerStatsPanel
        playerName={brain2}
        commands={player2Stats.commands}
        errors={player2Stats.errors}
        totalTicks={totalTicks}
      />
    </div>
  );
};
