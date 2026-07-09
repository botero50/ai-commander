import React from 'react';
import type { EventAnnotations as EventAnnotationsService } from '@ai-commander/zeroad-adapter';
import { useEventAnnotations } from '../../hooks/useEventAnnotations';
import { EventBadge } from './EventBadge';

interface EventAnnotationsProps {
  annotations: EventAnnotationsService | null;
}

export function EventAnnotations({ annotations }: EventAnnotationsProps) {
  const { annotationState, isLoading } = useEventAnnotations(annotations);

  if (isLoading || !annotationState) {
    return (
      <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
        Waiting for events...
      </div>
    );
  }

  const recent = annotationState.recentEvents;
  const p1Count = annotationState.eventCountPerPlayer.player1;
  const p2Count = annotationState.eventCountPerPlayer.player2;

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
        EVENT ANNOTATIONS ({annotationState.events.length} total)
      </div>

      {/* Event counts */}
      <div
        style={{
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}
      >
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ color: '#888' }}>Player 1</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#3b82f6' }}>
            {p1Count} event{p1Count !== 1 ? 's' : ''}
          </div>
        </div>
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ color: '#888' }}>Player 2</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ef4444' }}>
            {p2Count} event{p2Count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Recent events timeline */}
      <div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', fontWeight: 500 }}>
          RECENT EVENTS
        </div>

        {recent.length === 0 ? (
          <div style={{ fontSize: '0.875rem', color: '#666' }}>No events yet</div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '250px',
              overflowY: 'auto',
            }}
          >
            {recent.map((event) => (
              <EventBadge key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
