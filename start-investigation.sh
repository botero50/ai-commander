#!/bin/bash

# Start Chess AI Investigation
# Runs instrumented games and collects evidence

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        CHESS AI INVESTIGATION - COLLECTING EVIDENCE            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Starting instrumented chess games..."
echo "Complete decision pipeline recorded for every move."
echo ""
echo "Output directory: chess-analysis/"
echo ""

# Create output directory
mkdir -p chess-analysis

# Run investigation
node run-instrumented-chess.js 2 chess-analysis

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ANALYSIS COMPLETE                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Review the reports:"
echo ""
echo "  Game 1 Report:"
echo "    cat chess-analysis/game-1/report.txt"
echo ""
echo "  Game 2 Report:"
echo "    cat chess-analysis/game-2/report.txt"
echo ""
echo "All data exported to chess-analysis/"
echo ""
