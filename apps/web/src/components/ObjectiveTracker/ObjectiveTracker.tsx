import React from 'react';
import type { ObjectiveTracker as ObjectiveTrackerService } from '@ai-commander/zeroad-adapter';
import { useObjectiveTracker } from '../../hooks/useObjectiveTracker';
import { ObjectiveTimeline } from './ObjectiveTimeline';

interface ObjectiveTrackerProps {
  tracker: ObjectiveTrackerService | null;
}

export function ObjectiveTracker({ tracker }: ObjectiveTrackerProps) {
  const { trackerState, isLoading } = useObjectiveTracker(tracker);

  if (isLoading || !trackerState) {
    return (
      <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
        Waiting for objective data...
      </div>
    );
  }

  const p1History = trackerState.player1History;
  const p2History = trackerState.player2History;

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid #333',
        borderBottom: '1px solid #333',
      }}
    >
      <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#888' }}>
        OBJECTIVE TRACKER (Tick {trackerState.tick})
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Player 1 */}
        <div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#3b82f6',
              marginBottom: '0.5rem',
            }}
          >
            Player 1
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current objective summary */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                borderLeft: '3px solid #3b82f6',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                CURRENT STRATEGY
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>
                {p1History.currentObjective}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                Confidence: {Math.round(p1History.currentConfidence * 100)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {p1History.changeCount} strategy change{p1History.changeCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Timeline */}
            <ObjectiveTimeline changes={p1History.objectiveChanges} isPlayer1={true} />
          </div>
        </div>

        {/* Player 2 */}
        <div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#ef4444',
              marginBottom: '0.5rem',
            }}
          >
            Player 2
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current objective summary */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                borderLeft: '3px solid #ef4444',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                CURRENT STRATEGY
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>
                {p2History.currentObjective}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                Confidence: {Math.round(p2History.currentConfidence * 100)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {p2History.changeCount} strategy change{p2History.changeCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Timeline */}
            <ObjectiveTimeline changes={p2History.objectiveChanges} isPlayer1={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
