/**
 * Production WebSocket Server — Live broadcast to spectators
 *
 * Exposes the chess arena to multiple clients in real-time.
 *
 * Events:
 * - GameStarted: Match begins
 * - MovePlayed: Move executed with FEN, evaluation, latency
 * - CommentaryGenerated: Broadcast event with analysis
 * - EvaluationUpdated: Engine evaluation
 * - ReplayTriggered: Critical moment saved
 * - GameFinished: Match ends with result
 * - ArenaStatisticsUpdated: Arena stats
 * - Heartbeat: Keep-alive (every 5s)
 */

import { WebSocketServer as WSServer } from 'ws';
import http from 'http';

export class WebSocketServer {
  constructor(port = 9000) {
    this.port = port;
    this.httpServer = null;
    this.wsServer = null;
    this.clients = new Set();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.heartbeatInterval = null;
    this.gameState = {
      isLive: false,
      currentGameNumber: 0,
      whitePlayer: null,
      blackPlayer: null,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moveCount: 0,
      startTime: null,
      isGameOver: false,
    };
  }

  /**
   * Start the WebSocket server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = http.createServer();
        this.wsServer = new WSServer({ server: this.httpServer });

        this.wsServer.on('connection', (ws) => this.handleConnection(ws));

        const tryListen = (port) => {
          const server = http.createServer();
          const wsServer = new WSServer({ server });

          wsServer.on('connection', (ws) => this.handleConnection(ws));

          server.listen(port, () => {
            this.httpServer = server;
            this.wsServer = wsServer;
            this.port = port;
            console.log(`🔗 WebSocket Server running on ws://localhost:${port}`);
            this.startHeartbeat();
            resolve();
          });

          server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
              console.log(`⚠️  Port ${port} in use, trying ${port + 1}...`);
              server.close();
              // Retry with next port
              const nextPort = port + 1;
              if (nextPort <= 9010) {
                setTimeout(() => tryListen(nextPort), 500);
              } else {
                reject(new Error('Could not find available port between 9000-9010'));
              }
            } else {
              reject(error);
            }
          });
        };

        tryListen(this.port);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Close all client connections
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();

      if (this.wsServer) {
        this.wsServer.close(() => {
          if (this.httpServer) {
            this.httpServer.close(() => {
              console.log('🔌 WebSocket Server stopped');
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws) {
    // Suppress client connection logs for cleaner console
    // console.log(`📡 Client connected. Total clients: ${this.clients.size + 1}`);
    this.clients.add(ws);

    // Send initial state to new client
    this.sendToClient(ws, {
      type: 'init',
      gameState: this.gameState,
      recentEvents: this.eventHistory.slice(-50),
    });

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('❌ Error parsing message:', error.message);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.clients.delete(ws);
      // Suppress client disconnection logs for cleaner console
      // console.log(`📡 Client disconnected. Total clients: ${this.clients.size}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong' });
        break;

      case 'requestState':
        this.sendToClient(ws, {
          type: 'stateUpdate',
          gameState: this.gameState,
        });
        break;

      case 'requestHistory':
        const count = message.count || 100;
        this.sendToClient(ws, {
          type: 'historyUpdate',
          events: this.eventHistory.slice(-count),
        });
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event) {
    // Store in history
    this.eventHistory.push({
      ...event,
      timestamp: Date.now(),
    });

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Send to all clients
    const message = JSON.stringify({
      type: event.type,
      ...event,
    });

    for (const client of this.clients) {
      if (client.readyState === 1) {  // WebSocket.OPEN = 1
        client.send(message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    if (ws.readyState === 1) {  // WebSocket.OPEN = 1
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat to detect disconnections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        connectedClients: this.clients.size,
        gameState: this.gameState,
      });
    }, 5000);
  }

  // ============================================================
  // Event Emitters - Called by Arena and BroadcastService
  // ============================================================

  /**
   * Game started
   */
  emitGameStarted(white, black, matchNumber) {
    this.gameState.isLive = true;
    this.gameState.currentGameNumber = matchNumber;
    this.gameState.whitePlayer = white;
    this.gameState.blackPlayer = black;
    this.gameState.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.gameState.moveCount = 0;
    this.gameState.startTime = Date.now();
    this.gameState.isGameOver = false;

    this.broadcast({
      type: 'GameStarted',
      white: {
        name: white.name,
        provider: white.provider,
        model: white.model,
        personality: white.personality,
        temperature: white.temperature,
      },
      black: {
        name: black.name,
        provider: black.provider,
        model: black.model,
        personality: black.personality,
        temperature: black.temperature,
      },
      matchNumber,
    });
  }

