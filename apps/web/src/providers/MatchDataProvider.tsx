import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Live match data from GameSession
 * Wires all runtime services (HUD, commentary, replays, etc) to UI components
 */

export interface Player {
  id: string;
  name: string;
  brainModel: string;
  provider: string;
}

export interface GameState {
  tick: number;
  timestamp: number;
  player1: {
    resources: { food: number; wood: number; metal: number; stone: number };
    population: { current: number; max: number };
    units: number;
    buildings: number;
    technologies: number[];
  };
  player2: {
    resources: { food: number; wood: number; metal: number; stone: number };
    population: { current: number; max: number };
    units: number;
    buildings: number;
    technologies: number[];
  };
}

export interface MatchMetadata {
  matchId: string;
  player1: Player;
  player2: Player;
  startTime: number;
  currentTick: number;
  isLive: boolean;
  isPaused: boolean;
}

export interface CommentaryEvent {
  tick: number;
  text: string;
  severity: 'critical' | 'major' | 'minor';
  type: string;
}

export interface DecisionEvent {
  tick: number;
  player: string;
  model: string;
  action: string;
  reasoning: string;
  duration: number;
}

export interface ReplayData {
  matchId: string;
  duration: number;
  highlights: Array<{ tick: number; title: string; type: string }>;
  available: boolean;
}

interface MatchDataContextType {
  // Match info
  metadata: MatchMetadata | null;
  gameState: GameState | null;

  // Live feeds
  commentaryEvents: CommentaryEvent[];
  decisionEvents: DecisionEvent[];

  // Replay data
  replayData: ReplayData | null;

  // Controls
  play: () => void;
  pause: () => void;
  seek: (tick: number) => void;
  setSpeed: (speed: number) => void;

  // Status
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

const MatchDataContext = createContext<MatchDataContextType | null>(null);

interface MatchDataProviderProps {
  matchId?: string;
  wsUrl?: string;
  children: React.ReactNode;
}

/**
 * Provider that connects to live match data via WebSocket
 * Falls back to mock data if server is unavailable
 */
export function MatchDataProvider({ matchId = 'live', wsUrl = 'ws://localhost:3000/ws', children }: MatchDataProviderProps) {
  const [metadata, setMetadata] = useState<MatchMetadata | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [commentaryEvents, setCommentaryEvents] = useState<CommentaryEvent[]>([]);
  const [decisionEvents, setDecisionEvents] = useState<DecisionEvent[]>([]);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>(
    'connecting'
  );

  // Initialize WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        setConnectionStatus('connecting');
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setConnectionStatus('connected');
          setError(null);
          setIsLoading(false);

          // Subscribe to match data
          ws?.send(JSON.stringify({ type: 'subscribe', matchId }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'match_metadata':
                setMetadata(message.data);
                break;
              case 'game_state':
                setGameState(message.data);
                break;
              case 'commentary':
                setCommentaryEvents((prev) => [...prev, message.data].slice(-100)); // Keep last 100
                break;
              case 'decision':
                setDecisionEvents((prev) => [...prev, message.data].slice(-100)); // Keep last 100
                break;
              case 'replay_data':
                setReplayData(message.data);
                break;
              default:
                break;
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (err) => {
          setConnectionStatus('error');
          setError(`Connection error: ${err}`);
        };

        ws.onclose = () => {
          setConnectionStatus('disconnected');
          // Attempt reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setConnectionStatus('error');
        setError(`Failed to connect: ${err}`);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [matchId, wsUrl]);

  // Control functions
  const play = useCallback(() => {
    if (!metadata) return;
    // Send play command to server
  }, [metadata]);

  const pause = useCallback(() => {
    if (!metadata) return;
    // Send pause command to server
  }, [metadata]);

  const seek = useCallback((tick: number) => {
    if (!metadata) return;
    // Send seek command to server
  }, [metadata]);

  const setSpeed = useCallback((speed: number) => {
    if (!metadata) return;
    // Send speed command to server
  }, [metadata]);

  const value: MatchDataContextType = {
    metadata,
    gameState,
    commentaryEvents,
    decisionEvents,
    replayData,
    play,
    pause,
    seek,
    setSpeed,
    isLoading,
    error,
    connectionStatus,
  };

  return <MatchDataContext.Provider value={value}>{children}</MatchDataContext.Provider>;
}

/**
 * Hook to access match data from context
 */
export function useMatchData(): MatchDataContextType {
  const context = useContext(MatchDataContext);
  if (!context) {
    throw new Error('useMatchData must be used within MatchDataProvider');
  }
  return context;
}

/**
 * Hook to access only metadata
 */
export function useMatchMetadata() {
  const { metadata } = useMatchData();
  return metadata;
}

/**
 * Hook to access only game state
 */
export function useGameState() {
  const { gameState } = useMatchData();
  return gameState;
}

/**
 * Hook to access only commentary
 */
export function useCommentary() {
  const { commentaryEvents } = useMatchData();
  return commentaryEvents;
}

/**
 * Hook to access only decisions
 */
export function useDecisions() {
  const { decisionEvents } = useMatchData();
  return decisionEvents;
}

/**
 * Hook to access only replay data
 */
export function useReplayData() {
  const { replayData } = useMatchData();
  return replayData;
}
