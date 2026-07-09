import React from 'react';
import type { NarrativeEntry } from '@ai-commander/zeroad-adapter';

interface NarrativeEntryProps {
  entry: NarrativeEntry;
}

const getPhaseColor = (phase: string): { bg: string; border: string } => {
  switch (phase) {
    case 'opening':
      return { bg: '#eff6ff', border: '#3b82f6' }; // Blue
    case 'early':
      return { bg: '#fef3c7', border: '#f59e0b' }; // Amber
    case 'mid':
      return { bg: '#fef08a', border: '#eab308' }; // Yellow
    case 'turning_point':
      return { bg: '#fee2e2', border: '#ef4444' }; // Red
    case 'late':
      return { bg: '#fecaca', border: '#dc2626' }; // Dark red
    case 'conclusion':
      return { bg: '#dcfce7', border: '#16a34a' }; // Green
    default:
      return { bg: '#f3f4f6', border: '#6b7280' }; // Gray
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
    <div
      style={{
        padding: '1rem',
        marginBottom: '0.75rem',
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        borderRadius: '0.375rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
      }}
    >
      {/* Phase Icon */}
      <div
        style={{
          fontSize: '1.5rem',
          flexShrink: 0,
          marginTop: '0.125rem',
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Phase Label */}
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: colors.border,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.25rem',
          }}
        >
          {phaseLabel}
        </div>

        {/* Narrative Text */}
        <div
          style={{
            fontSize: '0.9375rem',
            color: '#1f2937',
            lineHeight: '1.5',
            marginBottom: '0.5rem',
          }}
        >
          {entry.text}
        </div>

        {/* Metadata Footer */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          {/* Confidence */}
          <span>{confidencePercent}% confidence</span>

          {/* Key Moment Indicator */}
          {entry.isKeyMoment && (
            <span
              style={{
                color: colors.border,
                fontWeight: '600',
              }}
            >
              ★ Key Moment
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
  );
};
