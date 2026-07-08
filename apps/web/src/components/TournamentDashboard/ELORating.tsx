import React from 'react';
import type { PlayerStanding } from '@/types';

interface ELORatingProps {
  standings: readonly PlayerStanding[];
}

export const ELORating: React.FC<ELORatingProps> = ({ standings }) => {
  if (standings.length === 0) {
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        No rating data available
      </div>
    );
  }

  const minRating = Math.min(...standings.map(s => s.rating));
  const maxRating = Math.max(...standings.map(s => s.rating));
  const ratingRange = maxRating - minRating || 1;

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {standings.map((standing) => {
          const normalizedRating = ((standing.rating - minRating) / ratingRange) * 100;
          const color = normalizedRating > 66 ? '#10b981' : normalizedRating > 33 ? '#f59e0b' : '#ef4444';

          return (
            <div key={standing.brainName}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                  {standing.brainName}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color }}>
                  {standing.rating}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${normalizedRating}%`,
                    backgroundColor: color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', borderLeft: '3px solid #3b82f6' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
          <div>
            <span style={{ fontWeight: '600' }}>Highest:</span> {maxRating} ({standings.find(s => s.rating === maxRating)?.brainName})
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>Lowest:</span> {minRating} ({standings.find(s => s.rating === minRating)?.brainName})
          </div>
        </div>
      </div>
    </div>
  );
};
