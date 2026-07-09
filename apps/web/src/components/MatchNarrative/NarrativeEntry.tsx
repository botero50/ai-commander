import React from 'react';
import type { NarrativeEntry } from '@ai-commander/zeroad-adapter';

interface NarrativeEntryProps {
  entry: NarrativeEntry;
}

const getPhaseColor = (phase: string): { bg: string; border: string; text: string } => {
  switch (phase) {
    case 'opening':
      return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }; // Blue
    case 'early':
      return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }; // Amber
    case 'mid':
      return { bg: '#fef08a', border: '#eab308', text: '#713f12' }; // Yellow
    case 'turning_point':
      return { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' }; // Red
    case 'late':
      return { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' }; // Dark red
    case 'conclusion':
      return { bg: '#dcfce7', border: '#16a34a', text: '#15803d' }; // Green
    default:
      return { bg: '#f3f4f6', border: '#6b7280', text: '#374151' }; // Gray
  }
};

const getPhaseIcon = (phase: string): string => {
  switch (phase) {
    case 'opening':
      return '🎮'; // Game start
    case 'early':
      return '⚡'; // Early action
    case 'mid':
      return '⚔️'; // Mid-game combat
    case 'turning_point':
      return '🔥'; // Dramatic moment
    case 'late':
      return '👑'; // Dominance
    case 'conclusion':
      return '🏆'; // Victory
    default:
      return '📝';
  }
};

const formatPhaseLabel = (phase: string): string => {
  return phase
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const NarrativeEntry: React.FC<NarrativeEntryProps> = ({ entry }) => {
  const colors = getPhaseColor(entry.phase);
  const icon = getPhaseIcon(entry.phase);
  const phaseLabel = formatPhaseLabel(entry.phase);
  const confidencePercent = Math.round(entry.confidence * 100);

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div
        style={{
          padding: '1.125rem 1rem',
          marginBottom: '0.875rem',
          backgroundColor: colors.bg,
          borderLeft: `4px solid ${colors.border}`,
          borderRadius: '0.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default',
          animation: 'slideInLeft 0.3s ease-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(3px)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
      {/* Phase Icon */}
      <div
        style={{
          fontSize: '1.75rem',
          flexShrink: 0,
          marginTop: '0.0625rem',
          lineHeight: '1',
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Phase Label */}
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.375rem',
          }}
        >
          {phaseLabel}
        </div>

        {/* Narrative Text */}
        <div
          style={{
            fontSize: '0.96875rem',
            color: '#1f2937',
            lineHeight: '1.5',
            marginBottom: '0.625rem',
            fontWeight: '500',
          }}
        >
          {entry.text}
        </div>

        {/* Metadata Footer */}
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            fontSize: '0.8125rem',
            color: '#6b7280',
            fontWeight: '500',
          }}
        >
          {/* Confidence */}
          <span title="How certain this narrative segment is">
            {confidencePercent}% confidence
          </span>

          {/* Key Moment Indicator */}
          {entry.isKeyMoment && (
            <span
              style={{
                color: colors.border,
                fontWeight: '700',
                letterSpacing: '0.02em',
              }}
            >
              ★ KEY MOMENT
            </span>
          )}

          {/* Player(s) Involved */}
          {entry.player !== 'both' && (
            <span>
              {entry.player === 'player1' ? '🔵 Blue' : '🔴 Red'}
            </span>
          )}
        </div>
      </div>
      </div>
    </>
  );
};
