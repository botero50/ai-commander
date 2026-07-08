import React from 'react';

interface ProgressTrackerProps {
  completed: number;
  total: number;
  format: 'round-robin' | 'single-elimination' | 'double-elimination' | 'swiss';
}

const getFormatDescription = (format: string): string => {
  const descriptions: Record<string, string> = {
    'round-robin': 'Each player plays every other player',
    'single-elimination': 'Single loss eliminates player',
    'double-elimination': 'Losers bracket allows second chance',
    'swiss': 'Skill-based pairing system',
  };
  return descriptions[format] || format;
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ completed, total, format }) => {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const remaining = total - completed;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Progress Bar */}
      <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>Progress</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
              {completed} / {total} matches
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: progress < 50 ? '#f59e0b' : progress < 100 ? '#10b981' : '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Completed
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10b981', marginTop: '0.25rem' }}>
              {completed}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Remaining
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b', marginTop: '0.25rem' }}>
              {remaining}
            </div>
          </div>
        </div>
      </div>

      {/* Format Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Tournament Format
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.375rem',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#0c4a6e',
            }}
          >
            🏆
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
              {format.replace('-', ' ')}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {getFormatDescription(format)}
            </div>
          </div>
        </div>

        <div style={{ padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#0c4a6e', borderLeft: '3px solid #3b82f6' }}>
          <strong>{progress.toFixed(0)}%</strong> of tournament complete
        </div>
      </div>
    </div>
  );
};
