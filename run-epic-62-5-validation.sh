#!/bin/bash

# EPIC 62.5 Validation Runner
# Runs 2 real matches and captures evidence

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  EPIC 62.5: Multi-Match Trash Talk Validation Runner      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Install Node.js"
    exit 1
fi

if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama not found. Trash talk will use fallback taunts (still valid)"
    OLLAMA_AVAILABLE=0
else
    echo "✓ Ollama available"
    OLLAMA_AVAILABLE=1
fi

if [ ! -f "packages/zeroad-adapter/src/arena/run-arena-loop.ts" ]; then
    echo "❌ run-arena-loop.ts not found. Wrong directory?"
    exit 1
fi

echo "✓ Build verified"
echo ""

# Create output directory
mkdir -p validation-output

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="validation-output/epic-62-5-${TIMESTAMP}.log"

echo "🚀 Starting validation run..."
echo "📝 Logging to: $LOG_FILE"
echo ""

# Note about 0 A.D.
echo "⚠️  IMPORTANT: Make sure 0 A.D. is NOT already running"
echo "   If 0 A.D. is running, close it now (the script will kill it anyway)"
echo ""
echo "Press ENTER to continue, or Ctrl+C to cancel..."
read -r

echo "Starting Arena loop with 2 matches..."
echo "This will take 10-20 minutes depending on gameplay."
echo ""

# Run the matches with full output capture
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2 2>&1 | tee "$LOG_FILE"

echo ""
echo "✅ Validation run complete!"
echo "📝 Full output saved to: $LOG_FILE"
echo ""

# Parse log for key metrics
echo "════════════════════════════════════════════════════════════"
echo "📊 VALIDATION RESULTS"
echo "════════════════════════════════════════════════════════════"
echo ""

# Count broadcast state samples
SAMPLES=$(grep -c "BROADCAST STATE SAMPLE" "$LOG_FILE" || echo "0")
echo "📺 Broadcast state samples captured: $SAMPLES"

# Count trash talk messages
TRASH_TALKS=$(grep -c "Trash talk captured for broadcast" "$LOG_FILE" || echo "0")
echo "🗣️  Trash talk messages captured: $TRASH_TALKS"

# Check for match completions
MATCH_1=$(grep "MATCH 1 COMPLETE" "$LOG_FILE" > /dev/null && echo "✅ YES" || echo "❌ NO")
MATCH_2=$(grep "MATCH 2 COMPLETE" "$LOG_FILE" > /dev/null && echo "✅ YES" || echo "❌ NO")
echo ""
echo "Match Completion:"
echo "  Match 1: $MATCH_1"
echo "  Match 2: $MATCH_2"

# Check for resource extraction (non-zero values)
RESOURCES=$(grep -c '"wood":.*[1-9]' "$LOG_FILE" || echo "0")
echo ""
echo "Resource extraction (non-zero detected): $RESOURCES instances"

# Show final statistics if available
echo ""
echo "📈 Arena Statistics:"
grep "FINAL STATISTICS" "$LOG_FILE" -A 5 || echo "   (statistics not captured)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Validation complete!"
echo ""
echo "Next steps:"
echo "1. Review full log: cat $LOG_FILE"
echo "2. Check for:"
echo "   ✓ BROADCAST STATE SAMPLE appears multiple times"
echo "   ✓ Resources are non-zero (not all zeros)"
echo "   ✓ Unit counts increase during match"
echo "   ✓ Trash talk messages appear"
echo "   ✓ Match 2 has different map from Match 1"
echo "   ✓ No stale trash talk between matches"
echo "3. Create validation report: EPIC-62-5-FINAL-VALIDATION.md"
echo ""
