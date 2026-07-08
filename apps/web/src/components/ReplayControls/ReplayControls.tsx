import React from 'react';
import type { PlaybackState, PlaybackSpeed } from '@/hooks/useDecisionPlayback';

interface ReplayControlsProps {
  state: PlaybackState;
  currentTick: number;
  maxTick: number;
  speed: PlaybackSpeed;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (tick: number) => void;
  onNextFrame: () => void;
  onPreviousFrame: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

const SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4];

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  state,
  currentTick,
  maxTick,
  speed,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onNextFrame,
  onPreviousFrame,
  onSpeedChange,
}) => {
  const progress = (currentTick / maxTick) * 100;
  const isPlaying = state === 'playing';

  const buttonStyle = (active: boolean = false) => ({
    padding: '0.5rem 1rem',
    backgroundColor: active ? '#3b82f6' : '#f3f4f6',
    color: active ? '#fff' : '#1f2937',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem' }}>
      {/* Seek Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Tick {currentTick.toLocaleString()}</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Max: {maxTick.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min="0"
          max={maxTick}
          value={currentTick}
          onChange={(e) => onSeek(Number(e.target.value))}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`,
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Progress: {Math.round(progress)}%
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        {/* Play/Pause */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={isPlaying ? onPause : onPlay}
            style={buttonStyle(isPlaying) as React.CSSProperties}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={onStop} style={buttonStyle() as React.CSSProperties} title="Stop">
            ⏹ Stop
          </button>
        </div>

        {/* Frame Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onPreviousFrame} style={buttonStyle() as React.CSSProperties} title="Previous Frame">
            ← Frame
          </button>
          <button onClick={onNextFrame} style={buttonStyle() as React.CSSProperties} title="Next Frame">
            Frame →
          </button>
        </div>

        {/* Speed Control */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value) as PlaybackSpeed)}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x Speed
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status */}
      <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#6b7280' }}>
        Status: <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{state}</span>
      </div>
    </div>
  );
};
