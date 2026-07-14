#!/bin/bash
# Get debug data from AI Commander API endpoints
# Usage: ./get-debug-data.sh [world-state|camera-test]

ENDPOINT="${1:-world-state}"
BASE_URL="http://localhost:8080/api/debug"

echo "Fetching $ENDPOINT data..."

# Get the data and pretty print it
curl -s "$BASE_URL/$ENDPOINT" | python -m json.tool > "debug-$ENDPOINT-$(date +%Y-%m-%d-%H%M%S).json" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Data saved to: debug-$ENDPOINT-$(date +%Y-%m-%d-%H%M%S).json"
    cat "debug-$ENDPOINT-$(date +%Y-%m-%d-%H%M%S).json"
else
    echo "Error fetching data. Make sure the arena is running."
    echo "npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts"
fi
