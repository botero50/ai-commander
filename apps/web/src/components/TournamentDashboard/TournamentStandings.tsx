import React from 'react';
import type { PlayerStanding } from '@/types';

interface TournamentStandingsProps {
  standings: readonly PlayerStanding[];
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return '📈';
    case 'down':
      return '📉';
    default:
      return '→';
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return '#10b981';
    case 'down':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

export const TournamentStandings: React.FC<TournamentStandingsProps> = ({ standings }) => {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rank
            </th>
            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Brain
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rating
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              W/L
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Win Rate
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trend
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, idx) => (
            <tr
              key={standing.brainName}
              style={{
                borderBottom: idx < standings.length - 1 ? '1px solid #e5e7eb' : 'none',
                backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb',
              }}
            >
              <td style={{ padding: '1rem', fontWeight: '600', color: '#1f2937' }}>
                {standing.rank}
              </td>
              <td style={{ padding: '1rem', fontWeight: '500', color: '#1f2937' }}>
                {standing.brainName}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '1.125rem', color: '#3b82f6' }}>
                {standing.rating}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                <span style={{ fontWeight: '600', color: '#10b981' }}>{standing.wins}</span>
                {' / '}
                <span style={{ fontWeight: '600', color: '#ef4444' }}>{standing.losses}</span>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', color: '#1f2937' }}>
                {(standing.winRate * 100).toFixed(1)}%
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>{getTrendIcon(standing.trend)}</span>
                  <span style={{ fontSize: '0.875rem', color: getTrendColor(standing.trend), fontWeight: '500' }}>
                    {standing.trend.charAt(0).toUpperCase() + standing.trend.slice(1)}
                  </span>
                </div>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                  {standing.recentResults.map((result, i) => (
                    <div
                      key={i}
                      style={{
                        width: '1.5rem',
                        height: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.25rem',
                        backgroundColor: result === 'W' ? '#d1fae5' : '#fee2e2',
                        color: result === 'W' ? '#065f46' : '#7f1d1d',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {standings.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No standings data available
        </div>
      )}
    </div>
  );
};
