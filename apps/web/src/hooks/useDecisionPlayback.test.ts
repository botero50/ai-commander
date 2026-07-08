import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDecisionPlayback } from './useDecisionPlayback';

const mockDecisions = [
  {
    tick: 10,
    timestamp: Date.now(),
    player: 'player1' as const,
    brainName: 'Ollama',
    reasoning: 'Test',
    commands: ['cmd1'],
    commandCount: 1,
    durationMs: 100,
  },
  {
    tick: 50,
    timestamp: Date.now() + 40000,
    player: 'player2' as const,
    brainName: 'Claude',
    reasoning: 'Test 2',
    commands: ['cmd2'],
    commandCount: 1,
    durationMs: 150,
  },
];

describe('useDecisionPlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize in stopped state at tick 0', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    expect(result.current.state).toBe('stopped');
    expect(result.current.currentTick).toBe(0);
    expect(result.current.speed).toBe(1);
  });

  it('should transition to playing state', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.play();
    });

    expect(result.current.state).toBe('playing');
  });

  it('should pause playback', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.play();
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.state).toBe('paused');
  });

  it('should stop and reset to tick 0', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(500);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe('stopped');
    expect(result.current.currentTick).toBe(0);
  });

  it('should seek to specific tick', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(500);
    });

    expect(result.current.currentTick).toBe(500);
  });

  it('should clamp seek to max tick', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(2000);
    });

    expect(result.current.currentTick).toBe(1000);
  });

  it('should advance frame by 1', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.nextFrame();
    });

    expect(result.current.currentTick).toBe(1);
  });

  it('should go back frame by 1', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(100);
    });

    act(() => {
      result.current.previousFrame();
    });

    expect(result.current.currentTick).toBe(99);
  });

  it('should change playback speed', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.changeSpeed(2);
    });

    expect(result.current.speed).toBe(2);
  });

  it('should get current frame with decision', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(10);
    });

    const frame = result.current.getCurrentFrame();

    expect(frame.tick).toBe(10);
    expect(frame.decision).toBeDefined();
    expect(frame.decision?.brainName).toBe('Ollama');
    expect(frame.isDecisionTick).toBe(true);
  });

  it('should calculate progress percentage', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(500);
    });

    const frame = result.current.getCurrentFrame();

    expect(frame.progress).toBe(50);
  });

  it('should finish when reaching max tick', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(1000);
    });

    expect(result.current.state).toBe('finished');
  });

  it('should restart when play called after finish', () => {
    const { result } = renderHook(() => useDecisionPlayback(mockDecisions, 1000));

    act(() => {
      result.current.seek(1000);
    });

    act(() => {
      result.current.play();
    });

    expect(result.current.currentTick).toBe(0);
    expect(result.current.state).toBe('playing');
  });
});
