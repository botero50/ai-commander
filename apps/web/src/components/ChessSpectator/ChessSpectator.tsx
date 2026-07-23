import React, { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import useWebSocket, { WebSocketMessage } from '../../hooks/useWebSocket';
import './ChessSpectator.css';

export const ChessSpectator: React.FC = () => {
  const { gameState, messages, isConnected, connectionError } = useWebSocket('ws://localhost:9001');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Parse FEN to validate it
  const chess = useMemo(() => {
    try {
      const c = new Chess();
      c.load(gameState.fen);
      return c;
    } catch {
      return new Chess();
    }
  }, [gameState.fen]);

  // Filter messages to show recent moves and commentary
  const recentEvents = useMemo(() => {
    return messages
      .filter((m) => ['MovePlayed', 'CommentaryGenerated', 'GameFinished', 'GameStarted'].includes(m.type))
      .slice(0, 20);
  }, [messages]);

  // Get latest arena statistics (EPIC 73)
  const arenaStats = useMemo(() => {
    const statsMsg = [...messages].reverse().find((m) => m.type === 'ArenaStatisticsUpdated');
    return statsMsg || { totalGames: 0, whiteWins: 0, blackWins: 0, draws: 0, gamesPerHour: 0 };
  }, [messages]);

  // Get latest match restart countdown (EPIC 73)
  const matchRestart = useMemo(() => {
    const restartMsg = [...messages].reverse().find((m) => m.type === 'MatchRestartIn');
    return restartMsg || null;
  }, [messages]);

  // Get health status (EPIC 73)
  const healthStatus = useMemo(() => {
    const healthMsg = [...messages].reverse().find((m) => m.type === 'HealthStatus');
    return healthMsg || { ollama: 'unknown' };
  }, [messages]);

  // Extract captured pieces
  const capturedPieces = useMemo(() => {
    const captured = { white: [] as string[], black: [] as string[] };
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const startChess = new Chess();
    const endChess = new Chess();

    try {
      endChess.load(gameState.fen);

      // Count pieces
      const startPieces = countPieces(startChess.fen());
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
  }, [gameState.fen]);

  const gameDurationSeconds = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;

  return (
    <div className="chess-spectator">
      {/* Connection Status */}
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span>{isConnected ? 'Connected to Arena' : 'Connecting...'}</span>
        {connectionError && <span className="error-message">{connectionError}</span>}
      </div>

      <div className="spectator-container">
        {/* Left: Chess Board */}
        <div className="board-section">
          <div className="board-ribbon">
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
          </div>

          <div className="chessboard-container">
            <Chessboard
              position={gameState.fen}
              onSquareClick={(square) => setSelectedSquare(square)}
              customSquareStyles={{
                [selectedSquare || '']: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
              }}
            />
          </div>
        </div>

        {/* Right: Game Info */}
        <div className="info-section">
          {/* Health Status (EPIC 73) */}
          <div className="health-status">
            <span className={`health-indicator health-${healthStatus.ollama}`}>
              {healthStatus.ollama === 'healthy' ? '🟢' : healthStatus.ollama === 'unhealthy' ? '🔴' : '⚪'}
            </span>
            <span className="health-text">
              {healthStatus.ollama === 'healthy' ? 'Ollama Healthy' : 'Ollama ' + healthStatus.ollama}
            </span>
          </div>

          {/* Match Restart Countdown (EPIC 73) */}
          {matchRestart && (
            <div className="match-restart-countdown">
              <div className="countdown-label">Next match in:</div>
              <div className="countdown-time">{matchRestart.secondsRemaining}s</div>
            </div>
          )}

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

          {/* Arena Statistics (EPIC 73) */}
          <div className="arena-statistics">
            <h4>Arena Stats</h4>
            <div className="stat-row">
              <span className="stat-label">Total Games:</span>
              <span className="stat-value">{arenaStats.totalGames}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">W/B/D:</span>
              <span className="stat-value">
                {arenaStats.whiteWins}/{arenaStats.blackWins}/{arenaStats.draws}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Games/Hour:</span>
              <span className="stat-value">{arenaStats.gamesPerHour?.toFixed(1) || 'N/A'}</span>
            </div>
            {arenaStats.avgMoveCount > 0 && (
              <div className="stat-row">
                <span className="stat-label">Avg Moves:</span>
                <span className="stat-value">{arenaStats.avgMoveCount}</span>
              </div>
            )}
          </div>

          {/* Captured Pieces */}
          {(capturedPieces.white.length > 0 || capturedPieces.black.length > 0) && (
            <div className="captured-pieces">
              <h4>Captured Pieces</h4>
              <div className="captures-row white-captures">
                <span className="capture-label">White:</span>
                <span className="pieces">{capturedPieces.white.join(' ')}</span>
              </div>
              <div className="captures-row black-captures">
                <span className="capture-label">Black:</span>
                <span className="pieces">{capturedPieces.black.join(' ')}</span>
              </div>
            </div>
          )}

          {/* Move History */}
          <div className="move-history">
            <h4>Recent Moves</h4>
            <div className="moves-list">
              {recentEvents
                .filter((e) => e.type === 'MovePlayed')
                .slice(0, 10)
                .map((event, idx) => (
                  <div key={idx} className="move-item">
                    <span className="move-number">{event.moveNumber}.</span>
                    <span className="move-text">{event.move}</span>
                    <span className="move-latency">({event.latencyMs}ms)</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Commentary */}
          <div className="commentary-section">
            <h4>Commentary</h4>
            <div className="commentary-list">
              {recentEvents
                .filter((e) => e.type === 'CommentaryGenerated')
                .slice(0, 5)
                .map((event, idx) => (
                  <div key={idx} className={`commentary-item severity-${event.severity}`}>
                    <span className="event-type">{event.event}</span>
                    <span className="event-text">{event.commentary}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Count pieces in a FEN position
 */
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

export default ChessSpectator;
