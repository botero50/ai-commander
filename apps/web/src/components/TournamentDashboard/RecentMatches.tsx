import React from 'react';
import type { Match } from '@/types';

interface RecentMatchesProps {
  matches: readonly Match[];
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

export const RecentMatches: React.FC<RecentMatchesProps> = ({ matches }) => {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Match
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Winner
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Duration
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Commands
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Completed
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, idx) => (
            <tr
              key={match.id}
              style={{
                borderBottom: idx < matches.length - 1 ? '1px solid #e5e7eb' : 'none',
                backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb',
              }}
            >
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{match.id.slice(0, 8)}</div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                      {match.player1} vs {match.player2}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  {match.winner === match.player1 ? match.player1 : match.player2}
                </div>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                {formatDuration(match.duration)}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <span style={{ color: '#3b82f6', fontWeight: '500' }}>{match.player1Commands}</span>
                  <span>-</span>
                  <span style={{ color: '#ef4444', fontWeight: '500' }}>{match.player2Commands}</span>
                </div>
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                {formatTime(match.completedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {matches.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No matches have been completed yet
        </div>
      )}
    </div>
  );
};
