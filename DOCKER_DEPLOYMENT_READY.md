# Docker Deployment Ready ✅

**Status**: Complete and stored in project  
**Date**: 2026-07-07

---

## What You Have

The complete OpenRA-RL Docker image is now stored in your project and ready to deploy anytime, anywhere.

### File Location
```
./docker-images/openra-rl-latest.tar.gz  (501 MB)
```

### To Deploy Anytime

```bash
cd ./docker-images
./load-and-run.sh   # One-time setup
./run.sh            # Start the server
```

That's it! The gRPC server will be running on `localhost:9999`.

---

## What's Included

| Component | Details |
|-----------|---------|
| **OpenRA Engine** | Compiled from source, ready to run |
| **gRPC Server** | Listening on port 9999 |
| **Python 3.11** | With 50+ ML/RL dependencies |
| **Game Assets** | Setup script to download content |
| **Display Server** | Xvfb for headless rendering |

**Image Size**: 2.13 GB uncompressed → 501 MB compressed  
**Built**: 2026-07-07  
**Architecture**: amd64 (Linux)

---

## Quick Commands

### First Time (Setup)
```bash
cd ./docker-images
./load-and-run.sh
```

This will:
1. ✅ Load the Docker image from archive
2. ✅ Verify it's loaded correctly
3. ✅ Create a volume for game content
4. ✅ Download and setup game assets (one-time, ~2 min)

### Every Time (Run Server)
```bash
cd ./docker-images
./run.sh
```

Or manually:
```bash
docker run -p 9999:9999 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest
```

### Connect AI Agents
```python
import grpc
from openra_rl.rl.protos import rl_bridge_pb2_grpc

channel = grpc.aio.secure_channel('localhost:9999')
stub = rl_bridge_pb2_grpc.RLBridgeStub(channel)

# Start playing!
async for obs in stub.GameSession(action_stream):
    print(f"Tick {obs.tick}: {len(obs.units)} units")
```

---

## File Structure

```
docker-images/
├── openra-rl-latest.tar.gz    # The Docker image (501 MB)
├── load-and-run.sh            # Setup script (interactive)
├── run.sh                      # Quick runner
├── LOAD_IMAGE.md              # Detailed guide
└── README.md                  # This directory's info
```

---

## Documentation

- **LOAD_IMAGE.md** — Complete step-by-step guide with troubleshooting
- **README.md** — Quick reference
- **OPENRA_DOCKER_FIX_SUMMARY.md** — What was fixed and why
- **DEPLOYMENT_GUIDE_OPENRA.md** — K8s, Docker Compose, production setup
- **Dockerfile.patched** — Original Dockerfile used to build

---

## Key Features

✅ **No Rebuild Needed** — Image is ready to use immediately  
✅ **Portable** — Works on any machine with Docker installed  
✅ **Offline Ready** — Can load even without internet (after first game content download)  
✅ **Production Ready** — Can deploy to K8s, Docker Compose, or standalone  
✅ **All Dependencies Included** — Python, gRPC, OpenAI, ML libraries, etc.

---

## Troubleshooting

### Scripts don't run?
```bash
# Make them executable
chmod +x docker-images/*.sh
./docker-images/load-and-run.sh
```

### Port 9999 already in use?
```bash
# Use a different port
docker run -p 9998:9999 openra-rl:latest
```

### Container exits immediately?
```bash
# Check logs
docker logs <container-id>

# Likely: Game content not setup
# Solution: Run setup step again
docker volume rm openra-content
./docker-images/load-and-run.sh
```

### Out of disk space?
```bash
# The archive (501 MB) + uncompressed (2.13 GB) = 2.6 GB total
# Make sure you have at least 3 GB free
df -h
```

See `LOAD_IMAGE.md` for more troubleshooting.

---

## Integration with AI Commander

Once the server is running, use the AI Commander framework:

```typescript
import { TournamentRunner } from './packages/tournament-runner'
import { OpenRAAdapter } from './packages/openra-adapter'

const runner = new TournamentRunner({
  game: new OpenRAAdapter({
    host: 'localhost',
    port: 9999,
  }),
  agents: ['claude', 'gpt4'],
  games: 100,
})

// Run 100 games between Claude and GPT-4
await runner.run()
```

---

## Next Steps

1. **Now**: You have the image stored and ready to deploy
2. **First Run**: `./docker-images/load-and-run.sh` (setup game content)
3. **Then**: `./docker-images/run.sh` (start the server)
4. **Finally**: Connect your AI agents and run tournaments!

---

## What If You Need to Rebuild?

If you need to modify the image or rebuild it:

```bash
cd /tmp/openra-rl
docker build -t openra-rl:latest .
docker save openra-rl:latest | gzip > ~/ai-commander/docker-images/openra-rl-latest.tar.gz
```

See `Dockerfile.patched` for the build configuration.

---

✅ **You're ready to deploy the OpenRA game environment anytime!**
