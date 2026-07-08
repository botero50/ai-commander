/**
 * Ollama vs Ollama Tournament - Completely Free Local AI
 *
 * Runs two local Ollama instances competing in OpenRA
 */

interface GameResult {
  game: number;
  player1: string;
  player2: string;
  winner: string;
  steps: number;
  duration: number;
}

const GAME_API = "http://localhost:8000";
const OLLAMA_API = "http://localhost:11434/api/generate";
const MODEL = "mistral"; // Change to llama2, neural-chat, or zephyr if preferred

async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${GAME_API}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function resetGame(): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${GAME_API}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Reset failed with status ${response.status}`);
      const text = await response.text();
      console.error(`Response: ${text}`);

      if (response.status === 500) {
        console.error("\n⚠️  Game server error - likely missing game content files");
        console.error("Fix: Run setup-content.sh to download and initialize game content:");
        console.error("  cd docker-images && bash setup-content.sh");
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Reset timeout - game server took too long to initialize`);
      console.error("This usually means the game content files are missing or the server is hung.");
      console.error("Try running: cd docker-images && bash setup-content.sh");
    } else {
      console.error(`Reset error: ${error}`);
    }
    return null;
  }
}

async function stepGame(actions: any[]): Promise<any> {
  try {
    const response = await fetch(`${GAME_API}/step`, {
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

async function askOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch(OLLAMA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Ollama API error: ${error}`);
      return "[]";
    }

    const data: any = await response.json();
    return data.response;
  } catch (error) {
    console.error(`Ollama error: ${error}`);
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

      // Ask Ollama for decision
      const prompt = `You are an OpenRA strategy game AI.
Game Tick: ${tick}
Units: ${units}
Buildings: ${buildings}
Credits: ${credits}

Return ONLY a JSON array of actions. Example: []
If no action needed, return empty array: []`;

      const response = await askOllama(prompt);

      let actions = [];
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\[.*\]/s);
        if (jsonMatch) {
          actions = JSON.parse(jsonMatch[0]);
        }
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
        winner = resultText === "win" ? currentAgent : "draw";
        console.log(`Game Over: ${resultText}`);
        console.log(`Winning Agent: ${winner}`);
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

async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: "test",
        stream: false,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function runTournament(numGames: number = 3): Promise<void> {
  console.log(`\n${"#".repeat(70)}`);
  console.log(`Ollama Tournament - ${MODEL.toUpperCase()}`);
  console.log(`${"#".repeat(70)}`);
  console.log(`Games: ${numGames}`);
  console.log(`Model: ${MODEL}`);

  // Check game server
  console.log("\nChecking OpenRA server...");
  const gameHealthy = await healthCheck();
  if (!gameHealthy) {
    console.error(
      "ERROR: Cannot connect to OpenRA server on localhost:8000"
    );
    console.error("Make sure to run: cd ./docker-images && bash run.sh");
    return;
  }
  console.log("✓ Game server connected");

  // Check Ollama
  console.log("Checking Ollama server...");
  const ollamaHealthy = await checkOllama();
  if (!ollamaHealthy) {
    console.error(
      "ERROR: Cannot connect to Ollama on localhost:11434"
    );
    console.error("Make sure to run: ollama serve");
    console.error("And then: ollama pull " + MODEL);
    return;
  }
  console.log(`✓ Ollama server connected (${MODEL})`);

  const results: GameResult[] = [];
  const startTime = Date.now();

  // Play games
  for (let i = 1; i <= numGames; i++) {
    try {
      const result = await playGame("Ollama-1", "Ollama-2", i, 300);
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
    const ollama1Wins = results.filter((r) => r.winner === "Ollama-1").length;
    const ollama2Wins = results.filter((r) => r.winner === "Ollama-2").length;
    const draws = results.filter((r) => r.winner === "draw").length;

    console.log(`\nWin Count:`);
    console.log(`  Ollama-1: ${ollama1Wins} wins`);
    console.log(`  Ollama-2: ${ollama2Wins} wins`);
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
    if (ollama1Wins > ollama2Wins) {
      console.log(`\n🏆 TOURNAMENT WINNER: Ollama-1`);
    } else if (ollama2Wins > ollama1Wins) {
      console.log(`\n🏆 TOURNAMENT WINNER: Ollama-2`);
    } else {
      console.log(`\n🏆 TOURNAMENT: TIE`);
    }
  }
}

// Main
async function main() {
  console.log("Ollama vs Ollama - OpenRA Tournament");
  console.log("=".repeat(70));

  try {
    await runTournament(3);
  } catch (error) {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main();
