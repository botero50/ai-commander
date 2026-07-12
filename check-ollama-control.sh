#!/bin/bash

# Quick diagnostic to check if Ollama is controlling the game
# Run this while a match is running or check the logs after

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        Checking if Ollama is Controlling the Game             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Find the most recent log file
LOG_FILE=$(ls -t validation-output/epic-62-5-*.log 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
    echo "❌ No validation log found."
    echo ""
    echo "Run validation first:"
    echo "  npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2"
    exit 1
fi

echo "📋 Analyzing: $LOG_FILE"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "1. OLLAMA BRAIN INITIALIZATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

BRAIN_P1=$(grep "Ollama brain P1 initialized" "$LOG_FILE")
BRAIN_P2=$(grep "Ollama brain P2 initialized" "$LOG_FILE")

if [ -n "$BRAIN_P1" ]; then
    echo "✅ Player 1 Ollama Brain: INITIALIZED"
    echo "   $BRAIN_P1"
else
    echo "❌ Player 1 Ollama Brain: NOT INITIALIZED"
    grep -i "Ollama not available" "$LOG_FILE" | head -1
fi

echo ""

if [ -n "$BRAIN_P2" ]; then
    echo "✅ Player 2 Ollama Brain: INITIALIZED"
    echo "   $BRAIN_P2"
else
    echo "❌ Player 2 Ollama Brain: NOT INITIALIZED"
    grep -i "Ollama P2 not available" "$LOG_FILE" | head -1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "2. BRAIN DECISION EVIDENCE"
echo "════════════════════════════════════════════════════════════════"
echo ""

DECISIONS=$(grep -c "Brain decision failed\|brainP1\|brainP2" "$LOG_FILE" 2>/dev/null || echo "0")
echo "Decision attempts found: $DECISIONS"

# Check for any decision failures
FAILED=$(grep "Brain decision failed" "$LOG_FILE" | wc -l)
if [ "$FAILED" -gt 0 ]; then
    echo "⚠️  Failed decisions: $FAILED"
    echo ""
    grep "Brain decision failed" "$LOG_FILE" | head -3
else
    echo "✅ No decision failures detected"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "3. TRASH TALK MESSAGES (Proof of LLM Activity)"
echo "════════════════════════════════════════════════════════════════"
echo ""

TRASH_TALK_COUNT=$(grep -c "Trash talk captured for broadcast" "$LOG_FILE" 2>/dev/null || echo "0")
echo "Total trash talk messages: $TRASH_TALK_COUNT"
echo ""

if [ "$TRASH_TALK_COUNT" -gt 0 ]; then
    echo "Sample trash talk messages:"
    grep -A 2 "Trash talk captured for broadcast" "$LOG_FILE" | head -15
    echo ""

    # Check if any messages mention AI_GENERATED (harder to extract, look for patterns)
    echo "Message sources:"
    grep "speaker:" "$LOG_FILE" | sort | uniq -c | tail -5
else
    echo "❌ No trash talk messages found"
    echo "   This could mean:"
    echo "   - Ollama not available (using fallback taunts)"
    echo "   - Decision frequency too low (every 500 ticks)"
    echo "   - Match too short"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "4. BROADCAST STATE (Real Game Data)"
echo "════════════════════════════════════════════════════════════════"
echo ""

BROADCAST_COUNT=$(grep -c "BROADCAST STATE SAMPLE" "$LOG_FILE" 2>/dev/null || echo "0")
echo "Broadcast state samples: $BROADCAST_COUNT"
echo ""

if [ "$BROADCAST_COUNT" -gt 0 ]; then
    echo "Sample broadcast state (showing resources):"
    grep -A 15 "BROADCAST STATE SAMPLE" "$LOG_FILE" | grep -E "name|model|units|resources|wood|stone" | head -10
    echo ""

    # Check if resources are non-zero
    NON_ZERO=$(grep -c '"wood":[1-9]' "$LOG_FILE" 2>/dev/null || echo "0")
    echo "Non-zero resource extractions: $NON_ZERO"
    if [ "$NON_ZERO" -gt 0 ]; then
        echo "✅ Resources are being extracted (not hardcoded zeros)"
    else
        echo "⚠️  All resources showing as zero"
    fi
else
    echo "❌ No broadcast state samples found"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "5. MATCH COMPLETION"
echo "════════════════════════════════════════════════════════════════"
echo ""

MATCH_1=$(grep "MATCH 1 COMPLETE" "$LOG_FILE")
MATCH_2=$(grep "MATCH 2 COMPLETE" "$LOG_FILE")

if [ -n "$MATCH_1" ]; then
    echo "✅ Match 1: $MATCH_1"
else
    echo "❌ Match 1: NOT COMPLETE"
fi

echo ""

if [ -n "$MATCH_2" ]; then
    echo "✅ Match 2: $MATCH_2"
else
    echo "⚠️  Match 2: Not started or not complete"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "6. DIAGNOSTIC SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Score the evidence
SCORE=0

[ -n "$BRAIN_P1" ] && SCORE=$((SCORE + 1))
[ "$TRASH_TALK_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
[ "$BROADCAST_COUNT" -gt 0 ] && SCORE=$((SCORE + 1))
[ -n "$MATCH_1" ] && SCORE=$((SCORE + 1))
[ "$NON_ZERO" -gt 0 ] && SCORE=$((SCORE + 1))

echo "Evidence Score: $SCORE / 5"
echo ""

case $SCORE in
    5)
        echo "✅ EXCELLENT - Ollama is actively controlling the game"
        echo ""
        echo "Evidence:"
        echo "  ✓ Ollama brain initialized"
        echo "  ✓ Trash talk messages generated"
        echo "  ✓ Broadcast state updated"
        echo "  ✓ Matches completed"
        echo "  ✓ Real resources extracted"
        ;;
    4)
        echo "✅ GOOD - Ollama is mostly controlling the game"
        echo ""
        echo "Minor issues detected - check above for details"
        ;;
    3)
        echo "⚠️  PARTIAL - Ollama initialization but limited evidence"
        echo ""
        echo "Possible issues:"
        echo "  - Ollama timeout during trash talk generation"
        echo "  - Match too short to see full Ollama activity"
        echo "  - Decision frequency too low"
        ;;
    2)
        echo "❌ WEAK - Limited evidence of Ollama control"
        echo ""
        echo "Likely running Petra AI only, or Ollama initialization failed"
        ;;
    *)
        echo "❌ FAILED - Ollama not controlling game"
        echo ""
        echo "Check:"
        echo "  1. Is Ollama running? (ollama serve)"
        echo "  2. Are models available? (ollama list)"
        echo "  3. Check full log for error messages:"
        echo "     grep -i 'error\|failed' '$LOG_FILE'"
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "To see full details, check the log file:"
echo "  cat $LOG_FILE"
echo ""
echo "Or search for specific patterns:"
echo "  grep 'Ollama brain' $LOG_FILE"
echo "  grep 'Trash talk' $LOG_FILE"
echo "  grep 'BROADCAST STATE' $LOG_FILE"
echo ""
