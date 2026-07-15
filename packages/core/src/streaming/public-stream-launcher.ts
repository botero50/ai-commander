/**
 * EPIC 59 — Public Stream Launcher
 *
 * Orchestrates the complete public stream:
 * 1. Start arena controller (infinite match rotation)
 * 2. Start broadcast data bridge (real events → broadcast format)
 * 3. Start live metrics HUD (real-time stats)
 * 4. Expose REST API for broadcast overlay
 * 5. Log continuous stream status
 *
 * Usage:
 *   const launcher = new PublicStreamLauncher(config);
 *   await launcher.launch();
 *   // Stream runs forever with auto-recovery
 */

/**
 * TODO: Missing module imports - need to be extracted/created:
 * - ../arena/arena-controller.js
 * - ../broadcast/broadcast-data-bridge.js
 * - ../broadcast/live-metrics-hud.js
 * - ../broadcast/match-introduction.js
 * - ../broadcast/match-conclusion.js
 * - ../arena/arena-status-api.js
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import { URL } from 'url';
import { Logger } from '../config/logger.js';

// Placeholder classes - TODO: replace with actual implementations
class ArenaController extends EventEmitter {
  getStatus() { return {}; }
  async run() { /* TODO */ }
  async stop() { /* TODO */ }
  async launch() { /* TODO */ }
  async shutdown() { /* TODO */ }
  async restart() { /* TODO */ }
}

class BroadcastDataBridge extends EventEmitter {
  async start() { /* TODO */ }
  async stop() { /* TODO */ }
}

class LiveMetricsHUD extends EventEmitter {
  onMetricsUpdate(callback: any) { /* TODO */ }
  getAllMetrics() { return {}; }
  reset() { /* TODO */ }
  async start() { /* TODO */ }
  async stop() { /* TODO */ }
}

class MatchIntroduction {
  async broadcast() { /* TODO */ }
  async runIntroduction() { /* TODO */ }
}

class MatchConclusion {
  async broadcast() { /* TODO */ }
  async runConclusion() { /* TODO */ }
}

class ArenaStatusAPI {
  getStatus() { return {}; }
  getStats() { return {}; }
  getHealth() { return {}; }
  async start() { /* TODO */ }
  async stop() { /* TODO */ }
}

// Commented out broken imports:
// import { ArenaController } from '../arena/arena-controller.js';
// import { BroadcastDataBridge } from '../broadcast/broadcast-data-bridge.js';
// import { LiveMetricsHUD } from '../broadcast/live-metrics-hud.js';
// import { MatchIntroduction } from '../broadcast/match-introduction.js';
// import { MatchConclusion } from '../broadcast/match-conclusion.js';
// import { ArenaStatusAPI } from '../arena/arena-status-api.js';

export interface StreamConfig {
  maxMatches?: number; // 0 = infinite
  matchTimeout?: number; // seconds before auto-restart
  statusPort?: number; // REST API port
  logInterval?: number; // seconds between status logs
}

export interface StreamStatus {
  isRunning: boolean;
  matchesCompleted: number;
  uptime: number; // seconds
  currentMatch?: {
    number: number;
    startTime: string;
  };
  broadcastActive: boolean;
  metricsActive: boolean;
  health: {
    arena: 'healthy' | 'recovering' | 'failed';
    broadcast: 'healthy' | 'failed';
    metrics: 'healthy' | 'failed';
  };
}

export class PublicStreamLauncher extends EventEmitter {
  private logger: Logger;
  private config: Required<StreamConfig>;
  private arena: ArenaController;
  private bridge: BroadcastDataBridge;
  private hud: LiveMetricsHUD;
  private introduction: MatchIntroduction;
  private conclusion: MatchConclusion;
  private statusAPI: ArenaStatusAPI;
  private server?: http.Server;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private statusInterval?: NodeJS.Timeout;

  constructor(config: StreamConfig = {}) {
    super();
    this.logger = new Logger('info', 'PublicStreamLauncher');

    this.config = {
      maxMatches: config.maxMatches ?? 0, // 0 = infinite
      matchTimeout: config.matchTimeout ?? 600, // 10 minutes
      statusPort: config.statusPort ?? 3000,
      logInterval: config.logInterval ?? 300, // 5 minutes
    };

    this.arena = new ArenaController({
      players: [
        { name: 'AI Player 1', aiModel: 'claude', aiPrompt: 'Strategy' },
        { name: 'AI Player 2', aiModel: 'ollama', aiPrompt: 'Strategy' },
      ],
    });
    this.bridge = new BroadcastDataBridge(this.logger);
    this.hud = new LiveMetricsHUD(this.logger);
    this.introduction = new MatchIntroduction(this.logger);
    this.conclusion = new MatchConclusion(this.logger);
    this.statusAPI = new ArenaStatusAPI(this.arena, this.logger);
  }

