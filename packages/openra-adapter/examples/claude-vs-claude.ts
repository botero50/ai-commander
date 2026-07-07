/**
 * Claude vs Claude Tournament
 *
 * Runs a tournament between two Claude agents to test strategic gameplay.
 */

import { OpenRARLBridge } from "../src/openra-rl-bridge";
import { BrainClaude } from "@ai-commander/brain-claude";

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
  game: number;
  player1: string;
  player2: string;
  winner: string;
  steps: number;
  duration: number;
}

enum StrategyState {
  EARLY_GAME = "early",
  MID_GAME = "mid",
  LATE_GAME = "late",
  DEFEND = "defend",
}

class ClaudeAgent {
  private brain: BrainClaude;
  private strategyState = StrategyState.EARLY_GAME;
  private threatLevel = 0;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.brain = new BrainClaude({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private analyzeSituation(observation: GameObservation): StrategyState {
    const units = observation.units || [];
    const credits = observation.economy?.credits || 0;
    const powerRatio = observation.military?.power_ratio || 0.5;

    this.threatLevel = Math.max(0, 1.0 - powerRatio);

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

  async decideActions(observation: GameObservation): Promise<any[]> {
    this.strategyState = this.analyzeSituation(observation);

    const units = observation.units || [];
    const buildings = observation.buildings || [];
    const credits = observation.economy?.credits || 0;
    const tick = observation.tick || 0;

    // Create a game state summary for Claude
    const gameState = `
Game Tick: ${tick}
Units: ${units.length}
Buildings: ${buildings.length}
Credits: ${credits}
Strategy State: ${this.strategyState.toUpperCase()}
Threat Level: ${(this.threatLevel * 100).toFixed(0)}%

Current situation: ${
      this.strategyState === StrategyState.EARLY_GAME
        ? "Gathering resources and building economy"
        : this.strategyState === StrategyState.MID_GAME
          ? "Building military force"
          : this.strategyState === StrategyState.LATE_GAME
            ? "Ready for aggressive tactics"
            : "Under threat, defending base"
    }
`;

    try {
      // Ask Claude for strategy
      const prompt = `You are an OpenRA strategy game AI. ${gameState}

Based on this situation, what actions should the player take?
Return ONLY a JSON array of actions. Example: []
If no action needed, return empty array: []`;

      const response = await this.brain.decide(prompt);

      // Try to parse actions from response
      try {
        const actions = JSON.parse(response);
        if (Array.isArray(actions)) {
          return actions;
        }
      } catch {
        // Claude might not return valid JSON, return empty actions
        return [];
      }
    } catch (error) {
      console.error(`Claude error for ${this.name}: ${error}`);
      return [];
    }

    return [];
  }

  getName(): string {
    return this.name;
  }
}

class ClaudeVsClaudeTournament {
  private bridge: OpenRARLBridge;
  private results: GameResult[] = [];
  private gameCount = 0;

  constructor() {
    this.bridge = new OpenRARLBridge({
      baseUrl: "http://localhost:8000",
      verbose: false,
    });
  }

  async playGame(
    agent1: ClaudeAgent,
    agent2: ClaudeAgent,
    gameNum: number,
    maxSteps: number = 300
  ): Promise<GameResult> {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Game ${gameNum}: ${agent1.getName()} vs ${agent2.getName()}`);
    console.log(`${"=".repeat(70)}`);

    const startTime = Date.now();

    try {
      // Reset game
      const resetResult = await this.bridge.reset();
      if (!resetResult || !resetResult.observation) {
        console.log("ERROR: Could not reset game");
        throw new Error("Game reset failed");
      }

      let step = 0;
      let currentObs = resetResult.observation as GameObservation;
      let winner = "draw";
      let currentAgent = agent1;

      while (step < maxSteps) {
        // Current agent decides actions
        const actions = await currentAgent.decideActions(currentObs);

        // Take step
        const result = await this.bridge.step(actions);
        if (!result) break;

        currentObs = result.observation as GameObservation;
        const done = result.done || false;
        const info = result.info || {};

        step++;

        if (done) {
          const result_text = (info as any).result || "unknown";
          winner = result_text === "win" ? currentAgent.getName() : "loss";
          console.log(`Game Over: ${result_text}`);
          console.log(`Winning Agent: ${winner}`);
          break;
        }

        if (step % 50 === 0) {
          console.log(
            `  [Tick ${step}] Units: ${currentObs.units?.length || 0}, ` +
              `Buildings: ${currentObs.buildings?.length || 0}, ` +
              `Credits: ${currentObs.economy?.credits || 0}`
          );
        }

        // Alternate agents (simplified - in real game, both play simultaneously)
        currentAgent = currentAgent === agent1 ? agent2 : agent1;
      }

      const duration = (Date.now() - startTime) / 1000;

      return {
        game: gameNum,
        player1: agent1.getName(),
        player2: agent2.getName(),
        winner,
        steps: step,
        duration,
      };
    } catch (error) {
      console.error(`Game error: ${error}`);
      return {
        game: gameNum,
        player1: agent1.getName(),
        player2: agent2.getName(),
        winner: "error",
        steps: 0,
        duration: 0,
      };
    }
  }

  async runTournament(numGames: number = 3, maxStepsPerGame: number = 300): Promise<void> {
    console.log(`\n${"#".repeat(70)}`);
    console.log(`Claude vs Claude Tournament`);
    console.log(`${"#".repeat(70)}`);
    console.log(`Games: ${numGames}`);
    console.log(`Max steps per game: ${maxStepsPerGame}`);

    try {
      // Connect to server
      console.log("\nConnecting to OpenRA server...");
      await this.bridge.connect();
      console.log("✓ Connected");

      // Create Claude agents
      const claudeA = new ClaudeAgent("Claude-A");
      const claudeB = new ClaudeAgent("Claude-B");

      const startTime = Date.now();

      // Play games
      for (let i = 1; i <= numGames; i++) {
        try {
          const result = await this.playGame(claudeA, claudeB, i, maxStepsPerGame);
          this.results.push(result);

          // Delay between games
          if (i < numGames) {
            console.log("Waiting before next game...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Game ${i} failed: ${error}`);
        }
      }

      const totalDuration = (Date.now() - startTime) / 1000;

      // Print tournament summary
      this.printSummary(totalDuration);
    } catch (error) {
      console.error(`Tournament error: ${error}`);
    } finally {
      await this.bridge.disconnect();
    }
  }

  private printSummary(totalDuration: number): void {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Tournament Results`);
    console.log(`${"=".repeat(70)}`);
    console.log(`Games completed: ${this.results.length}`);
    console.log(`Total time: ${totalDuration.toFixed(1)}s`);

    if (this.results.length === 0) {
      console.log("No games completed");
      return;
    }

    // Count wins
    const claudeAWins = this.results.filter((r) => r.winner === "Claude-A").length;
    const claudeBWins = this.results.filter((r) => r.winner === "Claude-B").length;
    const draws = this.results.filter((r) => r.winner === "draw").length;

    console.log(`\nWin Count:`);
    console.log(`  Claude-A: ${claudeAWins} wins`);
    console.log(`  Claude-B: ${claudeBWins} wins`);
    console.log(`  Draws: ${draws}`);

    const avgSteps = Math.round(
      this.results.reduce((sum, r) => sum + r.steps, 0) / this.results.length
    );
    console.log(`\nAverage steps per game: ${avgSteps}`);

    console.log(`\nDetailed Results:`);
    this.results.forEach((r) => {
      console.log(
        `  Game ${r.game}: ${r.player1} vs ${r.player2} → ` +
          `Winner: ${r.winner}, Steps: ${r.steps}, Duration: ${r.duration.toFixed(1)}s`
      );
    });
  }
}

// Main entry point
async function main() {
  console.log("Claude vs Claude - OpenRA Tournament");
  console.log("=".repeat(70));

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY environment variable not set");
    console.error("Get your API key from: https://console.anthropic.com/api_keys");
    process.exit(1);
  }

  const tournament = new ClaudeVsClaudeTournament();

  try {
    // Run tournament: 3 games with 300 steps each
    await tournament.runTournament(3, 300);
  } catch (error) {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main();
