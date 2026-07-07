# OpenRA-RL Docker Deployment Guide

## Quick Start

### 1. Build the Image (Already Done)
```bash
cd /tmp/openra-rl
docker build -t openra-rl:latest .
```

**Result**: `openra-rl:latest` (2.13 GB, amd64)

### 2. Prepare Game Content (One-Time Setup)

The image includes OpenRA binaries but not game content. Download before first run:

```bash
# Create a volume for content
docker volume create openra-content

# Download and extract game content
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c '
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}
    cd /tmp
    curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip
    unzip -q ra.zip
    cp *.mix /root/.config/openra/Content/ra/v2/
    cp expand/* /root/.config/openra/Content/ra/v2/expand/
    cp cnc/* /root/.config/openra/Content/ra/v2/cnc/
  '
```

### 3. Run the Server

```bash
# Start gRPC server on port 9999
docker run -p 9999:9999 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest

# Expected output:
# Starting Xvfb on display :99...
# Starting OpenRA-RL environment server...
```

### 4. Connect an AI Agent

From your Python client:

```python
import grpc
from openra_rl.rl.protos import rl_bridge_pb2_grpc, rl_bridge_pb2

channel = grpc.aio.secure_channel('localhost:9999', grpc.ssl_channel_credentials())
stub = rl_bridge_pb2_grpc.RLBridgeStub(channel)

# Start game session and stream observations
async for observation in stub.GameSession(action_stream):
    print(f"Tick: {observation.tick}, Units: {len(observation.units)}")
```

---

## Production Deployment

### Docker Compose
```yaml
version: '3.9'

services:
  openra-game:
    image: openra-rl:latest
    ports:
      - "9999:9999"
    volumes:
      - openra-content:/root/.config/openra/Content
    environment:
      - DISPLAY=:99
    networks:
      - tournament

  ai-agent:
    build: ./agent
    depends_on:
      - openra-game
    environment:
      - OPENRA_HOST=openra-game
      - OPENRA_PORT=9999
    networks:
      - tournament

volumes:
  openra-content:

networks:
  tournament:
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openra-rl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: openra-rl
  template:
    metadata:
      labels:
        app: openra-rl
    spec:
      containers:
      - name: openra-rl
        image: openra-rl:latest
        ports:
        - containerPort: 9999
          protocol: TCP
        volumeMounts:
        - name: game-content
          mountPath: /root/.config/openra/Content
        env:
        - name: DISPLAY
          value: ":99"
      volumes:
      - name: game-content
        persistentVolumeClaim:
          claimName: openra-content-pvc
```

---

## Troubleshooting

### Image Won't Start
```bash
# Check logs
docker logs <container-id>

# Common issue: Missing game content
# Solution: Run setup step above
```

### gRPC Connection Refused
```bash
# Verify port is exposed
docker port <container-id>
# Expected: 9999/tcp -> 0.0.0.0:9999

# Test connectivity
python -c "
import grpc
channel = grpc.aio.secure_channel('localhost:9999')
print('Connected!')
"
```

### Out of Memory
```bash
# Increase Docker memory allocation
docker run -m 4g openra-rl:latest
```

---

## Performance Tuning

### CPU & Memory
```bash
# Use multiple CPU cores
docker run --cpus="4.0" -m 4g openra-rl:latest

# Pin to specific cores
docker run --cpuset-cpus="0-3" openra-rl:latest
```

### Network
```bash
# Use host network (faster, less isolated)
docker run --network host openra-rl:latest
```

---

## Registry Push

### Docker Hub
```bash
# Tag image
docker tag openra-rl:latest myusername/openra-rl:latest

# Login and push
docker login
docker push myusername/openra-rl:latest
```

### Private Registry
```bash
# Tag for private registry
docker tag openra-rl:latest registry.internal/openra-rl:latest

# Push
docker push registry.internal/openra-rl:latest
```

---

## Monitoring

### Check Running Container
```bash
# Real-time stats
docker stats openra-rl

# Log stream
docker logs -f openra-rl

# Inspect game state
docker exec -it openra-rl bash
ps aux  # View running processes
```

### Metrics
- **Port 9999**: gRPC server (observations/actions)
- **Display :99**: Xvfb for headless rendering (8-16 MB/s during gameplay)

---

## Integration with AI Commander

Once the container is running, use the AI Commander framework:

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

await runner.run()
```

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [gRPC .NET/Python Interop](https://grpc.io/docs/languages/csharp/)
- [OpenRA-RL Repository](https://github.com/yxc20089/openra-rl)
