/**
 * Advanced OpenRA AI Agent in TypeScript
 *
 * Features:
 * - Multi-state strategy system (EARLY/MID/LATE/DEFEND)
 * - Threat assessment
 * - Resource tracking
 * - Tournament mode
 */

import { OpenRARLBridge } from "../src/openra-rl-bridge";

enum StrategyState {
  EARLY_GAME = "early",
  MID_GAME = "mid",
  LATE_GAME = "late",
  DEFEND = "defend",
}

interface GameObservation {
  tick: number;
  episode_id: string | null;
  units: any[];
  buildings: any[];
  economy: {
    credits: number;
    power_usage: number;
    power_available: number;
  };
  military: {
    power_ratio: number;
  };
}

interface GameResult {
  episode: number;
  steps: number;
  reward: number;
  strategy: string;
}

class AdvancedOpenRAAgent {
  private bridge: OpenRARLBridge;
  private episodeCount = 0;
  private strategy: string;
  private strategyState = StrategyState.EARLY_GAME;
  private threatLevel = 0;

  constructor(strategy: string = "aggressive") {
    this.bridge = new OpenRARLBridge({
      baseUrl: "http://localhost:8000",
      verbose: false,
    });
    this.strategy = strategy;
  }

  /**
   * Analyze game situation and determine strategy
   */
  private analyzeSituation(observation: GameObservation): StrategyState {
    const units = observation.units || [];
    const buildings = observation.buildings || [];
    const credits = observation.economy?.credits || 0;
    const powerRatio = observation.military?.power_ratio || 0.5;

    // Update threat level
    this.threatLevel = Math.max(0, 1.0 - powerRatio);

    // Determine strategy based on game state
    if (credits > 5000 && units.length > 15) {
      return StrategyState.LATE_GAME;
    } else if (units.length > 5) {
      return StrategyState.MID_GAME;
    } else if (this.threatLevel > 0.6) {
      return StrategyState.DEFEND;
    } else {
      return StrategyState.EARLY_GAME;
    }
  }

  /**
   * Decide actions based on strategy
   */
  private decideActions(observation: GameObservation): any[] {
    // Update strategy state
    this.strategyState = this.analyzeSituation(observation);

    const units = observation.units || [];
    const buildings = observation.buildings || [];
    const credits = observation.economy?.credits || 0;
    const tick = observation.tick || 0;

    // Log state every 50 ticks
    if (tick % 50 === 0 && tick > 0) {
      console.log(
        `  [Tick ${tick}] Strategy: ${this.strategyState.toUpperCase()} | ` +
          `Units: ${units.length} | Buildings: ${buildings.length} | ` +
          `Credits: ${credits} | Threat: ${(this.threatLevel * 100).toFixed(0)}%`
      );
    }

    // Based on strategy, decide actions
    const actions: any[] = [];

    switch (this.strategyState) {
      case StrategyState.EARLY_GAME:
        // Early game: focus on economy, let harvesters work
        break;

      case StrategyState.MID_GAME:
        // Mid game: build military
        if (credits > 1000 && units.length < 10) {
          // Could build units here
        }
        break;

      case StrategyState.LATE_GAME:
        // Late game: aggressive attacks
        if (units.length > 10) {
          // Could attack with units
        }
        break;

      case StrategyState.DEFEND:
        // Defend: counter enemy attacks
        if (units.length > 0) {
          // Defensive strategy
        }
        break;
    }

    return actions;
  }

