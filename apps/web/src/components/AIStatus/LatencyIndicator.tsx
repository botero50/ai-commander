import React from 'react';

interface LatencyIndicatorProps {
  latencyMs: number;
  averageMs: number;
}

export function LatencyIndicator({ latencyMs, averageMs }: LatencyIndicatorProps) {
  const getColor = (ms: number): string => {
    if (ms < 100) return '#22c55e'; // green
    if (ms < 300) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const color = getColor(averageMs);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          {latencyMs}ms
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888' }}>
          avg {averageMs}ms
        </div>
      </div>
    </div>
  );
}
