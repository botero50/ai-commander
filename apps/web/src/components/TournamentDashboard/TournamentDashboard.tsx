import React from 'react';
import { TournamentStandings } from './TournamentStandings';
import { ProgressTracker } from './ProgressTracker';
import { RecentMatches } from './RecentMatches';
import { ELORating } from './ELORating';
import type { TournamentState, PlayerStanding, Match } from '@/types';

interface TournamentDashboardProps {
  state: TournamentState;
}

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({ state }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Left column */}
      <div>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Standings</h2>
        <TournamentStandings standings={state.standings} />
      </div>

      {/* Right column */}
      <div>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Progress & Format</h2>
        <ProgressTracker
          completed={state.completedMatches}
          total={state.totalMatches}
          format={state.format}
        />
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>ELO Rating Distribution</h3>
          <ELORating standings={state.standings} />
        </div>
      </div>

      {/* Full width recent matches */}
      <div style={{ gridColumn: '1 / -1' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Recent Matches</h2>
        <RecentMatches matches={state.recentMatches} />
      </div>
    </div>
  );
};
