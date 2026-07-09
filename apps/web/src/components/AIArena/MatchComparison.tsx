import React from 'react';

interface MatchStats {
  economy: number[];
  military: number[];
  expansion: number;
  technology: number;
  duration: number;
}

interface MatchComparisonProps {
  match1Title: string;
  match1Stats: MatchStats;
  match2Title: string;
  match2Stats: MatchStats;
}

export function MatchComparison({ match1Title, match1Stats, match2Title, match2Stats }: MatchComparisonProps) {
  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '2rem',
        backgroundColor: '#0a0a0a',
        color: '#fff',
      }}
    >
      <h1 style={{ marginTop: 0 }}>Match Comparison</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Match 1 */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #333',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '16px' }}>{match1Title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Economy</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {match1Stats.economy[match1Stats.economy.length - 1]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Military</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {match1Stats.military[match1Stats.military.length - 1]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Expansion</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{match1Stats.expansion}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Technology</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{match1Stats.technology}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Duration</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {Math.floor(match1Stats.duration / 60)}m {match1Stats.duration % 60}s
              </div>
            </div>
          </div>
        </div>

        {/* Match 2 */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #333',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '16px' }}>{match2Title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Economy</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {match2Stats.economy[match2Stats.economy.length - 1]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Military</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {match2Stats.military[match2Stats.military.length - 1]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Expansion</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{match2Stats.expansion}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Technology</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{match2Stats.technology}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.25rem' }}>Duration</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {Math.floor(match2Stats.duration / 60)}m {match2Stats.duration % 60}s
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
