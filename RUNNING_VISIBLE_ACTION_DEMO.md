# Running the Visible Action Demonstration

## Setup OpenRA-RL

OpenRA-RL is the game server that runs your AI agents. It uses Docker internally but is managed via Python CLI.

### Step 1: Install OpenRA-RL

```bash
# Install via pip
pip install openra-rl

# Verify installation
openra-rl doctor
```

This checks:
- Python version (3.10+)
- Docker availability
- Configuration setup

### Step 2: Configure LLM (Optional for This Demo)

For this demonstration, you don't need an LLM - we're just testing game control. But OpenRA-RL requires one for setup.

**Option A: Use OpenRouter (Cloud)**
```bash
# Get API key from https://openrouter.ai
openra-rl play --provider openrouter --api-key sk-or-your-key --model anthropic/claude-sonnet
```

**Option B: Use Ollama (Local)**
```bash
# Install Ollama from ollama.ai
ollama pull qwen2:7b

# Start Ollama server
ollama serve

# In another terminal
openra-rl play --provider ollama --model qwen2:7b
```

**Option C: Skip Setup (Advanced)**
If you want to bypass the interactive setup, you can configure it manually, but the simple approach above is recommended.

### Step 3: Start OpenRA-RL Server

```bash
# This starts the game server on port 8000 and opens the web UI
openra-rl play
```

You should see:
```
[INFO] Starting OpenRA-RL server...
[INFO] Game server running on http://localhost:8000
[INFO] Web UI available at http://localhost:8000
```

## Run the Visible Action Demo

### Step 1: Build AI Commander

```bash
cd /path/to/ai-commander
npm run build
```

### Step 2: Run the Demonstration

```bash
# In another terminal, run the visible action CLI
pnpm --filter reference exec ts-node src/visible-action-cli.ts

# Or with custom OpenRA-RL URL
pnpm --filter reference exec ts-node src/visible-action-cli.ts --openra-url http://localhost:8000

# With verbose logging
pnpm --filter reference exec ts-node src/visible-action-cli.ts --verbose
```

### Step 3: Watch for Success

The CLI will output:
```
═══════════════════════════════════════════════════════════════
        Visible Action Demonstration with Real OpenRA
═══════════════════════════════════════════════════════════════

OpenRA-RL Service: http://localhost:8000

Step 1: Connecting to OpenRA-RL Service
───────────────────────────────────────────────────────────────
✓ Connected to OpenRA-RL

[... demonstration steps ...]

✓ SUCCESS: Visible game state change detected!

  Unit Movement:
    Before: (512, 512)
    After:  (612, 512)
    Distance: 100.0 pixels

Confidence Level: HIGH
AI Commander can successfully control a real OpenRA game.
```

## Troubleshooting

### Docker Not Available

**Error:**
```
Error: Docker is not available
```

**Solution:**
- Install Docker Desktop (https://www.docker.com/products/docker-desktop)
- Ensure Docker daemon is running
- Verify with: `docker ps`

### OpenRA-RL Server Not Responding

**Error:**
```
✗ Failed to connect to OpenRA-RL
OpenRA-RL service not reachable at http://localhost:8000
```

**Solutions:**
1. **Check server is running:**
   ```bash
   curl http://localhost:8000/status
   ```

2. **Check logs:**
   ```bash
   # If running openra-rl play in foreground
   # Look for error messages
   
   # Try restarting
   openra-rl play
   ```

3. **Check port in use:**
   ```bash
   lsof -i :8000
   # Kill if something else is using it
   kill -9 <PID>
   ```

4. **Verify OpenRA-RL installation:**
   ```bash
   openra-rl doctor
   ```

### Python/LLM Issues

**Error:**
```
ModuleNotFoundError: No module named 'openra_rl'
```

**Solution:**
```bash
pip install --upgrade openra-rl
```

**Error:**
```
LLM provider not configured
```

**Solution:**
Just run and it will prompt for setup:
```bash
openra-rl play
```

### Network Issues

**Error:**
```
Connection refused / Network unreachable
```

**Solutions:**
1. Verify OpenRA-RL is running: `curl http://localhost:8000/status`
2. Check firewall isn't blocking port 8000
3. If using custom URL, verify it's correct: `--openra-url http://your-host:8000`

---

## Complete Example Session

```bash
# Terminal 1: Start OpenRA-RL
pip install openra-rl
openra-rl play

# Wait for it to start...
# [INFO] Game server running on http://localhost:8000

# Terminal 2: Build and run demo
cd ~/ai-commander
npm run build
pnpm --filter reference exec ts-node src/visible-action-cli.ts

# Watch output for ✓ SUCCESS
```

---

## What Happens Under the Hood

1. **Your visible-action-cli.ts:**
   - Connects to OpenRA-RL HTTP API
   - Gets game state from `/observation`
   - Submits move command to `/step`
   - Detects unit movement

2. **OpenRA-RL:**
   - Manages containerized OpenRA game engine
   - Provides HTTP interface to game state
   - Processes commands and executes them
   - Advances game ticks

3. **Result:**
   - Before: Unit at (512, 512)
   - Command: Move to (612, 512)
   - After: Unit at (612, 512)
   - ✓ Proof: AI Commander controlled the game

---

## Running Tests

```bash
# Test the visible action demo logic (no OpenRA-RL needed)
npm run test -- visible-action --run

# All tests
npm run test -- --run

# Watch tests
npm run test -- visible-action
```

All 28 visible action tests pass with mocked callbacks, proving the logic works before testing with real OpenRA-RL.

---

## Success Criteria

You've successfully demonstrated visible action control when you see:

✓ **Connection:** CLI connects to OpenRA-RL  
✓ **Retrieval:** Initial game state captured with real unit  
✓ **Command:** Move order submitted successfully  
✓ **Execution:** Game advanced by 5 ticks  
✓ **Detection:** Unit moved 100 pixels (from before position to after position)  
✓ **Report:** Evidence collected and displayed  

**Final Message:** "Confidence Level: HIGH - AI Commander can successfully control a real OpenRA game."

---

## Next Steps

After successful demonstration:

1. **Story 084:** Add goal-based planning to generate multi-step sequences
2. **Story 085:** Implement autonomous mission execution
3. **Story 086:** Multi-unit coordination

Each builds on the confidence established by this visible action demo.

Sources:
- [OpenRA-RL Official Docs](https://openra-rl.dev/docs/getting-started/)
- [OpenRA-RL GitHub](https://github.com/yxc20089/OpenRA-RL)
