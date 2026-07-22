import React, { useState, useEffect } from 'react';
import '../styles/overlay.css';

interface Player {
  model: string;
  temperature: number;
}

export const TopRibbon: React.FC = () => {
  const [whitePlayer, setWhitePlayer] = useState<Player | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:9000');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'GameStarted') {
        setWhitePlayer(message.whitePlayer);
        setBlackPlayer(message.blackPlayer);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="board-ribbon">
      <div className="ribbon-player">
        {whitePlayer ? (
          <>
            <div className="ribbon-name">Ollama</div>
            <div className="ribbon-details">
              <div className="ribbon-model">{whitePlayer.model}</div>
              <div className="ribbon-temp">T: {whitePlayer.temperature?.toFixed(2)}</div>
            </div>
          </>
        ) : (
          <div className="ribbon-name">Waiting...</div>
        )}
      </div>
      <div className="ribbon-player">
        {blackPlayer ? (
          <>
            <div className="ribbon-name">Ollama</div>
            <div className="ribbon-details">
              <div className="ribbon-model">{blackPlayer.model}</div>
              <div className="ribbon-temp">T: {blackPlayer.temperature?.toFixed(2)}</div>
            </div>
          </>
        ) : (
          <div className="ribbon-name">Waiting...</div>
        )}
      </div>
    </div>
  );
};

export default TopRibbon;
