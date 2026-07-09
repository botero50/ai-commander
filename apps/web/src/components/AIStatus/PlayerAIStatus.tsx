import React from 'react';
import type { AIStatus } from '@ai-commander/zeroad-adapter';
import { LatencyIndicator } from './LatencyIndicator';
import { ConfidenceScore } from './ConfidenceScore';

interface PlayerAIStatusProps {
  status: AIStatus;
  isPlayer1: boolean;
}

export function PlayerAIStatus({ status, isPlayer1 }: PlayerAIStatusProps) {
  const playerColor = isPlayer1 ? '#3b82f6' : '#ef4444'; // blue for P1, red for P2

  return (
    <div
      style={{
        flex: 1,
        padding: '1rem',
        backgroundColor: '#1a1a1a',
        border: `1px solid ${playerColor}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Header: Brain Name and Provider/Model */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#888' }}>
            {isPlayer1 ? 'Player 1' : 'Player 2'}
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: playerColor }}>
            {status.brainName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
            {status.provider} / {status.model}
          </div>
        </div>
      </div>

      {/* Current Action */}
      <div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
          CURRENT ACTION
        </div>
        <div style={{ fontSize: '0.875rem', color: '#fff' }}>
          {status.currentAction}
        </div>
      </div>

      {/* Current Objective */}
      <div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
          OBJECTIVE
        </div>
        <div style={{ fontSize: '0.875rem', color: '#fff' }}>
          {status.currentObjective}
          {status.objectiveConfidence > 0 && (
            <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
              ({Math.round(status.objectiveConfidence * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Stats Row: Latency + Confidence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
            LATENCY
          </div>
          <LatencyIndicator
            latencyMs={status.lastDecisionLatencyMs}
            averageMs={status.averageDecisionLatencyMs}
          />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
            CONFIDENCE
          </div>
          <ConfidenceScore confidence={status.confidence} />
        </div>
      </div>

      {/* Decision Count */}
      <div style={{ fontSize: '0.75rem', color: '#888', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
        {status.decisionCount} decision{status.decisionCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
