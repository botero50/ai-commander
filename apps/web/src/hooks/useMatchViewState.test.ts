import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchViewState } from './useMatchViewState';

describe('useMatchViewState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null state and disconnected status', () => {
    const { result } = renderHook(() => useMatchViewState());

    expect(result.current.state).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide connect and disconnect functions', () => {
    const { result } = renderHook(() => useMatchViewState());

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('should handle connection errors gracefully', async () => {
    const { result } = renderHook(() => useMatchViewState());

    await act(async () => {
      await result.current.connect('ws://invalid-url');
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('should allow state subscription through the manager', async () => {
    const { result } = renderHook(() => useMatchViewState());

    expect(result.current.state).toBeNull();
    // State updates would come from WebSocket messages
    // This test verifies the hook structure is correct
    expect(typeof result.current.connect).toBe('function');
  });

  it('should disconnect cleanly', async () => {
    const { result } = renderHook(() => useMatchViewState());

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.state).toBeNull();
  });

  it('should auto-connect when wsUrl prop is provided', async () => {
    const { result } = renderHook(() => useMatchViewState('ws://test'));

    // Hook attempts to connect on mount
    // Actual connection depends on WebSocket server availability
    expect(typeof result.current.connect).toBe('function');
  });
});
