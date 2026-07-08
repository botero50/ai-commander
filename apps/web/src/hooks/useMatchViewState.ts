import { useState, useEffect, useCallback, useRef } from 'react';
import type { MatchViewState, StateUpdateCallback } from '@/types';
import { MatchViewStateManager } from '@/types';

/**
 * Hook for managing real-time match view state
 * Handles WebSocket connection and state updates
 */
export function useMatchViewState(wsUrl?: string) {
  const managerRef = useRef<MatchViewStateManager | null>(null);
  const [state, setState] = useState<MatchViewState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize manager
  useEffect(() => {
    const manager = new MatchViewStateManager();
    managerRef.current = manager;

    // Subscribe to state changes
    unsubscribeRef.current = manager.subscribe((newState) => {
      setState(newState);
      setError(null);
    });

    return () => {
      unsubscribeRef.current?.();
      manager.disconnect();
    };
  }, []);

  // Connect to WebSocket when URL provided
  const connect = useCallback(async (url: string) => {
    if (!managerRef.current) return;

    try {
      setError(null);
      await managerRef.current.connect(url);
      setIsConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setIsConnected(false);
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.disconnect();
    setIsConnected(false);
    setState(null);
  }, []);

  // Auto-connect if URL provided
  useEffect(() => {
    if (wsUrl) {
      connect(wsUrl);
    }
  }, [wsUrl, connect]);

  return {
    state,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
