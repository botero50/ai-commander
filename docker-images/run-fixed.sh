#!/bin/bash
# Fixed runner for OpenRA-RL container with .NET properly installed

PORT=${1:-8000}

# Check if volume exists
if ! docker volume inspect openra-content &>/dev/null; then
    echo "Error: Game content volume not found"
    echo "Run the setup script first to copy game content"
    exit 1
fi

echo "Starting OpenRA-RL on port $PORT..."
echo "Image: openra-rl:fixed"
echo "Content: openra-content volume"
echo ""

# Run with explicit Python command to keep server running
# (The default CMD sometimes exits prematurely in Docker)
docker run -it -p "$PORT:8000" \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:fixed \
  python3 -m openenv.core.env_server.http_server
