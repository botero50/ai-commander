import React from 'react';
import { useMatchNarrative } from '@/hooks/useMatchNarrative';
import { NarrativeEntry } from './NarrativeEntry';
import type { TournamentMatchResult } from '@ai-commander/zeroad-adapter';

interface MatchNarrativeProps {
  matchResult: TournamentMatchResult | null;
}

export const MatchNarrative: React.FC<MatchNarrativeProps> = ({
  matchResult,
}) => {
  const narrative = useMatchNarrative(matchResult);

  if (!matchResult) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
          fontStyle: 'italic',
        }}
      >
        No match data available
      </div>
    );
  }

  if (narrative.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
          fontStyle: 'italic',
        }}
      >
        Unable to generate narrative
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '1.75rem',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: '1.3125rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          lineHeight: '1.3',
        }}
      >
        📖 Match Narrative
      </div>

      {/* Narrative Timeline */}
      <div>
        {narrative.map((entry, idx) => (
          <NarrativeEntry key={idx} entry={entry} />
        ))}
      </div>

      {/* Footer Stats */}
      <div
        style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.8125rem',
          color: '#6b7280',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2.5rem',
          fontWeight: '500',
        }}
      >
        <span title="Number of narrative segments">
          📊 {narrative.length} segments
        </span>
        <span title="Total match duration">
          ⏱️ {Math.round(matchResult.duration / 1000)}s
        </span>
        <span title="Combined command count">
          💬 {matchResult.player1Commands + matchResult.player2Commands} commands
        </span>
      </div>
    </div>
  );
};
