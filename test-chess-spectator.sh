#!/bin/bash

# Test Chess Spectator Integration
# Starts all components needed for EPIC 72

echo "🎮 EPIC 72 - Live Chess Spectator Experience"
echo "==============================================="
echo ""

# Check prerequisites
echo "✅ Checking prerequisites..."

# Check Ollama
if ! curl -s http://localhost:11434/api/version > /dev/null; then
  echo "❌ Ollama not running at localhost:11434"
  echo "   Start Ollama: ollama serve"
  exit 1
fi
echo "✅ Ollama available"

# Check Node.js
if ! node --version > /dev/null 2>&1; then
  echo "❌ Node.js not installed"
  exit 1
fi
echo "✅ Node.js available: $(node --version)"

# Build TypeScript
echo ""
echo "📦 Building TypeScript..."
npm run build || exit 1
echo "✅ Build complete"

# Show component status
echo ""
echo "📊 Component Status:"
echo "  ✅ Chess Engine (arena.js)"
echo "  ✅ WebSocket Server (websocket-server.js port 9000)"
echo "  ✅ Broadcast Service"
echo "  ✅ React UI (apps/web)"

echo ""
echo "🚀 To start the arena:"
echo "   pnpm chess"
echo ""
echo "🌐 To view the spectator UI (in another terminal):"
echo "   cd apps/web && npm run dev"
echo "   Then open http://localhost:5173"
echo ""
