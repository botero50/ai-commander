import { useEffect, useState, useRef, useCallback } from 'react';

export interface GameState {
  isLive: boolean;
  currentGameNumber: number;
  whitePlayer: { name: string; provider: string; model: string; personality?: string; temperature?: number } | null;
  blackPlayer: { name: string; provider: string; model: string; personality?: string; temperature?: number } | null;
  fen: string;
  moveCount: number;
  startTime: number | null;
  isGameOver: boolean;
}

export interface WebSocketMessage {
  type: string;
  timestamp?: number;
  [key: string]: any;
}

export interface UseWebSocketReturn {
  gameState: GameState;
  messages: WebSocketMessage[];
  isConnected: boolean;
  connectionError: string | null;
  sendMessage: (message: Partial<WebSocketMessage>) => void;
}

export function useWebSocket(url = 'ws://localhost:9000'): UseWebSocketReturn {
  const [gameState, setGameState] = useState<GameState>({
    isLive: false,
    currentGameNumber: 0,
    whitePlayer: null,
    blackPlayer: null,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moveCount: 0,
    startTime: null,
    isGameOver: false,
  });

  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0; // Reset backoff on successful connection
          // Request current state
          ws.send(JSON.stringify({ type: 'requestState' }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle different message types
            switch (message.type) {
              case 'init':
              case 'stateUpdate':
                if (message.gameState) {
                  setGameState((prev) => ({
                    ...prev,
                    ...message.gameState,
                  }));
                }
                if (message.recentEvents) {
                  setMessages((prev) => [...message.recentEvents, ...prev].slice(0, 100));
                }
                break;

              case 'GameStarted':
                setGameState((prev) => ({
                  ...prev,
                  isLive: true,
                  currentGameNumber: message.matchNumber,
                  whitePlayer: {
                    name: message.white.name,
                    provider: message.white.provider,
                    model: message.white.model,
                    personality: message.white.personality,
                    temperature: message.white.temperature,
                  },
                  blackPlayer: {
                    name: message.black.name,
                    provider: message.black.provider,
                    model: message.black.model,
                    personality: message.black.personality,
                    temperature: message.black.temperature,
                  },
                  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                  moveCount: 0,
                  startTime: Date.now(),
                  isGameOver: false,
                }));
                break;

              case 'MovePlayed':
                setGameState((prev) => ({
                  ...prev,
                  fen: message.fen,
                  moveCount: message.moveNumber,
                }));
                break;

              case 'GameFinished':
                setGameState((prev) => ({
                  ...prev,
                  isLive: false,
                  isGameOver: true,
                }));
                break;

              default:
                break;
            }

            // Store message in history
            setMessages((prev) => [{ ...message, timestamp: Date.now() }, ...prev].slice(0, 100));
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionError('WebSocket connection error');
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting...');
          setIsConnected(false);
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnectionError('Failed to connect to WebSocket server');
        // Exponential backoff for connection failures too
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return {
    gameState,
    messages,
    isConnected,
    connectionError,
    sendMessage,
  };
}

export default useWebSocket;