  /**
   * Play one game
   */
  async playGame(maxSteps: number = 300): Promise<GameResult | null> {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Episode ${this.episodeCount + 1} - Strategy: ${this.strategy}`);
    console.log(`${"=".repeat(70)}`);

    try {
      // Reset game
      console.log("Initializing game...");
      const resetResult = await this.bridge.reset();

      if (!resetResult || !resetResult.observation) {
        console.log("ERROR: Could not initialize game");
        console.log("\nTo fix this, download game content:");
        console.log("  cd ./docker-images");
        console.log("  bash load-and-run.sh");
        return null;
      }

      const initialObs = resetResult.observation as GameObservation;
      console.log(`Game started! Initial state:`);
      console.log(`  Units: ${initialObs.units?.length || 0}`);
      console.log(`  Buildings: ${initialObs.buildings?.length || 0}`);
      console.log(`  Credits: ${initialObs.economy?.credits || 0}`);

      this.episodeCount++;

      // Play game
      let step = 0;
      let totalReward = 0;
      let currentObs = initialObs;

      while (step < maxSteps) {
        // Decide and take action
        const actions = this.decideActions(currentObs);
        const result = await this.bridge.step(actions);

        if (!result) {
          console.log(`ERROR: Game error at step ${step}`);
          break;
        }

        currentObs = result.observation as GameObservation;
        const reward = result.reward || 0;
        const done = result.done || false;
        const info = result.info || {};

        totalReward += reward;
        step++;

        if (done) {
          const resultText = (info as any).result || "unknown";
          console.log(`\nGAME OVER!`);
          console.log(`  Step: ${step}`);
          console.log(`  Result: ${resultText}`);
          console.log(`  Total Reward: ${totalReward.toFixed(2)}`);
          break;
        }
      }

      return {
        episode: this.episodeCount,
        steps: step,
        reward: totalReward,
        strategy: this.strategy,
      };
    } catch (error) {
      console.error(`ERROR: ${error}`);
      return null;
    }
  }

  /**
   * Run tournament
   */
  async runTournament(
    numGames: number = 5,
    maxSteps: number = 300
  ): Promise<void> {
    console.log(`\n${"#".repeat(70)}`);
    console.log(`Advanced OpenRA Agent - Tournament`);
    console.log(`${"#".repeat(70)}`);
    console.log(`Strategy: ${this.strategy}`);
    console.log(`Games: ${numGames}`);
    console.log(`Max steps per game: ${maxSteps}`);

    try {
      // Connect
      console.log("\nConnecting to server...");
      await this.bridge.connect();
      console.log("✓ Connected");
      console.log("=".repeat(70));

      const results: GameResult[] = [];
      const startTime = Date.now();

      // Play games
      for (let i = 0; i < numGames; i++) {
        const result = await this.playGame(maxSteps);
        if (result) {
          results.push(result);
        }

        if (i < numGames - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const elapsed = (Date.now() - startTime) / 1000;

      // Summary
      console.log(`\n${"=".repeat(70)}`);
      console.log(`Tournament Results`);
      console.log(`${"=".repeat(70)}`);
      console.log(`Games completed: ${results.length}/${numGames}`);
      console.log(`Time: ${elapsed.toFixed(1)}s`);

      if (results.length > 0) {
        const rewards = results.map((r) => r.reward);
        const steps = results.map((r) => r.steps);

        const minReward = Math.min(...rewards);
        const maxReward = Math.max(...rewards);
        const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;

        const minSteps = Math.min(...steps);
        const maxSteps = Math.max(...steps);
        const avgSteps = Math.floor(steps.reduce((a, b) => a + b, 0) / steps.length);

        console.log(
          `\nRewards: min=${minReward.toFixed(2)}, avg=${avgReward.toFixed(2)}, max=${maxReward.toFixed(2)}`
        );
        console.log(
          `Steps: min=${minSteps}, avg=${avgSteps}, max=${maxSteps}`
        );

        console.log(`\nPer-game results:`);
        results.forEach((r) => {
          console.log(
            `  Game ${r.episode}: steps=${r.steps}, reward=${r.reward.toFixed(2)}`
          );
        });
      }
    } catch (error) {
      console.error(`ERROR: ${error}`);
    } finally {
      await this.bridge.disconnect();
    }
  }

  /**
   * Cleanup
   */
  async close(): Promise<void> {
    await this.bridge.disconnect();
  }
}

// Main entry point
async function main() {
  console.log("Advanced OpenRA Agent (TypeScript)");
  console.log("=".repeat(70));

  const agent = new AdvancedOpenRAAgent("aggressive");

  try {
    await agent.runTournament(3, 300);
  } catch (error) {
    console.error(error);
  } finally {
    await agent.close();
    console.log("\nAgent shutdown complete.");
  }
}

main().catch(console.error);
