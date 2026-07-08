/**
 * Live Match Runner
 *
 * Orchestrates a visible 0 A.D. match with:
 * - Automatic game launch
 * - Window stays open during match
 * - Real-time AI decisions
 * - Match completion with results
 */

import { Logger } from '../config/logger.js';
import { GameSession } from '@ai-commander/adapter';
import { ZeroADAdapter } from '../adapter.js';
import { BrainInterface, MatchResult } from './simple-match.js';
import { runDualBrainMatch } from './simple-match.js';
import { DecisionOverlay, DecisionSubscriber } from './decision-overlay.js';

export interface LiveMatchConfig {
  readonly brain1: BrainInterface;
  readonly brain2: BrainInterface;
  readonly maxTicks?: number;
  readonly keepWindowOpen?: boolean; // Keep 0 A.D. window open after match
  readonly onDecision?: DecisionSubscriber; // Real-time decision callback
}

export interface LiveMatchResult extends MatchResult {
  readonly overlay: DecisionOverlay; // Access to all recorded decisions
}

/**
 * Run a live match with visible 0 A.D. window
 * Automatically launches the game, runs the match, captures decisions in real-time
 */
export async function runLiveMatch(
  adapter: ZeroADAdapter,
  config: LiveMatchConfig
): Promise<LiveMatchResult> {
  const logger = new Logger('info', 'LiveMatch');
  const matchConfig = {
    brain1: config.brain1,
    brain2: config.brain2,
    maxTicks: config.maxTicks || 5000,
  };

  // Create decision overlay for real-time capture
  const overlay = new DecisionOverlay();
  if (config.onDecision) {
    overlay.subscribe(config.onDecision);
  }

  logger.info(`Starting live match: ${config.brain1.name} vs ${config.brain2.name}`, {
    maxTicks: matchConfig.maxTicks,
    keepWindowOpen: config.keepWindowOpen ?? true,
  });

  // Create and initialize the game session
  let session: GameSession | null = null;

  try {
    // Create a new game session (this will launch 0 A.D.)
    session = await adapter.createSession();
    if (!session) {
      throw new Error('Failed to create game session');
    }

    logger.info('Game session created', { sessionId: session.sessionId });

    // Start the session (launches 0 A.D., connects IPC, starts observation)
    const initialState = await session.start();
    logger.info('Game launched and ready', {
      sessionId: session.sessionId,
      playersCount: initialState.players?.length || 0,
    });

    // Run the match with both brains, passing the overlay for decision capture
    const matchResult = await runDualBrainMatch(
      session,
      config.brain1,
      config.brain2,
      { maxTicks: matchConfig.maxTicks, decisionOverlay: overlay }
    );

    logger.info('Match completed', {
      winner: matchResult.winner,
      ticksRan: matchResult.ticksRan,
      duration: matchResult.duration,
      totalDecisions: overlay.getStats().totalDecisions,
    });

    // Build result with overlay
    const result: LiveMatchResult = {
      ...matchResult,
      overlay,
    };

    // If keepWindowOpen, pause observation but leave process running
    if (config.keepWindowOpen ?? true) {
      logger.info('Keeping 0 A.D. window open (observation paused)', { sessionId: session.sessionId });
      // Don't stop the session yet - keep the window visible
      // User will close manually
      return result;
    }

    // Otherwise, clean shutdown
    await session.stop();
    logger.info('Game session closed');

    return result;
  } catch (error) {
    logger.error('Live match failed', error);

    // Best-effort cleanup
    if (session) {
      try {
        await session.stop();
      } catch (cleanupError) {
        logger.error('Error during cleanup', cleanupError);
      }
    }

    throw error;
  }
}
