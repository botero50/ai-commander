import React from 'react';

interface LiveMatch {
  id: string;
  player1: string;
  player2: string;
  duration: number;
  viewer: string;
}

interface RecentMatch {
  id: string;
  player1: string;
  player2: string;
  winner: string;
  duration: number;
}

interface TopAI {
  rank: number;
  name: string;
  elo: number;
  winRate: number;
}

interface AIArenaHomeProps {
  liveMatch?: LiveMatch;
  recentMatches: RecentMatch[];
  topAI: TopAI[];
  upcomingMatches: Array<{ id: string; player1: string; player2: string; time: string }>;
  latestReplays: Array<{ id: string; title: string; duration: number }>;
}

export function AIArenaHome({
  liveMatch,
  recentMatches,
  topAI,
  upcomingMatches,
  latestReplays,
}: AIArenaHomeProps) {
  return (
    <div
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        backgroundColor: '#0a0a0a',
        color: '#fff',
      }}
    >
      {/* Live Match Section */}
      {liveMatch && (
        <div
          style={{
            gridColumn: '1 / -1',
            backgroundColor: '#1a1a1a',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>
            LIVE NOW
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
            {liveMatch.player1} vs {liveMatch.player2}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
            <div>
              <div style={{ color: '#888', fontSize: '12px' }}>Duration</div>
              <div style={{ fontSize: '18px' }}>
                {Math.floor(liveMatch.duration / 60)}:{(liveMatch.duration % 60)
                  .toString()
                  .padStart(2, '0')}
              </div>
            </div>
            <div>
              <div style={{ color: '#888', fontSize: '12px' }}>Viewers</div>
              <div style={{ fontSize: '18px' }}>{liveMatch.viewer}</div>
            </div>
            <button
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Watch Live
            </button>
          </div>
        </div>
      )}

      {/* Top AI Leaderboard */}
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #333',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '18px' }}>Top AI</h2>
        {topAI.map((ai) => (
          <div
            key={ai.rank}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #333',
            }}
          >
            <div>
              <span style={{ marginRight: '1rem', fontWeight: 'bold' }}>#{ai.rank}</span>
              <span>{ai.name}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {ai.elo} ELO • {(ai.winRate * 100).toFixed(0)}% WR
            </div>
          </div>
        ))}
      </div>

      {/* Recent Matches */}
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #333',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '18px' }}>Recent Matches</h2>
        {recentMatches.map((match) => (
          <div
            key={match.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #333',
            }}
          >
            <div>
              <span style={{ marginRight: '0.5rem' }}>{match.player1}</span>
              <span style={{ color: '#888' }}>vs</span>
              <span style={{ marginLeft: '0.5rem' }}>{match.player2}</span>
            </div>
            <div style={{ fontSize: '12px', color: match.winner === match.player1 ? '#22c55e' : '#ef4444' }}>
              {match.winner} won
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Matches */}
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #333',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '18px' }}>Upcoming</h2>
        {upcomingMatches.map((match) => (
          <div
            key={match.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #333',
            }}
          >
            <div>
              {match.player1} vs {match.player2}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>{match.time}</div>
          </div>
        ))}
      </div>

      {/* Latest Replays */}
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #333',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '18px' }}>Latest Replays</h2>
        {latestReplays.map((replay) => (
          <div
            key={replay.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #333',
            }}
          >
            <div>{replay.title}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{replay.duration}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}
