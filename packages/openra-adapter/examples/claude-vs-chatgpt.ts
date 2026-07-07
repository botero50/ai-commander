/**
 * ChatGPT vs ChatGPT Tournament
 *
 * Runs a tournament between two ChatGPT agents in OpenRA.
 * Both agents use OpenAI API for strategy decisions.
 */

import { OpenRARLBridge } from "../src/openra-rl-bridge";
import { BrainOpenAI } from "@ai-commander/brain-openai";

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

const StrategyState = {
  EARLY_GAME: "early" as const,
  MID_GAME: "mid" as const,
  LATE_GAME: "late" as const,
  DEFEND: "defend" as const,
};

type StrategyStateType = typeof StrategyState[keyof typeof StrategyState];

class ChatGPTAgent {
  private brain: BrainOpenAI;
  private strategyState: StrategyStateType = StrategyState.EARLY_GAME;
  private threatLevel = 0;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.brain = new BrainOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4-turbo",
    });
  }

  private analyzeSituation(observation: GameObservation): StrategyStateType {
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

    // Create a game state summary for ChatGPT
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
      // Ask ChatGPT for strategy
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
        // ChatGPT might not return valid JSON, return empty actions
        return [];
      }
    } catch (error) {
      console.error(`ChatGPT error for ${this.name}: ${error}`);
      return [];
    }

    return [];
  }

  getName(): string {
    return this.name;
  }
}

class ChatGPTVsChatGPTTournament {
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
    agent1: ChatGPTAgent,
    agent2: ChatGPTAgent,
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
    console.log(`ChatGPT vs ChatGPT Tournament`);
    console.log(`${"#".repeat(70)}`);
    console.log(`Games: ${numGames}`);
    console.log(`Max steps per game: ${maxStepsPerGame}`);

    try {
      // Connect to server
      console.log("\nConnecting to OpenRA server...");
      await this.bridge.connect();
      console.log("✓ Connected");

      // Create two ChatGPT agents
      const chatgpt1 = new ChatGPTAgent("ChatGPT-1");
      const chatgpt2 = new ChatGPTAgent("ChatGPT-2");

      const startTime = Date.now();

      // Play games
      for (let i = 1; i <= numGames; i++) {
        try {
          const result = await this.playGame(chatgpt1, chatgpt2, i, maxStepsPerGame);
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
    const chatgpt1Wins = this.results.filter((r) => r.winner === "ChatGPT-1").length;
    const chatgpt2Wins = this.results.filter((r) => r.winner === "ChatGPT-2").length;
    const draws = this.results.filter((r) => r.winner === "draw").length;

    console.log(`\nWin Count:`);
    console.log(`  ChatGPT-1: ${chatgpt1Wins} wins`);
    console.log(`  ChatGPT-2: ${chatgpt2Wins} wins`);
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

    // Tournament winner
    if (chatgpt1Wins > chatgpt2Wins) {
      console.log(`\n🏆 TOURNAMENT WINNER: ChatGPT-1`);
    } else if (chatgpt2Wins > chatgpt1Wins) {
      console.log(`\n🏆 TOURNAMENT WINNER: ChatGPT-2`);
    } else {
      console.log(`\n🏆 TOURNAMENT: TIE`);
    }
  }
}

// Main entry point
async function main() {
  console.log("ChatGPT vs ChatGPT - OpenRA Tournament");
  console.log("=".repeat(70));

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable not set");
    console.error("Get your API key from: https://platform.openai.com/api_keys");
    process.exit(1);
  }

  const tournament = new ChatGPTVsChatGPTTournament();

  try {
    // Run tournament: 3 games with 300 steps each
    await tournament.runTournament(3, 300);
  } catch (error) {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main();
