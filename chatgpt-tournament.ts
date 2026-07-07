/**
 * ChatGPT vs ChatGPT Tournament - Standalone
 *
 * Simple tournament runner without monorepo dependencies
 */

interface GameResult {
  game: number;
  player1: string;
  player2: string;
  winner: string;
  steps: number;
  duration: number;
}

const API_BASE = "http://localhost:8000";

async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function resetGame(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      console.error(`Reset failed with status ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Reset error: ${error}`);
    return null;
  }
}

async function stepGame(actions: any[]): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Step error: ${error}`);
    return null;
  }
}

async function askChatGPT(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`ChatGPT API error: ${error}`);
      return "[]";
    }

    const data: any = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`ChatGPT error: ${error}`);
    return "[]";
  }
}

async function playGame(
  agent1Name: string,
  agent2Name: string,
  gameNum: number,
  maxSteps: number = 300
): Promise<GameResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Game ${gameNum}: ${agent1Name} vs ${agent2Name}`);
  console.log(`${"=".repeat(70)}`);

  const startTime = Date.now();

  try {
    // Reset game
    const resetResult = await resetGame();
    if (!resetResult || !resetResult.observation) {
      console.log("ERROR: Could not reset game");
      throw new Error("Game reset failed");
    }

    let step = 0;
    let currentObs = resetResult.observation;
    let winner = "draw";
    let currentAgent = agent1Name;

    while (step < maxSteps) {
      const units = currentObs.units?.length || 0;
      const buildings = currentObs.buildings?.length || 0;
      const credits = currentObs.economy?.credits || 0;
      const tick = currentObs.tick || 0;

      // Ask ChatGPT for decision
      const prompt = `You are an OpenRA strategy game AI.
Game Tick: ${tick}
Units: ${units}
Buildings: ${buildings}
Credits: ${credits}

Return ONLY a JSON array of actions. Example: []
If no action needed, return empty array: []`;

      const response = await askChatGPT(prompt);

      let actions = [];
      try {
        actions = JSON.parse(response);
        if (!Array.isArray(actions)) {
          actions = [];
        }
      } catch {
        actions = [];
      }

      // Take step
      const result = await stepGame(actions);
      if (!result) break;

      currentObs = result.observation;
      const done = result.done || false;
      const info = result.info || {};

      step++;

      if (done) {
        const resultText = (info as any).result || "unknown";
        winner =
          resultText === "win" ? currentAgent : resultText === "loss" ? "other" : "draw";
        console.log(`Game Over: ${resultText}`);
        console.log(`Winning Agent: ${winner === "other" ? (currentAgent === agent1Name ? agent2Name : agent1Name) : winner === "draw" ? "draw" : currentAgent}`);
        break;
      }

      if (step % 50 === 0) {
        console.log(
          `  [Tick ${step}] Units: ${units}, ` +
            `Buildings: ${buildings}, ` +
            `Credits: ${credits}`
        );
      }

      // Alternate agents
      currentAgent = currentAgent === agent1Name ? agent2Name : agent1Name;
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      game: gameNum,
      player1: agent1Name,
      player2: agent2Name,
      winner,
      steps: step,
      duration,
    };
  } catch (error) {
    console.error(`Game error: ${error}`);
    return {
      game: gameNum,
      player1: agent1Name,
      player2: agent2Name,
      winner: "error",
      steps: 0,
      duration: 0,
    };
  }
}

async function runTournament(numGames: number = 3): Promise<void> {
  console.log(`\n${"#".repeat(70)}`);
  console.log(`ChatGPT vs ChatGPT Tournament`);
  console.log(`${"#".repeat(70)}`);
  console.log(`Games: ${numGames}`);

  // Check server
  console.log("\nChecking OpenRA server...");
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error(
      "ERROR: Cannot connect to OpenRA server on localhost:8000"
    );
    console.error("Make sure to run: cd ./docker-images && bash run.sh");
    return;
  }
  console.log("✓ Server connected");

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable not set");
    return;
  }
  console.log("✓ API key configured");

  const results: GameResult[] = [];
  const startTime = Date.now();

  // Play games
  for (let i = 1; i <= numGames; i++) {
    try {
      const result = await playGame("ChatGPT-1", "ChatGPT-2", i, 300);
      results.push(result);

      if (i < numGames) {
        console.log("Waiting before next game...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Game ${i} failed: ${error}`);
    }
  }

  const totalDuration = (Date.now() - startTime) / 1000;

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Tournament Results`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Games completed: ${results.length}/${numGames}`);
  console.log(`Total time: ${totalDuration.toFixed(1)}s`);

  if (results.length > 0) {
    const chatgpt1Wins = results.filter((r) => r.winner === "ChatGPT-1").length;
    const chatgpt2Wins = results.filter((r) => r.winner === "ChatGPT-2").length;
    const draws = results.filter((r) => r.winner === "draw").length;

    console.log(`\nWin Count:`);
    console.log(`  ChatGPT-1: ${chatgpt1Wins} wins`);
    console.log(`  ChatGPT-2: ${chatgpt2Wins} wins`);
    console.log(`  Draws: ${draws}`);

    const avgSteps = Math.round(
      results.reduce((sum, r) => sum + r.steps, 0) / results.length
    );
    console.log(`\nAverage steps per game: ${avgSteps}`);

    console.log(`\nDetailed Results:`);
    results.forEach((r) => {
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

// Main
async function main() {
  console.log("ChatGPT vs ChatGPT - OpenRA Tournament");
  console.log("=".repeat(70));

  try {
    await runTournament(3);
  } catch (error) {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main();
