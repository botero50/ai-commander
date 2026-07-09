import React from 'react';

interface ConfidenceScoreProps {
  confidence: number; // 0-1
}

export function ConfidenceScore({ confidence }: ConfidenceScoreProps) {
  const percentage = Math.round(confidence * 100);

  const getLabel = (): string => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.4) return 'Medium';
    return 'Low';
  };

  const getColor = (): string => {
    if (confidence >= 0.7) return '#22c55e'; // green
    if (confidence >= 0.4) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const color = getColor();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {percentage}%
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Confidence
        </div>
        <div style={{ fontSize: '0.75rem', color }}>{getLabel()}</div>
      </div>
    </div>
  );
}
