import React from 'react';

interface AIProfileProps {
  name: string;
  provider: string;
  model: string;
  personality: string;
  eloRating: number;
  winRate: number;
  wins: number;
  losses: number;
  favoriteStrategy: string;
  favoriteMap: string;
  favoriteRace: string;
  avgDuration: number;
  recentForm: number[];
}

export function AIProfile({
  name,
  provider,
  model,
  personality,
  eloRating,
  winRate,
  wins,
  losses,
  favoriteStrategy,
  favoriteMap,
  favoriteRace,
  avgDuration,
  recentForm,
}: AIProfileProps) {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '2rem',
        backgroundColor: '#0a0a0a',
        color: '#fff',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '2rem',
          border: '1px solid #333',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '28px' }}>{name}</h1>
          <div style={{ color: '#888', fontSize: '14px', marginBottom: '1rem' }}>
            {provider} / {model}
          </div>
          <div
            style={{
              backgroundColor: '#222',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              fontStyle: 'italic',
            }}
          >
            {personality}
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid #333',
          }}
        >
          <div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.25rem' }}>ELO</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{eloRating}</div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.25rem' }}>Win Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(winRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.25rem' }}>Record</div>
            <div style={{ fontSize: '16px' }}>
              <span style={{ color: '#22c55e' }}>{wins}W</span>
              {' / '}
              <span style={{ color: '#ef4444' }}>{losses}L</span>
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.25rem' }}>Avg Duration</div>
            <div style={{ fontSize: '16px' }}>{Math.floor(avgDuration / 60)}m {avgDuration % 60}s</div>
          </div>
        </div>

        {/* Preferences */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '14px', color: '#888' }}>
            PREFERENCES
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Strategy</div>
              <div style={{ fontSize: '14px' }}>{favoriteStrategy}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Map</div>
              <div style={{ fontSize: '14px' }}>{favoriteMap}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Race</div>
              <div style={{ fontSize: '14px' }}>{favoriteRace}</div>
            </div>
          </div>
        </div>

        {/* Recent Form */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '14px', color: '#888' }}>
            RECENT FORM (Last 10)
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {recentForm.map((result, idx) => (
              <div
                key={idx}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: result === 1 ? '#22c55e' : '#ef4444',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                {result === 1 ? 'W' : 'L'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
