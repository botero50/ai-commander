/**
 * Arena Research Integration
 *
 * Bridges the autonomous chess arena (arena.js) with the Research Data Store.
 * Subscribes to game events and persists complete research artifacts.
 *
 * Key principle: Arena publishes events, Research Store subscribes.
 * No tight coupling, fully decoupled architecture.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { getGameEventBus } from './game-event-bus.js';

// This will be imported from the research-store package
// For now, we'll load it dynamically to handle the monorepo structure
let ResearchDataAccessLayer = null;
let ResearchEventBus = null;
let ResearchDatabase = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ArenaResearchIntegration {
  constructor() {
    this.gameEventBus = getGameEventBus();
    this.research = null;
    this.database = null;
    this.experimentId = null;
    this.runId = null;
    this.gameCount = 0;
  }

  /**
   * Initialize research integration
   * Sets up database and event subscriptions
   */
  async initialize(dbPath, schemaPath) {
    try {
      // Dynamically import research store modules
      const researchStoreModule = await import(
        path.join(__dirname, 'packages/zeroad-adapter/src/research-store/index.js')
      ).catch(async () => {
        // Fallback: try alternate path
        return await import(
          path.join(__dirname, 'packages/zeroad-adapter/dist/research-store/index.js')
        );
      });

      // Extract classes from module
      ResearchDatabase = researchStoreModule.ResearchDatabase;
      ResearchEventBus = researchStoreModule.ResearchEventBus;
      ResearchDataAccessLayer = researchStoreModule.ResearchDataAccessLayer;

      if (!ResearchDatabase || !ResearchDataAccessLayer) {
        throw new Error('Research Store modules not found');
      }

      // Initialize database
      this.database = new ResearchDatabase({
        dbPath,
        schemaPath,
      });
      await this.database.initialize();

      // Create research event bus (separate from game event bus)
      const researchEventBus = new ResearchEventBus();

      // Create data access layer
      this.research = new ResearchDataAccessLayer(this.database, researchEventBus);

      // Subscribe to game events
      this.subscribeToGameEvents();

      console.log('✅ Research integration initialized');
      console.log(`   Database: ${dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize research integration:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to game events from the arena
   */
  subscribeToGameEvents() {
    // Subscribe to game.started
    this.gameEventBus.subscribe('game.started', async (event) => {
      try {
        // Note: Game is already recorded when game.finished is emitted
        // This is just for reference/logging
      } catch (error) {
        console.error('Error handling game.started event:', error.message);
      }
    });

    // Subscribe to move.made
    this.gameEventBus.subscribe('move.made', async (event) => {
      try {
        if (!this.research) return;

        // Record move
        await this.research.recordMove({
          gameId: event.gameId,
          number: event.moveNumber,
          color: event.color,
          san: event.san,
          fenBefore: event.fenBefore,
          fenAfter: event.fenAfter,
          latencyMs: event.latencyMs,
          confidence: event.confidence,
          modelName: event.color === 'white' ? 'unknown' : 'unknown', // Set by caller
          configId: 'default',
          illegalRetries: 0,
        });

        // Record LLM decision
        if (event.decision) {
          await this.research.recordDecision({
            moveId: event.moveNumber,
            modelIdentifier: 'ollama:unknown', // Set by caller
            configId: 'default',
            prompt: event.decision.prompt,
            response: event.decision.response,
            parsingStatus: event.decision.parsingStatus,
            parsedMove: event.san,
            reasoning: '',
            confidence: event.confidence,
            tokensIn: event.decision.tokensIn,
            tokensOut: event.decision.tokensOut,
          });
        }

        // Record position
        await this.research.recordPosition(event.fenAfter);
      } catch (error) {
        console.error('Error handling move.made event:', error.message);
      }
    });

    // Subscribe to game.finished
    this.gameEventBus.subscribe('game.finished', async (event) => {
      try {
        if (!this.research) return;

        // Record game
        await this.research.recordGame({
          gameId: event.gameId,
          runId: this.runId,
          whiteModel: event.whiteModel,
          blackModel: event.blackModel,
          result: event.result,
          pgn: event.pgn,
          finalFen: event.finalFen,
          moveCount: event.moveCount,
          durationMs: event.durationMs,
          termination: 'normal',
          openingEco: 'unknown',
          openingName: 'unknown',
        });

        this.gameCount++;
      } catch (error) {
        console.error('Error handling game.finished event:', error.message);
      }
    });
  }

  /**
   * Start an experiment
   */
  async startExperiment(input) {
    try {
      if (!this.research) {
        throw new Error('Research not initialized');
      }

      const result = await this.research.createExperiment(input);
      this.experimentId = result;
      console.log(`✅ Experiment started: ${this.experimentId}`);
      return this.experimentId;
    } catch (error) {
      console.error('❌ Failed to start experiment:', error.message);
      throw error;
    }
  }

  /**
   * Start a run within the experiment
   */
  async startRun(input, environment) {
    try {
      if (!this.research) {
        throw new Error('Research not initialized');
      }

      const result = await this.research.startRun(input, environment);
      this.runId = result;
      this.gameCount = 0;
      console.log(`✅ Run started: ${this.runId}`);
      return this.runId;
    } catch (error) {
      console.error('❌ Failed to start run:', error.message);
      throw error;
    }
  }

  /**
   * Record a game result
   * Note: Actual game recording happens via game.finished event subscription
   */
  async recordGameResult(result, matchConfig) {
    try {
      if (!this.research) return;

      // Game is already recorded via event subscription
      // This is a no-op - kept for backward compatibility
    } catch (error) {
      console.error('❌ Failed to record game:', error.message);
      throw error;
    }
  }

  /**
   * Finish the current run
   */
  async finishRun(status, gameCount) {
    try {
      if (!this.research) return;

      // Note: In the current architecture, runs are finished after each game
      // This is for explicit cleanup at session end
      console.log(`✅ Run finished: ${status} (${this.gameCount} games recorded)`);
    } catch (error) {
      console.error('❌ Failed to finish run:', error.message);
      throw error;
    }
  }

  /**
   * Finish the experiment
   */
  async finishExperiment(status, gameCount) {
    try {
      if (!this.research) return;

      console.log(`✅ Experiment finished: ${status} (${this.gameCount} games recorded)`);
    } catch (error) {
      console.error('❌ Failed to finish experiment:', error.message);
      throw error;
    }
  }

  /**
   * Flush and close the research store
   */
  async stop() {
    try {
      if (this.research) {
        // Flush any pending writes
        await this.research.stop();
      }

      if (this.database) {
        this.database.close();
      }

      console.log('✅ Research store closed');
    } catch (error) {
      console.error('❌ Failed to stop research:', error.message);
      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      experimentId: this.experimentId,
      runId: this.runId,
      gamesRecorded: this.gameCount,
    };
  }
}
