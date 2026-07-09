import React, { useRef, useEffect, useState } from 'react';
import { useDecisionTimeline } from '@/hooks/useDecisionTimeline';
import type { GameSession } from '@/types';
import { DecisionEntry } from './DecisionEntry';
import { DecisionFilterPanel } from './DecisionFilter';

interface DecisionTimelineProps {
  gameSession: GameSession | null;
  onSeekToTick?: (tick: number) => void;
}

export const DecisionTimeline: React.FC<DecisionTimelineProps> = ({ gameSession, onSeekToTick }) => {
  const { filteredEntries, filter, setPlayerFilter, isLoading, counts } = useDecisionTimeline(gameSession);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastEntryRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Intersection Observer for smart auto-scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolledToBottom(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (lastEntryRef.current) {
      observer.observe(lastEntryRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom when new entries arrive and user is at bottom
  useEffect(() => {
    if (isScrolledToBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredEntries, isScrolledToBottom]);

  const handleEntryClick = (tick: number) => {
    onSeekToTick?.(tick);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading timeline...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Title */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontWeight: '700', fontSize: '0.9375rem', color: '#1f2937', lineHeight: '1.4', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        📊 Live Decisions
      </div>

      {/* Filter Tabs */}
      <DecisionFilterPanel filter={filter} counts={counts} onPlayerFilter={setPlayerFilter} />

      {/* Timeline Container */}
      {filteredEntries.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for decisions...
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {filteredEntries.map((entry, idx) => (
            <div
              key={`${entry.tick}-${entry.player}`}
              ref={idx === filteredEntries.length - 1 ? lastEntryRef : undefined}
            >
              <DecisionEntry entry={entry} onClick={handleEntryClick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