  /**
   * Move played
   */
  emitMovePlayed(moveData, playerName, latencyMs) {
    this.gameState.fen = moveData.fen;
    this.gameState.moveCount++;

    this.broadcast({
      type: 'MovePlayed',
      move: moveData.move,
      san: moveData.san,
      uci: moveData.uci,
      fen: moveData.fen,
      player: playerName,
      playerName: playerName,
      brainName: playerName,
      moveNumber: this.gameState.moveCount,
      latencyMs: moveData.latency || latencyMs,
      confidence: moveData.confidence || 0,
      description: moveData.description || '',
      piece: moveData.piece,
      flags: moveData.flags,
      timestamp: Date.now(),
    });
  }

  /**
   * Commentary generated
   */
  emitCommentaryGenerated(commentary, move, player, severity) {
    this.broadcast({
      type: 'CommentaryGenerated',
      event: commentary.event || 'move',
      commentary: commentary.commentary || commentary,
      move,
      player,
      severity: severity || 'low',
    });
  }

  /**
   * Evaluation updated (from engine analysis)
   */
  emitEvaluationUpdated(evaluation, moveNumber) {
    this.broadcast({
      type: 'EvaluationUpdated',
      evaluation,
      moveNumber,
      fen: this.gameState.fen,
    });
  }

  /**
   * Replay triggered (critical moment saved)
   */
  emitReplayTriggered(replayData) {
    this.broadcast({
      type: 'ReplayTriggered',
      replayType: replayData.type,
      description: replayData.description,
      movesToReplay: replayData.movesToReplay,
      moveCount: this.gameState.moveCount,
    });
  }

  /**
   * Game finished
   */
  emitGameFinished(result, white, black, moveCount, durationMs) {
    this.gameState.isLive = false;
    this.gameState.isGameOver = true;

    this.broadcast({
      type: 'GameFinished',
      result,
      white,
      black,
      moveCount,
      durationMs,
      fen: this.gameState.fen,
    });
  }

  /**
   * Arena statistics updated
   */
  emitArenaStatisticsUpdated(stats) {
    this.broadcast({
      type: 'ArenaStatisticsUpdated',
      totalGames: stats.totalGames,
      whiteWins: stats.whiteWins,
      blackWins: stats.blackWins,
      draws: stats.draws,
      uptime: stats.uptime,
      gamesPerHour: stats.gamesPerHour || 0,
      avgMoveCount: stats.avgMoveCount || 0,
      recentGames: stats.recentGames || [],
      connectedClients: this.clients.size,
    });
  }

  /**
   * Match restart countdown (EPIC 73)
   */
  emitMatchRestartIn(secondsRemaining, nextMatchNumber) {
    this.broadcast({
      type: 'MatchRestartIn',
      secondsRemaining,
      nextMatchNumber,
      timestamp: Date.now(),
    });
  }

  /**
   * Health status update (EPIC 73)
   */
  emitHealthStatus(status) {
    this.broadcast({
      type: 'HealthStatus',
      ollama: status.ollama,
      version: status.version || '',
      error: status.error || null,
      timestamp: Date.now(),
    });
  }

  /**
   * Game error notification (EPIC 73)
   */
  emitGameError(error) {
    this.broadcast({
      type: 'GameError',
      error: error.error || error.message,
      matchNumber: error.matchNumber || 0,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      serverRunning: !!this.wsServer,
      connectedClients: this.clients.size,
      gameState: this.gameState,
      eventHistorySize: this.eventHistory.length,
      recentEvents: this.eventHistory.slice(-10),
    };
  }

  /**
   * Display server stats
   */
  displayStats() {
    const state = this.getState();
    console.log('\n📊 WebSocket Server Stats');
    console.log('─'.repeat(40));
    console.log(`Server: ${state.serverRunning ? '✅ Running' : '❌ Stopped'}`);
    console.log(`Connected Clients: ${state.connectedClients}`);
    console.log(`Event History: ${state.eventHistorySize} events`);
    console.log(`Current Game: ${state.gameState.currentGameNumber}`);
    console.log(`Game Live: ${state.gameState.isLive ? '🎮 Active' : '⏸️ Idle'}`);
    if (state.gameState.whitePlayer) {
      console.log(`Players: ${state.gameState.whitePlayer.name} vs ${state.gameState.blackPlayer.name}`);
      console.log(`Moves: ${state.gameState.moveCount}`);
    }
  }
}

export default WebSocketServer;