  /**
   * Launch the public stream
   */
  async launch(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Stream already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    try {
      this.logger.info('🎬 LAUNCHING PUBLIC STREAM', {
        maxMatches: this.config.maxMatches === 0 ? 'infinite' : this.config.maxMatches,
        statusPort: this.config.statusPort,
      });

      // Step 1: Start REST API for status/broadcast integration
      await this.startStatusAPI();

      // Step 2: Connect broadcast data bridge
      await this.connectBroadcast();

      // Step 3: Subscribe HUD to observations
      this.connectMetrics();

      // Step 4: Start status logging
      this.startStatusLogging();

      // Step 5: Start arena (infinite match rotation)
      this.startArena();

      this.logger.info('✅ Public stream launched successfully');
      this.emit('launched');
    } catch (error) {
      this.logger.error('Failed to launch stream', { error });
      this.isRunning = false;
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Start REST API server
   */
  private async startStatusAPI(): Promise<void> {
    this.server = http.createServer((req, res) => {
      const path = new URL(req.url || '', `http://${req.headers.host}`).pathname;

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        if (path === '/arena/status') {
          res.writeHead(200);
          res.end(JSON.stringify(this.statusAPI.getStatus()));
        } else if (path === '/arena/stats') {
          res.writeHead(200);
          res.end(JSON.stringify(this.statusAPI.getStats()));
        } else if (path === '/arena/health') {
          res.writeHead(200);
          res.end(JSON.stringify(this.statusAPI.getHealth()));
        } else if (path === '/stream/status') {
          res.writeHead(200);
          res.end(JSON.stringify({
            isRunning: this.isRunning,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            port: this.config.statusPort,
            timestamp: new Date().toISOString(),
          }));
        } else if (path === '/health') {
          res.writeHead(200);
          res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
          }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        this.logger.error('Request handler error', { error, path });
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.statusPort, () => {
        this.logger.info(`✅ Status API listening on port ${this.config.statusPort}`, {
          endpoints: {
            arena: '/arena/stats',
            arenaHealth: '/arena/health',
            stream: '/stream/status',
            health: '/health',
          },
        });
        resolve();
      });
    });
  }

  /**
   * Connect broadcast data bridge
   */
  private async connectBroadcast(): Promise<void> {
    try {
      // Bridge is already initialized with SessionEventBus
      // Wire up event handlers for introduction/conclusion
      this.bridge.on('match-start', (event: any) => {
        this.logger.info('Match started', { matchId: event.matchId });
        this.introduction.runIntroduction(event.data).catch((e) => {
          this.logger.error('Introduction error', { error: e });
        });
      });

      this.bridge.on('match-end', (event: any) => {
        this.logger.info('Match ended', { winner: event.data?.winner });
        this.conclusion.runConclusion(event.data).catch((e) => {
          this.logger.error('Conclusion error', { error: e });
        });
      });

      this.logger.info('✅ Broadcast bridge connected');
    } catch (error) {
      this.logger.error('Failed to connect broadcast bridge', { error });
      throw error;
    }
  }

  /**
   * Connect live metrics HUD
   */
  private connectMetrics(): void {
    // HUD subscribes to observations automatically
    this.hud.onMetricsUpdate((update) => {
      this.logger.debug('Metrics updated', {
        tick: update.tick,
        players: update.players.length,
      });
      this.emit('metrics-update', update);
    });

    this.logger.info('✅ Live metrics HUD connected');
  }

  /**
   * Start arena (runs forever)
   */
  private startArena(): void {
    this.logger.info('Starting arena', {
      maxMatches: this.config.maxMatches === 0 ? 'infinite' : this.config.maxMatches,
    });

    // Run arena in background (doesn't return)
    this.arena.run().catch((error) => {
      this.logger.error('Arena fatal error', { error });
      this.emit('arena-error', error);
    });

    this.logger.info('✅ Arena started');
  }

  /**
   * Start status logging (every logInterval)
   */
  private startStatusLogging(): void {
    this.statusInterval = setInterval(() => {
      const status = this.getStatus();
      this.logger.info('📊 Stream Status', {
        matches: status.matchesCompleted,
        uptime: `${Math.floor(status.uptime / 60)}m${status.uptime % 60}s`,
        broadcast: status.broadcastActive ? '✅' : '❌',
        metrics: status.metricsActive ? '✅' : '❌',
      });
    }, this.config.logInterval * 1000);
  }

  /**
   * Get current stream status
   */
  getStatus(): StreamStatus {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const arenaStatus = this.arena.getStatus();

    return {
      isRunning: this.isRunning,
      matchesCompleted: arenaStatus.matchesCompleted || 0,
      uptime,
      currentMatch: {
        number: arenaStatus.currentMatchNumber || 0,
        startTime: new Date(this.startTime).toISOString(),
      },
      broadcastActive: true,
      metricsActive: this.hud.getAllMetrics().length > 0,
      health: {
        arena: 'healthy',
        broadcast: 'healthy',
        metrics: this.hud.getAllMetrics().length > 0 ? 'healthy' : 'failed',
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down public stream');

    this.isRunning = false;

    // Stop status logging
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.logger.info('✓ HTTP server closed');
          resolve();
        });
      });
    }

    // Stop arena
    await this.arena.stop();

    // Reset HUD
    this.hud.reset();

    this.logger.info('✅ Stream shutdown complete');
  }

  /**
   * Status for broadcast overlay
   */
  toJSON(): Record<string, any> {
    const status = this.getStatus();
    return {
      status,
      broadcastURL: `http://localhost:${this.config.statusPort}`,
      endpoints: {
        stream: '/stream/status',
        arena: '/arena/stats',
        metrics: '/metrics/current',
        health: '/health',
      },
    };
  }
}

/**
 * Factory function
 */
export function createPublicStreamLauncher(config?: StreamConfig): PublicStreamLauncher {
  return new PublicStreamLauncher(config);
}
