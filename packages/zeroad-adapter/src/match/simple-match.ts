/**
 * Simple Match Runner
 *
 * Minimal integration of Brain, Framework, and Adapter
 * for STORY 11.3: Dual Ollama Match (Two independent brains)
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

export interface DualBrainMatchConfig {
  readonly brain1: BrainInterface;
  readonly brain2: BrainInterface;
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

/**
 * Run a match with two independent AI brains (Ollama vs Ollama)
 * Each brain has separate observation, memory, and decision context
 */
export async function runDualBrainMatch(
  session: ZeroADGameSession,
  brain1: BrainInterface,
  brain2: BrainInterface,
  config: Partial<DualBrainMatchConfig> = {}
) {
  const logger = new Logger('info', 'DualBrainMatch');
  const matchConfig = { brain1, brain2, maxTicks: 5000, ...config };

  logger.info(`Starting dual-brain match: ${brain1.name} vs ${brain2.name}`, {
    maxTicks: matchConfig.maxTicks,
  });

  // Initialize framework components for brain 1
  const lifecycle1 = new ExternalSystemLifecycle(
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
  await lifecycle1.initialize();

  const monitor1 = new ExecutionMonitor(
    {
      enableMetrics: true,
      checkpointIntervalMs: 5000,
    },
    logger
  );

  // Initialize framework components for brain 2
  const lifecycle2 = new ExternalSystemLifecycle(
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
  await lifecycle2.initialize();

  const monitor2 = new ExecutionMonitor(
    {
      enableMetrics: true,
      checkpointIntervalMs: 5000,
    },
    logger
  );

  let tickCount = 0;
  let currentPlayer = 1; // Alternate between players

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
        monitor1.recordObservation();
        monitor2.recordObservation();
        logger.debug('Observed tick', { tick: tickCount });
      },
      onDecide: async (state) => {
        // Alternate which brain makes decisions
        const brain = currentPlayer === 1 ? brain1 : brain2;
        const monitor = currentPlayer === 1 ? monitor1 : monitor2;
        const lifecycle = currentPlayer === 1 ? lifecycle1 : lifecycle2;

        try {
          const decision = await brain.decide(
            state,
            [], // availableGoals
            [], // availableCommands
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

          logger.debug(`Brain ${currentPlayer} decision`, {
            brain: brain.name,
            reasoning: decision.reasoning?.substring(0, 50) || '(none)',
            commandCount: decision.commands?.length || 0,
          });

          // Alternate to next player for next tick
          currentPlayer = currentPlayer === 1 ? 2 : 1;

          return (decision.commands || []) as any[];
        } catch (error) {
          monitor.recordError(error as Error);
          lifecycle.recordError(error as Error);
          logger.error(`Brain ${currentPlayer} decision failed`, error);

          // Still alternate even on error
          currentPlayer = currentPlayer === 1 ? 2 : 1;

          return [];
        }
      },
      onExecute: async (commands) => {
        const monitor = currentPlayer === 1 ? monitor2 : monitor1; // Already alternated
        if (commands && Array.isArray(commands)) {
          monitor.recordCommands(commands.length);
          logger.debug('Execute phase', {
            player: currentPlayer,
            commandCount: commands.length,
          });
        }
      },
      onError: async (error) => {
        monitor1.recordError(error);
        monitor2.recordError(error);
        lifecycle1.recordError(error);
        lifecycle2.recordError(error);
        logger.error('Match error', error);
      },
    },
    logger
  );

  try {
    await gameLoop.start();

    // Wait for completion
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!session.isActive()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);

      // Safety timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, (matchConfig.maxTicks || 5000) * 100);
    });

    await gameLoop.stop();

    const finalMetrics1 = monitor1.getMetrics();
    const finalMetrics2 = monitor2.getMetrics();
    const brainStatus1 = lifecycle1.getStatus();
    const brainStatus2 = lifecycle2.getStatus();

    logger.info('Dual-brain match completed', {
      player1: brain1.name,
      player1Observations: finalMetrics1.observationCount,
      player1Commands: finalMetrics1.commandCount,
      player1Errors: finalMetrics1.errorCount,
      player2: brain2.name,
      player2Observations: finalMetrics2.observationCount,
      player2Commands: finalMetrics2.commandCount,
      player2Errors: finalMetrics2.errorCount,
    });

    return {
      success: finalMetrics1.isHealthy && finalMetrics2.isHealthy,
      player1: {
        name: brain1.name,
        metrics: finalMetrics1,
        status: brainStatus1,
      },
      player2: {
        name: brain2.name,
        metrics: finalMetrics2,
        status: brainStatus2,
      },
    };
  } catch (error) {
    logger.error('Dual-brain match failed', error);
    return { success: false, error };
  } finally {
    await lifecycle1.shutdown();
    await lifecycle2.shutdown();
  }
}
