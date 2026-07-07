# Docker Images

Prebuilt Docker images for AI Commander components.

## openra-rl-latest.tar.gz

The complete OpenRA-RL game environment with gRPC server, Python ML/RL dependencies, and compiled game engine.

### Quick Start

```bash
# Load image and setup (one-time)
./load-and-run.sh

# Run the server
./run.sh
```

### Details

- **Size**: 501 MB (compressed), 2.13 GB (uncompressed)
- **Base**: Debian 12 + .NET 8.0 Runtime + Python 3.11
- **Includes**: OpenRA game engine, gRPC server, 50+ Python packages
- **Port**: 9999 (gRPC)
- **Built**: 2026-07-07

### Manual Load

```bash
# Load
docker load < openra-rl-latest.tar.gz

# Run
docker run -p 9999:9999 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest
```

### Files

- `openra-rl-latest.tar.gz` — The Docker image archive
- `load-and-run.sh` — Automated setup script
- `run.sh` — Simple runner script
- `LOAD_IMAGE.md` — Detailed loading instructions
- `README.md` — This file

See `LOAD_IMAGE.md` for complete documentation and troubleshooting.
