# Ollama Local AI Tournament Setup

Run a ChatGPT vs ChatGPT-like tournament using **Ollama** - completely free and runs locally.

---

## Step 1: Install Ollama

### Windows

1. Download Ollama for Windows:
   https://ollama.ai/download/windows

2. Run the installer and follow the setup wizard

3. Verify installation:
   ```powershell
   ollama --version
   ```

4. Ollama will start automatically and listen on `http://localhost:11434`

---

## Step 2: Download an LLM Model

Open PowerShell and run:

```powershell
ollama pull mistral
```

Or try these models (pick one):

```powershell
ollama pull llama2          # Meta's Llama 2 (7B, fast)
ollama pull mistral         # Mistral (7B, good quality)
ollama pull neural-chat     # NeuralChat (7B, chatty)
ollama pull zephyr          # Zephyr (7B, instruction-tuned)
```

**First download takes 5-10 minutes** depending on your internet.

Verify the model is installed:
```powershell
ollama list
```

---

## Step 3: Create the Ollama Tournament Runner

Create a file called `ollama-tournament.ts`:

```typescript
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
    const response = await fetch(`${GAME_API}/reset`, {
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
```

Save this as `ollama-tournament.ts` in `C:\Users\boter\ai-commander\`

---

## Step 4: Run the Tournament

You need **3 separate terminals**:

### Terminal 1 - Start Game Server:
```powershell
cd C:\Users\boter\ai-commander\docker-images
bash run.sh
```

Wait for:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Start Ollama:
```powershell
ollama serve
```

You should see:
```
listening on 127.0.0.1:11434
```

### Terminal 3 - Download Content (First Time Only):
```powershell
cd C:\Users\boter\ai-commander\docker-images
bash load-and-run.sh
```

Wait for it to complete.

### Terminal 4 - Run Tournament:
```powershell
cd C:\Users\boter\ai-commander
npx ts-node ollama-tournament.ts
```

---

## Expected Output

```
Ollama vs Ollama - OpenRA Tournament
======================================================================

######################################################################
Ollama Tournament - MISTRAL
######################################################################
Games: 3
Model: mistral

Checking OpenRA server...
✓ Game server connected
Checking Ollama server...
✓ Ollama server connected (mistral)

======================================================================
Game 1: Ollama-1 vs Ollama-2
======================================================================
[Game progresses...]

======================================================================
Game 2: Ollama-1 vs Ollama-2
======================================================================
[Game progresses...]

======================================================================
Game 3: Ollama-1 vs Ollama-2
======================================================================
[Game progresses...]

======================================================================
Tournament Results
======================================================================
Games completed: 3/3
Total time: 450.3s

Win Count:
  Ollama-1: 1 wins
  Ollama-2: 2 wins
  Draws: 0

Average steps per game: 145

🏆 TOURNAMENT WINNER: Ollama-2
```

---

## Model Options

| Model | Size | Speed | Quality | RAM |
|-------|------|-------|---------|-----|
| mistral | 7B | Fast | Good | 4GB |
| llama2 | 7B | Medium | Good | 4GB |
| neural-chat | 7B | Fast | Medium | 4GB |
| zephyr | 7B | Fast | Good | 4GB |
| dolphin-mixtral | 8x7B | Slow | Excellent | 16GB |

**Recommended**: Start with `mistral` (good balance of speed and quality)

---

## Troubleshooting

### Ollama not found
```powershell
# Check if Ollama is installed
ollama --version

# If not found, download from https://ollama.ai
```

### Model not found
```powershell
# Download the model
ollama pull mistral

# Or download another model
ollama pull llama2
```

### Connection refused on 11434
```powershell
# Make sure Ollama is running
ollama serve

# In another terminal, test the connection
curl -X POST http://localhost:11434/api/generate `
  -H "Content-Type: application/json" `
  -d "{\"model\": \"mistral\", \"prompt\": \"test\"}"
```

### Game server not responding
```powershell
# Make sure the game server is running
cd ./docker-images
bash run.sh
```

---

## Customization

Edit `ollama-tournament.ts` to change:

```typescript
const MODEL = "mistral";     // Change to llama2, neural-chat, etc
const maxSteps = 300;        // Change game length
const numGames = 3;          // Change number of games
```

---

## Cost & Performance

- **Cost**: $0 (completely free, runs locally)
- **Speed**: First game takes ~2-5 minutes (model inference), subsequent games faster
- **Quality**: Ollama models are good but not as advanced as ChatGPT
- **Privacy**: Everything runs locally, no data sent anywhere

---

**Ready? Download Ollama and start the tournament!** 🚀
