#!/bin/bash

# Test arena loop with 1 match to verify map rotation works
echo "Building..."
npm run build

echo -e "\n🎮 Running arena loop with 1 match to test map rotation..."
echo "This will start a game and run until completion."
echo "You should see:"
echo "  ✓ Map discovery (or fallback list)"
echo "  ✓ Map selection for match 1"
echo "  ✓ Game launch with selected map"
echo "  ✓ Match completion and rotation stats"
echo ""

npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
