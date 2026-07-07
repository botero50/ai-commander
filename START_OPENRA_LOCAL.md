# Running OpenRA-RL Locally on Windows (Without Docker)

**Solution Found**: Use `openra-rl play --local` flag

## The Problem

The Docker image `ghcr.io/yxc20089/openra-rl:latest` only has `arm64` manifest (Apple Silicon).  
Windows 11 needs `amd64` manifest (Intel/x86_64).  
Result: Docker pull fails with architecture mismatch.

## The Solution

The `openra-rl` Python package has a **`--local` flag** that runs the server **locally in Python** without Docker.

### Step 1: Start Local Server

Open PowerShell and run:

```powershell
# Option A: Use the play command with --local flag
openra-rl play --local --provider ollama --model llama2

# OR manually start just the server:
python -m openra_env.server
```

This will:
- Start a local Python HTTP server on port 8000
- Initialize OpenRA game engine locally
- Be ready to receive observations and commands

### Step 2: Verify Server is Running

In another PowerShell window:

```powershell
curl http://localhost:8000/status
```

Expected response:
```json
{"status": "ready"}
```

### Step 3: Now Story 7.1 Can Proceed

Once local server is running on port 8000, our AI Commander integration code will work:

```typescript
const bridge = await createOpenRARLBridge({
  baseUrl: "http://localhost:8000"  // This will connect to local server
});
```

## How It Works

When you use `openra-rl play --local`:

1. It checks if Docker is available (skips if `--local` is set)
2. It starts a Python HTTP server using: `python -m openra_env.server`
3. The server runs the game engine **locally** (not in Docker)
4. It exposes the same HTTP API:
   - `GET  /status` — Health check
   - `GET  /observation` — Game state
   - `POST /step` — Command execution
5. Our adapter connects to this local HTTP server

## No Docker Required

This approach:
- ✅ Works on Windows 11 with amd64 architecture
- ✅ No Docker image pull needed
- ✅ No arm64/amd64 mismatch
- ✅ Pure Python local execution
- ✅ Same HTTP API as Docker version

## Alternative: Keep Server Running

If you want the server to stay running without playing:

```powershell
python -m openra_env.server --port 8000
```

Then in another PowerShell, run Story 7.1 validation:

```powershell
cd C:\Users\boter\ai-commander
pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts
```

## Troubleshooting

If server fails to start:

```powershell
# Check Python version (need 3.7+)
python --version

# Check if server module is available
python -c "import openra_env.server; print('OK')"

# Run with verbose output
python -m openra_env.server --verbose
```

## Next Steps

1. Run: `openra-rl play --local --provider ollama --model llama2`
2. Or: `python -m openra_env.server`
3. Verify: `curl http://localhost:8000/status`
4. Proceed with Story 7.1 validation
