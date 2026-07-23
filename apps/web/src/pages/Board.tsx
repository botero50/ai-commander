import React, { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import useWebSocket from '../hooks/useWebSocket';
import '../styles/overlay.css';

export const Board: React.FC = () => {
  const { gameState, isConnected, connectionError } = useWebSocket('ws://localhost:9002');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const chess = useMemo(() => {
    try {
      const c = new Chess();
      c.load(gameState.fen);
      return c;
    } catch {
      return new Chess();
    }
  }, [gameState.fen]);

  return (
    <div className="board-page">
      {/* Board Container */}
      <div className="board-container">
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
    </div>
  );
};

export default Board;
