import React, { useState } from 'react';
import { MatchViewer } from '@/components/MatchViewer/MatchViewer';
import { DecisionTimeline } from '@/components/DecisionTimeline/DecisionTimeline';
import { ReplayControls } from '@/components/ReplayControls/ReplayControls';
import { TournamentDashboard } from '@/components/TournamentDashboard/TournamentDashboard';
import { useDecisionPlayback } from '@/hooks/useDecisionPlayback';
import type { DecisionEvent, TournamentState } from '@/types';

type ViewType = 'match' | 'tournament' | 'replays';

// Mock data for demonstration
const mockDecisions: DecisionEvent[] = [
  {
    tick: 100,
    timestamp: Date.now(),
    player: 'player1',
    brainName: 'Ollama',
    reasoning: 'Scouting reveals enemy expansion',
    commands: ['scout', 'move'],
    commandCount: 2,
    durationMs: 245,
  },
  {
    tick: 101,
    timestamp: Date.now() + 1000,
    player: 'player2',
    brainName: 'Claude',
    reasoning: 'Building economic infrastructure',
    commands: ['build_worker', 'gather'],
    commandCount: 2,
    durationMs: 187,
  },
  {
    tick: 102,
    timestamp: Date.now() + 2000,
    player: 'player1',
    brainName: 'Ollama',
    reasoning: 'Responding to threat with military units',
    commands: ['train_unit', 'attack'],
    commandCount: 2,
    durationMs: 312,
  },
];

// Mock tournament data
const mockTournamentState: TournamentState = {
  format: 'round-robin',
  totalMatches: 12,
  completedMatches: 9,
  standings: [
    {
      rank: 1,
      brainName: 'Claude',
      rating: 1650,
      wins: 7,
      losses: 1,
      winRate: 0.875,
      trend: 'up',
      recentResults: ['W', 'W', 'W', 'L', 'W'],
    },
    {
      rank: 2,
      brainName: 'Ollama',
      rating: 1580,
      wins: 5,
      losses: 3,
      winRate: 0.625,
      trend: 'stable',
      recentResults: ['W', 'W', 'L', 'W', 'L'],
    },
    {
      rank: 3,
      brainName: 'GPT-4',
      rating: 1520,
      wins: 3,
      losses: 5,
      winRate: 0.375,
      trend: 'down',
      recentResults: ['L', 'W', 'L', 'L', 'W'],
    },
  ],
  recentMatches: [
    {
      id: 'match-001',
      player1: 'Claude',
      player2: 'Ollama',
      winner: 'Claude',
      completedAt: Date.now() - 3600000,
      duration: 45000,
      player1Commands: 156,
      player2Commands: 143,
    },
    {
      id: 'match-002',
      player1: 'Claude',
      player2: 'GPT-4',
      winner: 'Claude',
      completedAt: Date.now() - 7200000,
      duration: 52000,
      player1Commands: 178,
      player2Commands: 151,
    },
    {
      id: 'match-003',
      player1: 'Ollama',
      player2: 'GPT-4',
      winner: 'Ollama',
      completedAt: Date.now() - 10800000,
      duration: 48000,
      player1Commands: 165,
      player2Commands: 138,
    },
  ],
};

export const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('match');
  const [wsUrl, setWsUrl] = useState('ws://localhost:3000/ws');
  const [isCustomUrl, setIsCustomUrl] = useState(false);
  const playback = useDecisionPlayback(mockDecisions, 10000);

  const navStyle = {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  };

  const buttonStyle = (active: boolean) => ({
    padding: '0.5rem 1rem',
    backgroundColor: active ? '#3b82f6' : '#f3f4f6',
    color: active ? '#fff' : '#1f2937',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  });

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <header style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={containerStyle}>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '2rem', fontWeight: '700' }}>
            AI Commander Tournament Viewer
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Real-time visualization of AI matches and tournaments
          </p>
        </div>
      </header>

      <nav style={navStyle}>
        <div style={containerStyle as React.CSSProperties & { display: 'flex', gap: '1rem' }}>
          <button onClick={() => setView('match')} style={buttonStyle(view === 'match') as React.CSSProperties}>
            Match Viewer
          </button>
          <button onClick={() => setView('tournament')} style={buttonStyle(view === 'tournament') as React.CSSProperties}>
            Tournament Dashboard
          </button>
          <button onClick={() => setView('replays')} style={buttonStyle(view === 'replays') as React.CSSProperties}>
            Replay Browser
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isCustomUrl && (
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:3000/ws"
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            )}
            <button
              onClick={() => setIsCustomUrl(!isCustomUrl)}
              style={Object.assign({}, buttonStyle(isCustomUrl), { fontSize: '0.75rem' }) as React.CSSProperties}
            >
              {isCustomUrl ? 'Done' : 'URL'}
            </button>
          </div>
        </div>
      </nav>

      <main style={containerStyle}>
        {view === 'match' && (
          <div>
            <MatchViewer wsUrl={wsUrl} />
            <div style={{ marginTop: '2rem' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Replay Controls</h2>
              <ReplayControls
                state={playback.state}
                currentTick={playback.currentTick}
                maxTick={playback.maxTick}
                speed={playback.speed}
                onPlay={playback.play}
                onPause={playback.pause}
                onStop={playback.stop}
                onSeek={playback.seek}
                onNextFrame={playback.nextFrame}
                onPreviousFrame={playback.previousFrame}
                onSpeedChange={playback.changeSpeed}
              />
            </div>
            <div style={{ marginTop: '2rem' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Decision Timeline</h2>
              <DecisionTimeline decisions={mockDecisions} highlightedTick={playback.currentTick} />
            </div>
          </div>
        )}
        {view === 'tournament' && (
          <TournamentDashboard state={mockTournamentState} />
        )}
        {view === 'replays' && (
          <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '0.5rem', textAlign: 'center', color: '#6b7280' }}>
            Replay Browser - Coming Soon (Story 15.3)
          </div>
        )}
      </main>
    </div>
  );
};
