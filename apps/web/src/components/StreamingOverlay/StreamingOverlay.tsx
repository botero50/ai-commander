import React from 'react';

interface StreamingOverlayProps {
  player1Name: string;
  player1Provider: string;
  player1Model: string;
  player1Objective: string;
  player1Resources: number;
  player1Army: number;
  player1Tech: number;
  player1Population: number;

  player2Name: string;
  player2Provider: string;
  player2Model: string;
  player2Objective: string;
  player2Resources: number;
  player2Army: number;
  player2Tech: number;
  player2Population: number;

  elapsedSeconds: number;
}

export function StreamingOverlay({
  player1Name,
  player1Provider,
  player1Model,
  player1Objective,
  player1Resources,
  player1Army,
  player1Tech,
  player1Population,

  player2Name,
  player2Provider,
  player2Model,
  player2Objective,
  player2Resources,
  player2Army,
  player2Tech,
  player2Population,

  elapsedSeconds,
}: StreamingOverlayProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
      }}
    >
      {/* Top center: Match timer */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '18px',
        }}
      >
        {timeStr}
      </div>

      {/* Top left: Player 1 info */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#fff',
          maxWidth: '300px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
          {player1Name}
        </div>
        <div style={{ fontSize: '12px', color: '#bbb', marginBottom: '8px' }}>
          {player1Provider} / {player1Model}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '2px' }}>
          Objective: <span style={{ color: '#60a5fa' }}>{player1Objective}</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            marginTop: '8px',
            fontSize: '12px',
          }}
        >
          <div>Army: {player1Army}</div>
          <div>Tech: {player1Tech}</div>
          <div>Resources: {player1Resources}</div>
          <div>Pop: {player1Population}</div>
        </div>
      </div>

      {/* Top right: Player 2 info */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#fff',
          maxWidth: '300px',
          textAlign: 'right',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
          {player2Name}
        </div>
        <div style={{ fontSize: '12px', color: '#bbb', marginBottom: '8px' }}>
          {player2Provider} / {player2Model}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '2px' }}>
          Objective: <span style={{ color: '#f87171' }}>{player2Objective}</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            marginTop: '8px',
            fontSize: '12px',
          }}
        >
          <div>Army: {player2Army}</div>
          <div>Tech: {player2Tech}</div>
          <div>Resources: {player2Resources}</div>
          <div>Pop: {player2Population}</div>
        </div>
      </div>
    </div>
  );
}
