import React, { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import useWebSocket from '../hooks/useWebSocket';
import { generatePGN, downloadPGN } from '../services/pgn-exporter';
import '../styles/replay.css';

export const ChessReplay: React.FC = () => {
  const { gameState, messages, isConnected } = useWebSocket('ws://localhost:9000');
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [boardFEN, setBoardFEN] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  const gameMoves = useMemo(() => {
    const moves = messages
      .filter((m) => m.type === 'MovePlayed')
      .map((m) => m.move)
      .filter((move): move is string => !!move);
    console.log('Game moves loaded:', moves.length, 'moves', moves);
    return moves;
  }, [messages]);

  const updateBoardFEN = (moveIndex: number) => {
    try {
      console.log('Updating board to move index:', moveIndex, 'Total moves:', gameMoves.length);
      const chess = new Chess();
      const validMoveIndex = Math.min(moveIndex, gameMoves.length);

      for (let i = 0; i < validMoveIndex; i++) {
        const moveStr = gameMoves[i];
        console.log(`Move ${i}: ${moveStr}`);

        // Get all legal moves
        const legalMoves = chess.moves({ verbose: true });

        // Try to find a matching move
        let moveResult = null;

        // First try direct match with SAN (Standard Algebraic Notation)
        moveResult = chess.move(moveStr);

        if (!moveResult) {
          // Try to find by matching the move string with available moves
          const matched = legalMoves.find(m =>
            m.san === moveStr ||
            `${m.from}${m.to}` === moveStr ||
            m.san.replace(/[+#=]/, '') === moveStr.replace(/[+#=]/, '')
          );

          if (matched) {
            moveResult = chess.move(matched.san);
          }
        }

        if (!moveResult) {
          console.error('Invalid move at index', i, ':', moveStr);
          console.error('Legal moves available:', legalMoves.map(m => m.san));
          break;
        }
      }

      const newFEN = chess.fen();
      console.log('New FEN:', newFEN);
      setBoardFEN(newFEN);
      setCurrentMoveIndex(validMoveIndex);
    } catch (error) {
      console.error('Error updating board:', error);
    }
  };

  const handleExportPGN = () => {
    const pgn = generatePGN(messages);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadPGN(pgn, `chess-game-${timestamp}.pgn`);
  };

  const handleFirst = () => updateBoardFEN(0);
  const handlePrevious = () => updateBoardFEN(Math.max(0, currentMoveIndex - 1));
  const handleNext = () => updateBoardFEN(Math.min(gameMoves.length, currentMoveIndex + 1));
  const handleLast = () => updateBoardFEN(gameMoves.length);

  return (
    <div className="replay-page">
      {/* Connection Status */}
      <div className="replay-status">
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? '#4ade80' : '#ef4444',
          }}
        ></div>
        <span>{isConnected ? 'Connected to Arena' : 'Disconnected'}</span>
      </div>

      {/* Main Container */}
      <div className="replay-container">
        {/* Left: Board */}
        <div className="replay-board-section">
          <div className="replay-board-wrapper">
            <Chessboard position={boardFEN} />
          </div>

          {/* Move Counter */}
          <div className="replay-move-counter">
            Move {currentMoveIndex} of {gameMoves.length}
          </div>

          {/* Controls */}
          <div className="replay-controls">
            <button onClick={handleFirst} className="replay-button">
              ⏮ First
            </button>
            <button onClick={handlePrevious} className="replay-button">
              ◀ Previous
            </button>
            <button onClick={handleNext} className="replay-button">
              Next ▶
            </button>
            <button onClick={handleLast} className="replay-button">
              Last ⏭
            </button>
          </div>

          {/* Export Button */}
          <button onClick={handleExportPGN} className="replay-export-button">
            📥 Export as PGN
          </button>
        </div>

        {/* Right: Move List */}
        <div className="replay-moves-section">
          <h4 className="replay-moves-title">All Moves</h4>
          <div className="replay-moves-grid">
            {gameMoves.map((move, idx) => {
              const moveNumber = Math.floor(idx / 2) + 1;
              const isWhiteMove = idx % 2 === 0;
              const displayText = isWhiteMove ? `${moveNumber}. ${move}` : move;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    console.log('Clicked move index:', idx, 'move:', move);
                    updateBoardFEN(idx + 1);
                  }}
                  className={`replay-move-button ${currentMoveIndex === idx + 1 ? 'active' : ''}`}
                  title={move}
                >
                  {displayText}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessReplay;
