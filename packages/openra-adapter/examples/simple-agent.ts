/**
 * Simple OpenRA AI Agent in TypeScript
 *
 * Demonstrates basic gameplay using the OpenRA adapter.
 * Perfect for learning and testing.
 */

import { OpenRARLBridge } from "../src/openra-rl-bridge";

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

class SimpleOpenRAAgent {
  private bridge: OpenRARLBridge;
  private episodeCount = 0;

  constructor() {
    this.bridge = new OpenRARLBridge({
      baseUrl: "http://localhost:8000",
      verbose: true,
    });
  }

  /**
   * Decide what actions to take based on game state
   */
  private decideActions(observation: GameObservation): any[] {
    const units = observation.units || [];
    const buildings = observation.buildings || [];
    const credits = observation.economy?.credits || 0;
    const tick = observation.tick || 0;

    // Log state periodically
    if (tick % 50 === 0 && tick > 0) {
      console.log(
        `  [Tick ${tick}] Units: ${units.length}, Buildings: ${buildings.length}, Credits: ${credits}`
      );
    }

    // For now, just return empty actions (agent is idle)
    // In a real agent, you would:
    // - Analyze units and buildings
    // - Decide on unit movements
    // - Plan building construction
    // - Execute strategy
    return [];
  }

  /**
   * Play one complete game
   */
  async playGame(maxSteps: number = 500): Promise<any> {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Episode ${this.episodeCount + 1}`);
    console.log(`${"=".repeat(70)}`);

    try {
      // Reset game
      console.log("Resetting game...");
      const resetResult = await this.bridge.reset();

      if (!resetResult || !resetResult.observation) {
        console.log("ERROR: Could not reset game");
        console.log("Make sure game content is downloaded:");
        console.log("  cd ./docker-images && bash load-and-run.sh");
        return null;
      }

      const initialObs = resetResult.observation as GameObservation;
      console.log(`Game started!`);
      console.log(`  Initial units: ${initialObs.units?.length || 0}`);
      console.log(`  Initial buildings: ${initialObs.buildings?.length || 0}`);

      this.episodeCount++;

      // Play the game
      let step = 0;
      let totalReward = 0;
      let currentObs = initialObs;

      while (step < maxSteps) {
        // Decide actions
        const actions = this.decideActions(currentObs);

        // Take step
        const stepResult = await this.bridge.step(actions);

        if (!stepResult) {
          console.log(`ERROR: Game error at step ${step}`);
          break;
        }

        currentObs = stepResult.observation as GameObservation;
        const reward = stepResult.reward || 0;
        const done = stepResult.done || false;
        const info = stepResult.info || {};

        totalReward += reward;
        step++;

        if (done) {
          const result = (info as any).result || "unknown";
          console.log(`\nGAME OVER at step ${step}`);
          console.log(`  Result: ${result}`);
          console.log(`  Total Reward: ${totalReward}`);
          break;
        }
      }

      return {
        episode: this.episodeCount,
        steps: step,
        reward: totalReward,
        status: "completed",
      };
    } catch (error) {
      console.error(`ERROR: ${error}`);
      return null;
    }
  }

  /**
   * Run training for multiple games
   */
  async runTraining(numGames: number = 3, maxStepsPerGame: number = 500): Promise<void> {
    console.log(`\n${"#".repeat(70)}`);
    console.log(`Simple OpenRA Agent - Training Session`);
    console.log(`${"#".repeat(70)}`);
    console.log(`Games: ${numGames}`);
    console.log(`Max steps per game: ${maxStepsPerGame}`);

    try {
      // Connect to server
      console.log("\nConnecting to OpenRA server...");
      await this.bridge.connect();
      console.log("✓ Connected");

      const results = [];
      const startTime = Date.now();

      // Play games
      for (let i = 0; i < numGames; i++) {
        const result = await this.playGame(maxStepsPerGame);
        if (result) {
          results.push(result);
        }

        // Small delay between games
        if (i < numGames - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const elapsed = (Date.now() - startTime) / 1000;

      // Print summary
      console.log(`\n${"=".repeat(70)}`);
      console.log(`Training Complete`);
      console.log(`${"=".repeat(70)}`);
      console.log(`Games completed: ${results.length}/${numGames}`);
      console.log(`Time: ${elapsed.toFixed(1)}s`);

      if (results.length > 0) {
        const avgReward =
          results.reduce((sum, r) => sum + r.reward, 0) / results.length;
        console.log(`Average reward: ${avgReward.toFixed(2)}`);
        console.log(`\nResults by game:`);
        results.forEach((r) => {
          console.log(
            `  Game ${r.episode}: ${r.steps} steps, reward=${r.reward.toFixed(2)}`
          );
        });
      }
    } catch (error) {
      console.error(`ERROR: ${error}`);
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
  console.log("Simple OpenRA AI Agent (TypeScript)");
  console.log("=".repeat(70));

  const agent = new SimpleOpenRAAgent();

  try {
    await agent.runTraining(3, 500);
  } finally {
    await agent.close();
    console.log("\nAgent shutdown complete.");
  }
}

main().catch(console.error);
