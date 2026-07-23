/**
 * Broadcast Server — WebSocket server for live game streaming
 *
 * Accepts connections from web clients and broadcasts game state updates.
 * Receives updates from Arena via a simple API.
 */

import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = 9001;
let server = null;
let wss = null;
let isRunning = false;

// Current game state being broadcast
let currentGameState = {
  gameId: null,
  white: { model: 'unknown', position: 'starting' },
  black: { model: 'unknown', position: 'starting' },
  board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  moveCount: 0,
  lastMove: null,
};

let clients = new Set();

/**
 * Broadcast a move to all connected clients
 */
export function broadcastMove(moveData) {
  if (!moveData || !moveData.gameId) return;

  // Update game state
  currentGameState.gameId = moveData.gameId;
  currentGameState.board = moveData.fenAfter;
  currentGameState.lastMove = moveData.san;
  currentGameState.moves.push(moveData.san);
  currentGameState.moveCount = moveData.moveNumber;

  // Broadcast to all clients (use MovePlayed type that web app expects)
  const message = JSON.stringify({
    type: 'MovePlayed',
    gameId: moveData.gameId,
    moveNumber: moveData.moveNumber,
    color: moveData.color,
    san: moveData.san,
    uci: moveData.uci,
    fen: moveData.fenAfter,
    fenBefore: moveData.fenBefore,
    latency: moveData.latencyMs,
    confidence: moveData.confidence,
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(message);
    }
  }
}

/**
 * Broadcast game start
 */
export function broadcastGameStart(gameData) {
  if (!gameData || !gameData.gameId) return;

  currentGameState.gameId = gameData.gameId;
  currentGameState.white.model = gameData.whiteModel;
  currentGameState.black.model = gameData.blackModel;
  currentGameState.moves = [];
  currentGameState.moveCount = 0;
  currentGameState.lastMove = null;

  // Use GameStarted type that web app expects
  const message = JSON.stringify({
    type: 'GameStarted',
    gameId: gameData.gameId,
    matchNumber: 1,
    white: {
      name: gameData.whiteModel,
      provider: 'ollama',
      model: gameData.whiteModel,
    },
    black: {
      name: gameData.blackModel,
      provider: 'ollama',
      model: gameData.blackModel,
    },
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(message);
    }
  }
}

/**
 * Broadcast game finish
 */
export function broadcastGameFinish(gameData) {
  if (!gameData || !gameData.gameId) return;

  // Use GameFinished type that web app expects
  const message = JSON.stringify({
    type: 'GameFinished',
    gameId: gameData.gameId,
    result: gameData.result,
    moveCount: gameData.moveCount,
    duration: gameData.durationMs,
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(message);
    }
  }
}

/**
 * Start the broadcast server
 */
export function startBroadcastServer() {
  if (isRunning) {
    console.log(`📡 Broadcast server already running on ws://localhost:${PORT}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      server = http.createServer();
      wss = new WebSocketServer({ server });

      // Handle new connections
      wss.on('connection', (ws) => {
        console.log('✅ Client connected to broadcast');
        clients.add(ws);

        // Send current game state immediately
        ws.send(
          JSON.stringify({
            type: 'game-state',
            payload: currentGameState,
          })
        );

        // Handle client disconnection
        ws.on('close', () => {
          console.log('❌ Client disconnected');
          clients.delete(ws);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error('WebSocket error:', error.message);
          clients.delete(ws);
        });
      });

      const onError = (error) => {
        if (error.code === 'EADDRINUSE') {
          console.warn(`⚠️  Port ${PORT} is already in use, skipping broadcast server`);
          isRunning = false; // Mark as not running
          server = null;
          wss = null;
          resolve(); // Don't fail startup if broadcast port is busy
        } else {
          reject(error);
        }
      };

      const onListening = () => {
        console.log(`📡 Broadcast server listening on ws://localhost:${PORT}`);
        isRunning = true;
        server.removeListener('error', onError);
        resolve();
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(PORT);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop the broadcast server
 */
export function stopBroadcastServer() {
  return new Promise((resolve) => {
    wss.clients.forEach((client) => {
      client.close();
    });
    server.close(() => {
      console.log('📡 Broadcast server stopped');
      resolve();
    });
  });
}

export function getClientCount() {
  return clients.size;
}
