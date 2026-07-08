/**
 * Simple Match Runner
 *
 * Minimal integration of Brain, Framework, and Adapter
 * for STORY 11.3: Dual Ollama Match (Two independent brains)
 */

import { GameLoop, BrainExecutor, ExternalSystemLifecycle, ExecutionMonitor, GameSession } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';
import type { DecisionOverlay } from './decision-overlay.js';

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
  readonly decisionOverlay?: DecisionOverlay; // Optional overlay for real-time decision capture
}

/**
 * Match result captured at completion
 */
export interface MatchResult {
  readonly success: boolean;
  readonly winner?: string; // Brain name of winner
  readonly ticksRan: number;
  readonly duration: number; // milliseconds
  readonly player1: {
    readonly name: string;
    readonly commandsExecuted: number;
    readonly errors: number;
  };
  readonly player2?: {
    readonly name: string;
    readonly commandsExecuted: number;
    readonly errors: number;
  };
  readonly error?: unknown;
}

export async function runSimpleMatch(
  session: GameSession,
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
  const startTime = Date.now();

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

    const duration = Date.now() - startTime;

    return {
      success: finalMetrics.isHealthy,
      winner: brain.name,
      ticksRan: tickCount,
      duration,
      player1: {
        name: brain.name,
        commandsExecuted: finalMetrics.commandCount,
        errors: finalMetrics.errorCount,
      },
    };
  } catch (error) {
    logger.error('Match failed', error);
    const duration = Date.now() - startTime;
    return {
      success: false,
      ticksRan: tickCount,
      duration,
      player1: {
        name: brain.name,
        commandsExecuted: monitor.getMetrics().commandCount,
        errors: monitor.getMetrics().errorCount,
      },
      error,
    };
  } finally {
    await lifecycle.shutdown();
  }
}

/**
 * Run a match with two independent AI brains (Ollama vs Ollama)
 * Each brain has separate observation, memory, and decision context
 */
export async function runDualBrainMatch(
  session: GameSession,
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
  const startTime = Date.now();

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
        const player = currentPlayer === 1 ? 'player1' : 'player2';

        try {
          const startTime = Date.now();
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
          const durationMs = Date.now() - startTime;

          logger.debug(`Brain ${currentPlayer} decision`, {
            brain: brain.name,
            reasoning: decision.reasoning?.substring(0, 50) || '(none)',
            commandCount: decision.commands?.length || 0,
            durationMs,
          });

          // Record decision in overlay (if provided)
          if (matchConfig.decisionOverlay) {
            matchConfig.decisionOverlay.recordDecision(
              tickCount,
              player,
              brain.name,
              decision.reasoning,
              decision.commands || [],
              durationMs
            );
          }

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

    const duration = Date.now() - startTime;

    // Determine winner based on more commands executed (simple heuristic)
    const winner = finalMetrics1.commandCount > finalMetrics2.commandCount ? brain1.name : brain2.name;

    logger.info('Dual-brain match completed', {
      winner,
      player1: brain1.name,
      player1Commands: finalMetrics1.commandCount,
      player1Errors: finalMetrics1.errorCount,
      player2: brain2.name,
      player2Commands: finalMetrics2.commandCount,
      player2Errors: finalMetrics2.errorCount,
      duration,
    });

    return {
      success: finalMetrics1.isHealthy && finalMetrics2.isHealthy,
      winner,
      ticksRan: tickCount,
      duration,
      player1: {
        name: brain1.name,
        commandsExecuted: finalMetrics1.commandCount,
        errors: finalMetrics1.errorCount,
      },
      player2: {
        name: brain2.name,
        commandsExecuted: finalMetrics2.commandCount,
        errors: finalMetrics2.errorCount,
      },
    };
  } catch (error) {
    logger.error('Dual-brain match failed', error);
    const duration = Date.now() - startTime;
    return {
      success: false,
      ticksRan: tickCount,
      duration,
      player1: {
        name: brain1.name,
        commandsExecuted: monitor1.getMetrics().commandCount,
        errors: monitor1.getMetrics().errorCount,
      },
      player2: {
        name: brain2.name,
        commandsExecuted: monitor2.getMetrics().commandCount,
        errors: monitor2.getMetrics().errorCount,
      },
      error,
    };
  } finally {
    await lifecycle1.shutdown();
    await lifecycle2.shutdown();
  }
}
