import React, { useMemo, useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import '../styles/overlay.css';

interface CapturedPieces {
  white: string[];
  black: string[];
}

export const GameInformation: React.FC = () => {
  const { gameState, messages, isConnected } = useWebSocket('ws://localhost:9000');
  const [gameStarted, setGameStarted] = useState(false);
  const [allTimesCommentary, setAllTimesCommentary] = useState<any[]>([]);

  // Reset on new game start
  useEffect(() => {
    const gameStartEvent = messages.find((m) => m.type === 'GameStarted');
    if (gameStartEvent && !gameStarted) {
      setGameStarted(true);
      setAllTimesCommentary([]);
    }
  }, [messages, gameStarted]);

  const capturedPieces = useMemo(() => {
    const captured: CapturedPieces = { white: [], black: [] };

    try {
      const startPieces = countPieces('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const endPieces = countPieces(gameState.fen);

      for (const piece of Object.keys(startPieces)) {
        const color = piece === piece.toUpperCase() ? 'white' : 'black';
        const diff = startPieces[piece] - (endPieces[piece] || 0);
        if (diff > 0) {
          for (let i = 0; i < diff; i++) {
            captured[color].push(piece);
          }
        }
      }
    } catch (error) {
      console.error('Error calculating captured pieces:', error);
    }

    return captured;
  }, [gameState.fen, gameStarted]);

  const gameDurationSeconds = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;

  const recentEvents = useMemo(() => {
    const seen = new Set<string>();
    const deduplicated = [];

    for (const m of messages) {
      if (['MovePlayed', 'CommentaryGenerated', 'GameFinished', 'GameStarted'].includes(m.type)) {
        const key = `${m.type}-${m.moveNumber || ''}-${m.move || ''}-${m.event || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(m);
        }
      }
    }

    return deduplicated.slice(-100);
  }, [messages]);

  // Get all commentary from current session
  const currentCommentaries = useMemo(() => {
    const seen = new Set<string>();
    const commentaries = [];

    for (const m of messages.filter((e) => e.type === 'CommentaryGenerated')) {
      const key = `${m.event}-${m.commentary}-${m.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        commentaries.push(m);
      }
    }

    return commentaries;
  }, [messages]);

  // Persist commentary - keep accumulating it
  useEffect(() => {
    if (currentCommentaries.length > 0) {
      setAllTimesCommentary((prev) => {
        const combined = [...prev, ...currentCommentaries];
        // Deduplicate based on event and commentary
        const seen = new Set<string>();
        const deduped = combined.filter((c) => {
          const key = `${c.event}-${c.commentary}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return deduped;
      });
    }
  }, [currentCommentaries]);

  return (
    <div className="info-section">
      {/* Player Ribbon */}
      <div className="board-ribbon">
        <div className="ribbon-player">
          {gameState.blackPlayer ? (
            <>
              <div className="ribbon-name">Ollama</div>
              <div className="ribbon-details">
                <div className="ribbon-model">{gameState.blackPlayer.model}</div>
                <div className="ribbon-temp">T: {gameState.blackPlayer.temperature?.toFixed(2)}</div>
              </div>
            </>
          ) : (
            <div className="ribbon-name">Waiting...</div>
          )}
        </div>
        <div className="ribbon-player">
          {gameState.whitePlayer ? (
            <>
              <div className="ribbon-name">Ollama</div>
              <div className="ribbon-details">
                <div className="ribbon-model">{gameState.whitePlayer.model}</div>
                <div className="ribbon-temp">T: {gameState.whitePlayer.temperature?.toFixed(2)}</div>
              </div>
            </>
          ) : (
            <div className="ribbon-name">Waiting...</div>
          )}
        </div>
      </div>

      {/* Game Stats */}
      <div className="game-stats">
        <h3>Game {gameState.currentGameNumber}</h3>
        <div className="stat-row">
          <span className="stat-label">Status:</span>
          <span className="stat-value">
            {gameState.isLive ? (
              <span className="live-badge">🔴 LIVE</span>
            ) : gameState.isGameOver ? (
              <span className="finished-badge">✅ FINISHED</span>
            ) : (
              <span className="idle-badge">⏸️ IDLE</span>
            )}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Moves:</span>
          <span className="stat-value">{gameState.moveCount}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Duration:</span>
          <span className="stat-value">{gameDurationSeconds}s</span>
        </div>
      </div>

      {/* Captured Pieces */}
      <div className="captured-pieces">
        <h4>Captured Pieces</h4>
        <div className="captures-row white-captures">
          <span className="capture-label">White:</span>
          <span className="pieces">{capturedPieces.white.length > 0 ? capturedPieces.white.map(p => p.toLowerCase()).join(' ') : '-'}</span>
        </div>
        <div className="captures-row black-captures">
          <span className="capture-label">Black:</span>
          <span className="pieces">{capturedPieces.black.length > 0 ? capturedPieces.black.map(p => p.toLowerCase()).join(' ') : '-'}</span>
        </div>
      </div>


      {/* Recent Commentary */}
      <div className="commentary-section">
        <h4>Commentary ({allTimesCommentary.length})</h4>
        <div className="commentary-list">
          {allTimesCommentary.slice(-5).map((event, idx) => (
            <div key={`${event.event}-${event.commentary}-${idx}`} className={`commentary-item severity-${event.severity}`}>
              <span className="event-type">{event.event}</span>
              <span className="event-text">{event.commentary}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function countPieces(fen: string): Record<string, number> {
  const pieces: Record<string, number> = {};
  const boardPart = fen.split(' ')[0];

  for (const char of boardPart) {
    if (!/[\d/]/.test(char)) {
      pieces[char] = (pieces[char] || 0) + 1;
    }
  }

  return pieces;
}

export default GameInformation;
