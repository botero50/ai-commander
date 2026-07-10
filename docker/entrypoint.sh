#!/bin/bash
set -e

echo "🚀 AI Commander Stream System"
echo "================================"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
for i in {1..30}; do
  if redis-cli -h redis -p 6379 ping > /dev/null 2>&1; then
    echo "✓ Redis is ready"
    break
  fi
  echo "  Redis not ready, retrying... ($i/30)"
  sleep 1
done

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama..."
for i in {1..30}; do
  if curl -f http://ollama:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is ready"
    break
  fi
  echo "  Ollama not ready, retrying... ($i/30)"
  sleep 2
done

# Display configuration
echo ""
echo "📋 Configuration:"
echo "  Stream Port: ${STREAM_PORT:-8080}"
echo "  Max Matches: ${STREAM_MATCHES:-unlimited}"
echo "  Log Interval: ${STREAM_LOG_INTERVAL:-30}s"
echo "  Ollama URL: ${OLLAMA_BASE_URL:-http://ollama:11434}"
echo "  Log Level: ${LOG_LEVEL:-info}"
echo ""

# Start the application
echo "🎮 Starting AI Commander Stream..."
exec node dist/stream/stream-launch.js
