#!/bin/bash

# Chess AI Optimization Testing Script
# Tests different Ollama models for chess playing quality

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       CHESS AI OPTIMIZATION - MODEL TESTING SUITE             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Ollama is running
echo "🔍 Checking Ollama status..."
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
  echo "❌ Ollama is not running. Start it with: ollama serve"
  exit 1
fi

echo "✅ Ollama is running"
echo ""

# List available models
echo "📦 Available models:"
curl -s http://localhost:11434/api/tags | python3 -c "
import json, sys
data = json.load(sys.stdin)
for model in data.get('models', []):
    name = model.get('name', 'unknown')
    size = model.get('size', 0) / (1024**3)
    print(f'  - {name} ({size:.1f}GB)')
" 2>/dev/null || echo "  (Could not parse models)"

echo ""
echo "🎯 Testing Protocol:"
echo "  1. Quick game (5-10 moves) to test move quality"
echo "  2. Measure: legality, strategy, speed"
echo "  3. Check logs for extraction quality"
echo ""

# Test configurations
declare -a MODELS=("mistral" "openchat:3.5" "llama2:13b" "dolphin-mixtral:8x7b")
declare -a TEMPERATURES=("0.15" "0.20" "0.25")

echo "📋 Test Matrix:"
echo "  Models: ${MODELS[*]}"
echo "  Temperatures: ${TEMPERATURES[*]}"
echo ""

# Function to run a test
test_model() {
  local model=$1
  local temp=$2
  local count=$3

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Test #${count}: ${model} (temp=${temp})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Update config
  cat > chess-arena-config.json << EOF
{
  "version": "1.0.0",
  "game": "chess",
  "arena": {
    "maxGamesPerSession": 1,
    "randomizeEachGame": false,
    "defaultTimeControl": "infinite"
  },
  "players": [
    {
      "id": "player-1",
      "name": "${model}-white",
      "provider": "ollama",
      "model": "${model}",
      "temperature": ${temp},
      "personality": "balanced"
    },
    {
      "id": "player-2",
      "name": "${model}-black",
      "provider": "ollama",
      "model": "${model}",
      "temperature": ${temp},
      "personality": "competitive"
    }
  ],
  "broadcast": {
    "port": 9000,
    "enabled": false,
    "displayName": "AI Chess Arena - Test"
  }
}
EOF

  echo "Config updated: ${model} @ temp=${temp}"
  echo ""
  echo "Starting chess game (max 10 moves for quick feedback)..."
  echo ""

  # Run the game with timeout
  if timeout 60s pnpm chess 2>&1 | head -200; then
    echo ""
    echo "✅ Test completed"
  else
    echo ""
    echo "⚠️  Test timed out or failed"
  fi

  echo ""
  sleep 2
}

# Run tests interactively
echo "Choose which model to test:"
echo ""
for i in "${!MODELS[@]}"; do
  echo "  [$((i+1))] ${MODELS[i]}"
done
echo "  [0] Run all models (may take 10+ minutes)"
echo ""
read -p "Enter choice (0-${#MODELS[@]}): " choice

if [ "$choice" = "0" ]; then
  test_count=1
  for model in "${MODELS[@]}"; do
    for temp in "${TEMPERATURES[@]}"; do
      test_model "$model" "$temp" "$test_count"
      test_count=$((test_count + 1))
    done
  done
elif [ "$choice" -ge 1 ] && [ "$choice" -le "${#MODELS[@]}" ]; then
  idx=$((choice - 1))
  test_model "${MODELS[$idx]}" "0.15" "1"
else
  echo "Invalid choice"
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   TESTING COMPLETE                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Next Steps:"
echo "  1. Review move quality in logs"
echo "  2. Check extraction quality (structured/token/pattern)"
echo "  3. Compare latency across models"
echo "  4. If good: configure for production in chess-arena-config.json"
echo ""
