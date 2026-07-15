/**
 * Camera Broadcast Server
 *
 * HTTP server that broadcasts camera recommendations to external tools.
 * Allows streaming software (OBS, etc.) to subscribe to camera movements
 * for automated broadcasting.
 *
 * Usage:
 *   GET http://localhost:3001/camera/current - Get current camera position
 *   GET http://localhost:3001/camera/subscribe - WebSocket stream of updates
 */

import * as http from 'http';
import { Logger } from '../config/logger.js';

export interface CameraPosition {
  x: number;
  z: number;
  timestamp: number;
  reason?: string;
  score?: number;
}

export class CameraBroadcastServer {
  private server: http.Server | null = null;
  private port: number;
  private currentPosition: CameraPosition = { x: 0, z: 0, timestamp: Date.now() };
  private subscribers: Set<http.ServerResponse> = new Set();

  constructor(private logger: Logger, port: number = 3001) {
    this.port = port;
  }

  /**
   * Start the broadcast server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const pathname = new URL(req.url || '', `http://${req.headers.host}`).pathname;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // GET /camera/current - Get current camera position
        if (pathname === '/camera/current' && req.method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify(this.currentPosition));
          return;
        }

        // GET /camera/stream - Server-Sent Events stream
        if (pathname === '/camera/stream' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          // Send initial position
          res.write(`data: ${JSON.stringify(this.currentPosition)}\n\n`);

          // Add to subscribers
          this.subscribers.add(res);

          // Handle disconnect
          req.on('close', () => {
            this.subscribers.delete(res);
          });

          return;
        }

        // 404
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          this.logger.warn(`⚠️  Port ${this.port} is already in use - camera broadcast disabled`);
          resolve(); // Continue without camera broadcast
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        this.logger.info(`📡 Camera broadcast server listening on port ${this.port}`);
        this.logger.info(`   GET http://localhost:${this.port}/camera/current`);
        this.logger.info(`   GET http://localhost:${this.port}/camera/stream (SSE)`);
        resolve();
      });
    });
  }

  /**
   * Update camera position and broadcast to subscribers
   */
  updatePosition(position: CameraPosition): void {
    this.currentPosition = {
      ...position,
      timestamp: Date.now(),
    };

    // Broadcast to all subscribers via SSE
    const data = `data: ${JSON.stringify(this.currentPosition)}\n\n`;
    for (const subscriber of this.subscribers) {
      try {
        subscriber.write(data);
      } catch (error) {
        this.subscribers.delete(subscriber);
      }
    }
  }

  /**
   * Broadcast a camera recommendation
   */
  broadcastRecommendation(x: number, z: number, reason: string, score: number): void {
    this.updatePosition({
      x,
      z,
      reason,
      score,
      timestamp: Date.now(),
    });

    this.logger.info(`📡 Broadcast: camera at (${x.toFixed(1)}, ${z.toFixed(1)}) - ${reason}`);
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.logger.info('Camera broadcast server stopped');
          resolve();
        });
      });
    }
  }
}
