/**
 * Simple Match Runner
 *
 * Minimal integration of Brain, Framework, and Adapter
 * for STORY 11.2: Single AI Control
 */

import { GameLoop, BrainExecutor, ExternalSystemLifecycle, ExecutionMonitor } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';
import { ZeroADGameSession } from '../session/game-session.js';

/**
 * Generic Brain interface (avoid importing from @ai-commander/brain to stay within rootDir)
 */
export interface BrainInterface {
  readonly name: string;
  readonly version: string;
  decide(
    observation: any,
    availableGoals: readonly any[],
    availableCommands: readonly any[],
    memory: any
  ): Promise<{ reasoning?: string; commands?: string[] }>;
}

export interface SimpleMatchConfig {
  readonly brain: BrainInterface;
  readonly maxTicks?: number;
}

export async function runSimpleMatch(
  session: ZeroADGameSession,
  brain: BrainInterface,
  config: Partial<SimpleMatchConfig> = {}
) {
  const logger = new Logger('info', 'SimpleMatch');
  const matchConfig = { brain, maxTicks: 5000, ...config };

  logger.info(`Starting simple match with ${brain.name}`, {
    maxTicks: matchConfig.maxTicks,
  });

  // Initialize framework components
  const brainExecutor = new BrainExecutor(
    {
      decisionTimeoutMs: 30000,
      maxRetries: 2,
      retryDelayMs: 1000,
      enableTelemetry: false,
    },
    logger
  );

  const lifecycle = new ExternalSystemLifecycle(
    {
      initTimeoutMs: 10000,
      healthCheckIntervalMs: 5000,
      errorThreshold: 5,
      errorWindowMs: 60000,
      recoveryAttempts: 3,
      recoveryDelayMs: 1000,
    },
    logger
  );
  await lifecycle.initialize();

  const monitor = new ExecutionMonitor(
    {
      enableMetrics: true,
      checkpointIntervalMs: 5000,
    },
    logger
  );

  let tickCount = 0;

  const gameLoop = new GameLoop(
    session,
    {
      tickDurationMs: 50,
      maxIterations: matchConfig.maxTicks,
      observeTimeoutMs: 1000,
    },
    {
      onObserve: async (state) => {
        tickCount++;
        monitor.recordObservation();
        logger.debug('Observed tick', { tick: tickCount });
      },
      onDecide: async (state) => {
        try {
          // Call brain decision directly (avoids BrainExecutor which expects complex types)
          const decision = await brain.decide(
            state,
            [], // availableGoals (empty for now)
            [], // availableCommands (empty for now)
            {
              // ExecutionMemory
              recentEvents: [],
              recentDecisions: [],
              metrics: {
                commandsExecuted: 0,
                commandsFailed: 0,
                goalsCompleted: 0,
                goalsAbandoned: 0,
              },
            }
          );

          logger.debug('Brain decision', {
            reasoning: decision.reasoning?.substring(0, 50) || '(none)',
            commandCount: decision.commands?.length || 0,
          });

          return (decision.commands || []) as any[];
        } catch (error) {
          monitor.recordError(error as Error);
          lifecycle.recordError(error as Error);
          logger.error('Brain decision failed', error);
          return [];
        }
      },
      onExecute: async (commands) => {
        if (commands && Array.isArray(commands)) {
          monitor.recordCommands(commands.length);
          logger.debug('Execute phase', { commandCount: commands.length });
        }
      },
      onError: async (error) => {
        monitor.recordError(error);
        lifecycle.recordError(error);
        logger.error('Match error', error);
      },
    },
    logger
  );

  try {
    await gameLoop.start();

    // Wait for completion (game ends naturally or reaches max ticks)
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!session.isActive()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);

      // Safety timeout: if game doesn't end, stop after max iterations
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, (matchConfig.maxTicks || 5000) * 100); // ms per tick
    });

    await gameLoop.stop();

    const finalMetrics = monitor.getMetrics();
    const brainStatus = lifecycle.getStatus();

    logger.info('Match completed', {
      observations: finalMetrics.observationCount,
      commands: finalMetrics.commandCount,
      errors: finalMetrics.errorCount,
      brainStatus,
      isHealthy: finalMetrics.isHealthy,
    });

    return {
      success: finalMetrics.isHealthy,
      metrics: finalMetrics,
      brainStatus,
    };
  } catch (error) {
    logger.error('Match failed', error);
    return { success: false, error };
  } finally {
    await lifecycle.shutdown();
  }
}
