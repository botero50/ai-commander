import React, { useRef, useEffect, useState } from 'react';
import { useCommentary } from '@/hooks/useCommentary';
import type { GameSession } from '@/types';
import { CommentaryEntry } from './CommentaryEntry';

interface LiveCommentaryProps {
  gameSession: GameSession | null;
  onSeekToTick?: (tick: number) => void;
}

export const LiveCommentary: React.FC<LiveCommentaryProps> = ({
  gameSession,
  onSeekToTick,
}) => {
  const { entries, isLoading } = useCommentary(gameSession);

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
  }, [entries, isScrolledToBottom]);

  const handleEntryClick = (tick: number) => {
    onSeekToTick?.(tick);
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
        }}
      >
        Loading commentary...
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '700',
          fontSize: '0.9375rem',
          color: '#1f2937',
          lineHeight: '1.4',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
        }}
      >
        📣 Live Commentary
      </div>

      {/* Commentary Container */}
      {entries.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Waiting for action...
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
          {entries.map((entry, idx) => (
            <div
              key={`${entry.tick}-${entry.source}`}
              ref={idx === entries.length - 1 ? lastEntryRef : undefined}
            >
              <CommentaryEntry
                entry={entry}
                onClick={handleEntryClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
