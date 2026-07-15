/**
 * Story 59.3 — Stream Launch Entry Point
 *
 * Starts the public AI Commander stream with full orchestration:
 * 1. Initialize PublicStreamLauncher with config
 * 2. Start continuous match rotation
 * 3. Enable auto-recovery on failures
 * 4. Expose REST API for broadcast overlay
 * 5. Log status continuously
 *
 * Usage:
 *   npm run stream:launch
 *
 * Config from environment or CLI args:
 *   STREAM_PORT=3000 (default)
 *   STREAM_MATCHES=0 (0 = infinite)
 *   STREAM_LOG_INTERVAL=300 (5 minutes)
 */

import { Logger } from '../config/logger.js';
import { PublicStreamLauncher } from './public-stream-launcher.js';

export interface StreamLaunchConfig {
  port?: number;
  maxMatches?: number;
  logInterval?: number;
}

export class StreamLaunch {
  private logger: Logger;
  private launcher: PublicStreamLauncher;
  private config: Required<StreamLaunchConfig>;
  private isShuttingDown: boolean = false;

  constructor(config: StreamLaunchConfig = {}) {
    this.logger = new Logger('info', 'StreamLaunch');

    this.config = {
      port: config.port ?? parseInt(process.env.STREAM_PORT || '3000'),
      maxMatches: config.maxMatches ?? parseInt(process.env.STREAM_MATCHES || '0'),
      logInterval: config.logInterval ?? parseInt(process.env.STREAM_LOG_INTERVAL || '300'),
    };

    this.launcher = new PublicStreamLauncher({
      maxMatches: this.config.maxMatches,
      statusPort: this.config.port,
      logInterval: this.config.logInterval,
    });

    this.setupSignalHandlers();
  }

  /**
   * Launch the stream
   */
  async launch(): Promise<void> {
    this.logger.info('╔════════════════════════════════════════════╗');
    this.logger.info('║   🎬 AI COMMANDER PUBLIC STREAM LAUNCH     ║');
    this.logger.info('╚════════════════════════════════════════════╝');

    this.logger.info('Configuration:', {
      statusPort: this.config.port,
      maxMatches: this.config.maxMatches === 0 ? '∞ (infinite)' : this.config.maxMatches,
      logInterval: `${this.config.logInterval}s`,
    });

    this.logger.info('Starting components...');

    try {
      // Launch the stream (runs forever)
      await this.launcher.launch();

      this.logger.info('✅ Stream launched successfully');
      this.logger.info('');
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.info('📡 BROADCAST OVERLAY');
      this.logger.info(`   URL: http://localhost:${this.config.port}`);
      this.logger.info('   Endpoints:');
      this.logger.info('   - /stream/status (stream state)');
      this.logger.info('   - /arena/stats (arena statistics)');
      this.logger.info('   - /metrics/current (real-time player stats)');
      this.logger.info('   - /metrics/history (historical data)');
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.info('');
      this.logger.info('📊 STREAM RUNNING');
      this.logger.info('   Monitor: logs below');
      this.logger.info('   Ctrl+C to stop');
      this.logger.info('');

      // Handle metrics updates
      this.launcher.on('metrics-update', (update) => {
        this.logger.debug('Metrics update', {
          tick: update.tick,
          players: update.players.length,
        });
      });

      // Handle arena errors with recovery
      this.launcher.on('arena-error', (error) => {
        this.logger.error('⚠️  Arena error (attempting recovery)', { error });
      });

      // Keep process alive
      return new Promise(() => {
        // Never resolves - stream runs forever
      });
    } catch (error) {
      this.logger.error('❌ Failed to launch stream', { error });
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      this.logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);

      try {
        await this.shutdown();
        this.logger.info('✅ Stream stopped');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Catch uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('💥 Uncaught exception', { error });
      shutdown('uncaughtException');
    });

    // Catch unhandled rejections
    process.on('unhandledRejection', (reason) => {
      this.logger.error('💥 Unhandled rejection', { reason });
      shutdown('unhandledRejection');
    });
  }

  /**
   * Shutdown the stream
   */
  private async shutdown(): Promise<void> {
    await this.launcher.shutdown();
  }

  /**
   * Get launcher for testing
   */
  getLauncher(): PublicStreamLauncher {
    return this.launcher;
  }
}

/**
 * Entry point for CLI
 */
export async function streamLaunch(config?: StreamLaunchConfig): Promise<void> {
  const launch = new StreamLaunch(config);
  await launch.launch();
}

// CLI execution
// TODO: Re-enable after switching to ES modules or using a different pattern
// if (import.meta.url === `file://${process.argv[1]}`) {
//   streamLaunch().catch((error) => {
//     console.error('Stream launch failed:', error);
//     process.exit(1);
//   });
// }
