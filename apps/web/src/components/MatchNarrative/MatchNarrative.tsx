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
        padding: '1.5rem',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
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
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.875rem',
          color: '#6b7280',
          display: 'flex',
          gap: '2rem',
        }}
      >
        <span>📊 {narrative.length} narrative segments</span>
        <span>
          ⏱️ {Math.round(matchResult.duration / 1000)} seconds
        </span>
        <span>
          💬 {matchResult.player1Commands + matchResult.player2Commands}{' '}
          total commands
        </span>
      </div>
    </div>
  );
};
