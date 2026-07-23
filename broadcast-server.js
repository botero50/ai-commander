/**
 * Broadcast Server — WebSocket server for live game streaming
 *
 * Accepts connections from web clients and broadcasts game state updates.
 * Receives updates from Arena via a simple API.
 */

import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = 9000;
const server = http.createServer();
const wss = new WebSocketServer({ server });

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
 * Handle new WebSocket connections
 */
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

  // Broadcast to all clients
  const message = JSON.stringify({
    type: 'move',
    payload: {
      gameId: moveData.gameId,
      moveNumber: moveData.moveNumber,
      color: moveData.color,
      san: moveData.san,
      uci: moveData.uci,
      fenBefore: moveData.fenBefore,
      fenAfter: moveData.fenAfter,
      latency: moveData.latencyMs,
      confidence: moveData.confidence,
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

  const message = JSON.stringify({
    type: 'game-start',
    payload: {
      gameId: gameData.gameId,
      white: gameData.whiteModel,
      black: gameData.blackModel,
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

  const message = JSON.stringify({
    type: 'game-finish',
    payload: {
      gameId: gameData.gameId,
      result: gameData.result,
      moveCount: gameData.moveCount,
      duration: gameData.durationMs,
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
 * Start the broadcast server
 */
export function startBroadcastServer() {
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`📡 Broadcast server listening on ws://localhost:${PORT}`);
      resolve();
    });
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
