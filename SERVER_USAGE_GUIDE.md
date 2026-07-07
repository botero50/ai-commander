# Using the OpenRA Server

## Step 1: Start the Game Server

Open PowerShell and run:

```powershell
cd C:\Users\boter\ai-commander\docker-images
bash run.sh
```

You should see output like:
```
Starting Xvfb on display :99...
Xvfb started (PID: 7)
Starting OpenRA-RL environment server...
```

The FastAPI server is now listening on `localhost:8000` (HTTP) with WebSocket support.

## Step 2: Connect an AI Agent (in another PowerShell window)

The server is a FastAPI application with HTTP and WebSocket endpoints. Here are your options:

### Option A: Python Client (Simple HTTP)

```python
import httpx

# Connect to the FastAPI server
client = httpx.Client(base_url='http://localhost:8000')

# Check health
response = client.get('/health')
print(f"Server: {response.json()}")

# Get current state
response = client.get('/state')
state = response.json()
print(f"Episode: {state['episode_id']}")
print(f"Steps: {state['step_count']}")

# Reset game
response = client.post('/reset')
obs = response.json()
print(f"Game reset! Observation keys: {obs.get('observation', {}).keys()}")

client.close()
```

### Option B: Node.js/TypeScript Client (HTTP)

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000'
});

// Check health
const health = await client.get('/health');
console.log('Server:', health.data);

// Get current state
const state = await client.get('/state');
console.log('Episode:', state.data.episode_id);
console.log('Steps:', state.data.step_count);

// Reset game
const reset = await client.post('/reset');
console.log('Game reset! Observation:', Object.keys(reset.data.observation));
```

### Option C: Test with a Quick Curl Command

```bash
# Check server health
curl http://localhost:8000/health

# Get current state
curl http://localhost:8000/state

# Expected output:
# {"status": "ok"}
# {"episode_id": null, "step_count": 0}
```

### Option D: Reset and Step Through Game

```bash
# Reset the environment (start new game)
curl -X POST http://localhost:8000/reset

# Take a step (send actions and get observations)
curl -X POST http://localhost:8000/step \
  -H "Content-Type: application/json" \
  -d '{"actions": []}'
```

## Step 3: The HTTP/WebSocket API

The server is built with FastAPI and OpenEnv, providing two interfaces:

### HTTP Endpoints

**Get current state:**
```
GET /state
Response: {
  "episode_id": null or string,
  "step_count": 0
}
```

**Get environment metadata:**
```
GET /metadata
Response: {
  "name": "openra_env",
  "description": "OpenRA game environment",
  "observation_space": {...},
  "action_space": {...}
}
```

**Reset the environment:**
```
POST /reset
Response: {
  "observation": {...},
  "info": {...}
}
```

**View full API documentation:**
```
http://localhost:8000/docs
```

**Check server health:**
```
GET /health
Response: {"status": "ok"}
```

### Full Game Loop Example

```python
import httpx
import json

client = httpx.Client(base_url='http://localhost:8000')

# 1. Reset game
print("Resetting game...")
response = client.post('/reset')
obs = response.json()
print(f"Observation: {json.dumps(obs, indent=2)[:200]}...")

# 2. Take steps
for step in range(10):
    print(f"\nStep {step+1}...")
    action = {"actions": []}  # Your AI's decision
    response = client.post('/step', json=action)
    data = response.json()
    print(f"  Done: {data.get('done')}")
    print(f"  Reward: {data.get('reward')}")
    
    if data.get('done'):
        print(f"  Game over!")
        break

client.close()
```

## Step 4: Understanding the Game Flow

1. **Server starts paused** - waits for agent connection
2. **Agent connects** - via GameSession RPC
3. **Game unpauses** - agent can start sending actions
4. **Lock-step gameplay** - each observation waits for action
5. **Game over** - when victory/defeat conditions met
6. **Server exits** - saves replay and shuts down

## Step 5: Game Content

If you see errors about missing game content:

```powershell
# Download game content (one-time setup)
docker run --rm -v openra-content:/root/.config/openra/Content `
  openra-rl:latest bash -c "
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}
    cd /tmp
    curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip
    unzip -q ra.zip
    cp *.mix /root/.config/openra/Content/ra/v2/
    cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true
    cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true
  "
```

## Quick Test Script

Save this as `test_server.py`:

```python
#!/usr/bin/env python3
import httpx
import asyncio
import websockets
import json

def test_http():
    print("🎮 Testing OpenRA HTTP Server")
    print("=" * 50)
    
    try:
        client = httpx.Client(base_url='http://localhost:8000')
        
        # Test 1: Get state
        print("\n1️⃣  Testing GET /env/state...")
        response = client.get('/env/state')
        state = response.json()
        print(f"   ✓ Connected!")
        print(f"   Phase: {state['phase']}")
        print(f"   Episode: {state['episode_id']}")
        print(f"   Tick: {state['tick']}")
        
        # Test 2: Get environment info
        print("\n2️⃣  Testing GET /env/info...")
        response = client.get('/env/info')
        info = response.json()
        print(f"   ✓ Info retrieved!")
        print(f"   Max length: {info.get('max_episode_length', 'N/A')}")
        
        print("\n✅ HTTP Server is working!")
        client.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("   Is the server running? Try: bash run.sh")

async def test_websocket():
    print("\n3️⃣  Testing WebSocket /env/run...")
    try:
        async with websockets.connect('ws://localhost:8000/env/run') as ws:
            # Send initial empty action
            action = {"actions": []}
            await ws.send(json.dumps(action))
            
            # Receive first observation
            obs = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(obs)
            print(f"   ✓ WebSocket connected!")
            print(f"   First tick: {data.get('tick', 'N/A')}")
            print(f"   Units: {len(data.get('units', []))}")
        
        print("\n✅ WebSocket Server is working!")
        
    except Exception as e:
        print(f"\n❌ WebSocket Error: {e}")

if __name__ == '__main__':
    test_http()
    asyncio.run(test_websocket())
```

Run with:
```powershell
python test_server.py
```

## Monitoring the Server

While the server runs, you'll see logs like:
```
RL agent connected — game unpaused
Observation sent (tick 100)
Command received: MOVE actor=42
RL agent disconnected, scheduling graceful exit
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8000 already in use | `netstat -ano \| findstr :8000` to find process |
| "Connection refused" | Make sure server is running: `bash run.sh` |
| Missing game content | Run `./load-and-run.sh` again to download assets |
| HTTP 404 on /env/state | Server may still be starting, wait 5 seconds |
| WebSocket connection fails | Make sure you're using `ws://` not `http://` |

## Next Steps

1. ✅ Start server: `bash run.sh`
2. ✅ Test connection: `python test_server.py`
3. ✅ Build your agent: connect via gRPC and send actions
4. ✅ Monitor gameplay: watch logs as game runs
5. ✅ Analyze replay: game saves `.rep` file when done

The server is production-ready. You can now build AI agents that play OpenRA!
