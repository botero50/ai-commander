# AI Commander — One Command Demo

**The simplest way to experience AI Commander.**

## Quick Start

```bash
npm run launch-demo
```

That's it. One command verifies everything and launches the full demo.

## What It Does

The launcher automatically:

1. **Verifies Node.js** — Ensures Node.js 22+ is installed
2. **Checks Dependencies** — Confirms npm packages are installed
3. **Builds Project** — Compiles TypeScript
4. **Verifies Ollama** — Confirms Ollama is running
5. **Checks Models** — Verifies mistral and neural-chat are downloaded
6. **Launches Demo** — Runs a complete AI vs AI match
7. **Shows Results** — Displays match stats and replay information

If any step fails, you get:
- Clear explanation of what's wrong
- Direct recovery steps
- Links to required downloads

## Examples

### Default (mistral vs neural-chat)
```bash
npm run launch-demo
```

### Different Models
```bash
PLAYER1_MODEL=llama2 PLAYER2_MODEL=mistral npm run launch-demo
PLAYER1_MODEL=tinyllama PLAYER2_MODEL=tinyllama npm run launch-demo
```

### Shorter Match
```bash
MAX_TICKS=100 npm run launch-demo
```

### Verbose Output
```bash
VERBOSE=true npm run launch-demo
```

## Requirements

### Before First Run

**1. Install Node.js 22+**
```bash
# Verify
node --version  # Should show v22.0.0 or higher
```

**2. Install Ollama and Models**
```bash
# Start Ollama in a terminal (keep it running)
ollama serve

# In another terminal
ollama pull mistral
ollama pull neural-chat
```

**3. Install AI Commander**
```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
npm install
```

Then run:
```bash
npm run launch-demo
```

## What You'll See

```
======================================================================
  🎮 AI COMMANDER — ONE COMMAND DEMO
======================================================================

======================================================================
  STEP 1: VERIFY PREREQUISITES
======================================================================

[3:35:37 PM] ✅ Node.js v24.18.0 installed
[3:35:37 PM] ✅ Dependencies installed
[3:35:37 PM] ✅ Build artifacts ready
[3:35:37 PM] ✅ Ollama installed
[3:35:37 PM] ✅ Ollama running with 2 model(s)
[3:35:37 PM] ✅ Required models found: mistral, neural-chat

======================================================================
  STEP 2: BUILD PROJECT
======================================================================

[3:35:37 PM] 🔨 Running: npm run build
[3:35:38 PM] ✅ Build completed

======================================================================
  STEP 3: LAUNCH DEMO
======================================================================

[3:35:38 PM] ▶️ Starting AI vs AI match...
[3:35:38 PM] ✅ Demo completed successfully

======================================================================
  STEP 4: VIEW RESULTS
======================================================================

✅ Replay saved:
   /path/to/ai-commander/demo-output/replay.json

✅ Match summary:
   Player 1 Final Score: 134
   Player 2 Final Score: 136
   Winner: Player 1

======================================================================
  DEMO SUMMARY
======================================================================

✅ SUCCESS

AI Commander demo ran successfully!

Next steps:
  1. Run again: npm run launch-demo
  2. Try different models: PLAYER1_MODEL=llama2 npm run launch-demo
  3. View replay: npm run replay
```

## Troubleshooting

### "Ollama not running"

**Problem:** Launcher says Ollama is not running

**Solution:**
```bash
# In a separate terminal, start Ollama
ollama serve

# Keep that terminal open while running npm run launch-demo
```

### "Model not found: mistral"

**Problem:** Launcher says required models are missing

**Solution:**
```bash
ollama pull mistral
ollama pull neural-chat

# Verify they're installed
ollama list
```

### "Build failed"

**Problem:** TypeScript compilation errors

**Solution:**
```bash
# Clean reinstall
npm ci
npm run build

# Then try again
npm run launch-demo
```

### "Node.js version too old"

**Problem:** Launcher says Node.js 22+ required

**Solution:**
- Download from https://nodejs.org (LTS version)
- Install it
- Verify: `node --version` (should show v22+)

### Out of Memory

**Problem:** Ollama or Node crashes during demo

**Solution:**
```bash
# Use smaller models
PLAYER1_MODEL=tinyllama PLAYER2_MODEL=tinyllama MAX_TICKS=100 npm run launch-demo
```

## After the Demo

### View the Replay
```bash
npm run replay
```

Shows timeline, statistics, and match summary.

### Try Different Configurations
```bash
# Different models
PLAYER1_MODEL=llama2 PLAYER2_MODEL=mistral npm run launch-demo

# Faster match
MAX_TICKS=50 npm run launch-demo

# Longer match to see more strategy
MAX_TICKS=1000 npm run launch-demo
```

### Check the Artifacts
```bash
# Replay data (JSON)
cat demo-output/replay.json

# Match log
cat demo-output/logs.txt
```

## How It Works

The launcher is a Node.js script that:

1. **Checks prerequisites** using system commands (node, ollama, curl)
2. **Validates Ollama** by connecting to the local HTTP API
3. **Builds the project** with `npm run build`
4. **Launches the demo** with `node demo/simple-demo.js`
5. **Displays results** and next steps

The entire process is self-contained — no external dependencies beyond what you install.

## What's Next?

After running the demo successfully:

1. **Read the docs** — See [INSTALLATION.md](../INSTALLATION.md) for details
2. **Explore configurations** — Try different models and match settings
3. **Review the code** — Check out [packages/match-runner](../packages/match-runner) to understand the engine
4. **Contribute** — See [CONTRIBUTING.md](../CONTRIBUTING.md)

## Questions?

See [INSTALLATION.md](../INSTALLATION.md) for the complete setup guide.

Report issues at: https://github.com/anthropics/ai-commander/issues
