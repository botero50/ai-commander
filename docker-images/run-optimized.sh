#!/bin/bash
# Optimized runner for OpenRA-RL container with enhanced graphics/gRPC support

PORT=${1:-8000}

# Check if volume exists
if ! docker volume inspect openra-content &>/dev/null; then
    echo "Error: Game content volume not found"
    echo "Run the setup script first to copy game content"
    exit 1
fi

echo "Starting OpenRA-RL (optimized) on port $PORT..."
echo "Image: openra-rl:optimized"
echo "Content: openra-content volume"
echo "Resources: 8 CPU, 8GB RAM"
echo ""

# Run with explicit Python command and resource limits
# Enhanced environment variables for graphics/gRPC
docker run -it -p "$PORT:8000" \
  -p "9999:9999" \
  --cpus="8" \
  --memory="8g" \
  -e DISPLAY=:99 \
  -e LIBGL_ALWAYS_SOFTWARE=1 \
  -e MESA_GL_VERSION_OVERRIDE=3.3 \
  -e LIBGL_DRI3_DISABLE=0 \
  -e MESA_DEBUG=silent \
  -e RL_GRPC_PORT=9999 \
  -e GRPC_VERBOSITY=ERROR \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:optimized \
  python3 -m openenv.core.env_server.http_server
