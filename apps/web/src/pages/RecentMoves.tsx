import React, { useMemo, useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import '../styles/overlay.css';

export const RecentMoves: React.FC = () => {
  const { messages, isConnected } = useWebSocket('ws://localhost:9000');
  const [allTimesMoves, setAllTimesMoves] = useState<any[]>([]);

  // Reset on new game start
  useEffect(() => {
    const gameStartEvent = messages.find((m) => m.type === 'GameStarted');
    if (gameStartEvent) {
      setAllTimesMoves([]);
    }
  }, [messages]);

  const recentMovesList = useMemo(() => {
    const seen = new Set<string>();
    const moves = [];

    // Get all moves from all messages (not just current game)
    for (const m of messages.filter((e) => e.type === 'MovePlayed')) {
      const key = `${m.moveNumber}-${m.move}-${m.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        moves.push(m);
      }
    }

    return moves;
  }, [messages]);

  // Persist moves - keep accumulating them
  useEffect(() => {
    if (recentMovesList.length > 0) {
      setAllTimesMoves((prev) => {
        const combined = [...prev, ...recentMovesList];
        // Deduplicate based on moveNumber and move
        const seen = new Set<string>();
        const deduped = combined.filter((m) => {
          const key = `${m.moveNumber}-${m.move}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return deduped;
      });
    }
  }, [recentMovesList]);

  return (
    <div className="recent-moves-page">
      {/* Moves Container */}
      <div className="moves-container">
        <h2 className="moves-title">Recent Moves ({allTimesMoves.length})</h2>
        <div className="moves-list-full">
          {/* Sort moves in ascending order by moveNumber */}
          {allTimesMoves
            .slice(-33)
            .sort((a, b) => a.moveNumber - b.moveNumber)
            .map((event, idx) => (
              <div key={`${event.moveNumber}-${event.move}-${idx}`} className="move-item-full">
                <span className="move-number">{event.moveNumber}.</span>
                <span className="move-text">{event.san || event.move}</span>
                <span className="move-player">({event.brainName || event.player})</span>

                {/* Analysis Time */}
                {event.latencyMs > 0 && (
                  <span className="move-latency">
                    {(event.latencyMs / 1000).toFixed(1)}s
                  </span>
                )}

                {/* Confidence Score */}
                {event.confidence > 0 && (
                  <span className="move-confidence">
                    {Math.round(event.confidence * 100)}%
                  </span>
                )}

                {/* Position Description - Only show if explicitly provided */}
                {event.description && event.description.trim() !== '' && (
                  <span className="move-description">
                    {event.description}
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default RecentMoves;
