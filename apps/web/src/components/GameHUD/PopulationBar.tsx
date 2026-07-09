import React from 'react';

interface PopulationBarProps {
  current: number;
  max: number;
  playerColor: string;
}

export const PopulationBar: React.FC<PopulationBarProps> = ({ current, max, playerColor }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isFull = current >= max;

  return (
    <div>
      <div
        style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: '0.375rem',
        }}
      >
        Population
      </div>

      {/* Progress Bar */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '0.25rem',
          height: '1rem',
          overflow: 'hidden',
          border: `1px solid ${playerColor}40`,
          marginBottom: '0.375rem',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: isFull ? '#ef4444' : playerColor,
            transition: 'width 0.2s ease-out',
            opacity: 0.8,
          }}
        />
      </div>

      {/* Population Label */}
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        {current}/{max} {isFull && '🔴'}
      </div>
    </div>
  );
};
