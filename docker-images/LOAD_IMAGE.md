# Loading the OpenRA-RL Docker Image

The pre-built Docker image is stored as a compressed tar archive. Use these commands to load it into Docker.

## Quick Load

```bash
# Load the image from archive
docker load < openra-rl-latest.tar.gz

# Verify it loaded
docker images openra-rl:latest

# Run immediately
docker run -p 9999:9999 openra-rl:latest
```

## Step-by-Step

### 1. Load Image
```bash
cd ./docker-images
docker load < openra-rl-latest.tar.gz
```

**Output:**
```
Loaded image: openra-rl:latest
```

### 2. Verify
```bash
docker images | grep openra-rl
# Should show: openra-rl  latest  5ee5aea68de2  501MB
```

### 3. Setup Game Content (One-Time)
```bash
docker volume create openra-content

docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c '
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}
    cd /tmp
    curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip
    unzip -q ra.zip
    cp *.mix /root/.config/openra/Content/ra/v2/
    cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true
    cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true
    echo "✓ Game content ready"
  '
```

### 4. Run Container
```bash
docker run -p 9999:9999 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest
```

Expected output:
```
Starting Xvfb on display :99...
Xvfb started (PID: 7)
Starting OpenRA-RL environment server...
```

The gRPC server is now listening on `localhost:9999`.

## Testing Connection

```python
import grpc
from openra_rl.rl.protos import rl_bridge_pb2_grpc

channel = grpc.aio.secure_channel('localhost:9999')
stub = rl_bridge_pb2_grpc.RLBridgeStub(channel)
print("✓ Connected to gRPC server")
```

## Using with Docker Compose

```yaml
version: '3.9'
services:
  openra:
    image: openra-rl:latest
    ports:
      - "9999:9999"
    volumes:
      - openra-content:/root/.config/openra/Content
    networks:
      - game

volumes:
  openra-content:

networks:
  game:
```

## Archive Info

| Property | Value |
|----------|-------|
| Filename | openra-rl-latest.tar.gz |
| Compressed Size | 501 MB |
| Uncompressed | 2.13 GB |
| Format | gzip tar |
| Image ID | 5ee5aea68de2... |
| Created | 2026-07-07 |

## Troubleshooting

**Q: "docker load" fails with permission error**
```bash
# Use sudo if needed
sudo docker load < openra-rl-latest.tar.gz
```

**Q: Container exits immediately**
```bash
# Check logs
docker logs <container-id>

# Common issue: Missing game content
# Solution: Run setup step 3 above
```

**Q: Port already in use**
```bash
# Use different port
docker run -p 9998:9999 openra-rl:latest
```

## Re-creating the Archive

If you need to rebuild:

```bash
cd /tmp/openra-rl
docker build -t openra-rl:latest .
docker save openra-rl:latest | gzip > ~/ai-commander/docker-images/openra-rl-latest.tar.gz
```
