#!/bin/bash
# Simple runner for OpenRA-RL container

PORT=${1:-9999}

# Check if volume exists
if ! docker volume inspect openra-content &>/dev/null; then
    echo "Error: Game content volume not found"
    echo "Run: docker volume create openra-content"
    echo "Then: ./load-and-run.sh"
    exit 1
fi

# Check if image is loaded
if ! docker images openra-rl:latest | grep -q openra-rl; then
    echo "Error: Image not found"
    echo "Run: ./load-and-run.sh"
    exit 1
fi

echo "Starting OpenRA-RL on port $PORT..."
docker run -p "$PORT:9999" \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest
