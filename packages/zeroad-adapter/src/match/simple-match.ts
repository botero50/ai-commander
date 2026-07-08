/**
 * Simple Match Runner
 *
 * Minimal integration of Brain, Framework, and Adapter
 * for STORY 11.1: Local Ollama Integration
 */

import { GameLoop, BrainExecutor, ExternalSystemLifecycle, ExecutionMonitor } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';
import { ZeroADGameSession } from '../session/game-session.js';

export interface SimpleMatchConfig {
  readonly brainName: string;
  readonly maxTicks?: number;
}

export async function runSimpleMatch(
  session: ZeroADGameSession,
  brainName: string,
  config: Partial<SimpleMatchConfig> = {}
) {
  const logger = new Logger('info', 'SimpleMatch');
  const matchConfig = { brainName, maxTicks: 5000, ...config };

  logger.info(`Starting simple match with ${brainName}`, {
    maxTicks: matchConfig.maxTicks,
  });

  // Initialize framework components
  const gameLoop = new GameLoop(
    session,
    {
      tickDurationMs: 50,
      maxIterations: matchConfig.maxTicks,
      observeTimeoutMs: 1000,
    },
    {
      onObserve: async (state) => {
        logger.debug('Observed tick', { tick: (state as any).tick });
      },
      onDecide: async () => {
        // Placeholder: would call brain here in Story 11.2
        logger.debug('Decision phase (placeholder)');
        return [];
      },
      onExecute: async (commands) => {
        logger.debug('Execute phase', { commandCount: commands?.length || 0 });
      },
      onError: async (error) => {
        logger.error('Match error', error);
      },
    },
    logger
  );

  // Initialize lifecycle tracking
  const lifecycle = new ExternalSystemLifecycle({}, logger);
  await lifecycle.initialize();

  // Initialize monitoring
  const monitor = new ExecutionMonitor({}, logger);

  try {
    await gameLoop.start();

    // Wait for completion
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const metrics = monitor.getMetrics();
        if (metrics.observationCount > 100) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 1000);
    });

    await gameLoop.stop();

    const metrics = monitor.getMetrics();
    logger.info('Match completed', {
      observations: metrics.observationCount,
      commands: metrics.commandCount,
      errors: metrics.errorCount,
    });

    return { success: true, metrics };
  } catch (error) {
    logger.error('Match failed', error);
    return { success: false, error };
  } finally {
    await lifecycle.shutdown();
  }
}
