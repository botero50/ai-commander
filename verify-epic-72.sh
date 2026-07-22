#!/bin/bash

# EPIC 72 Verification Script
# Checks that all WebSocket server and React UI components are in place

set -e

echo "=================================================================================="
echo "EPIC 72 Verification Script"
echo "=================================================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✅${NC} $1"
    return 0
  else
    echo -e "${RED}❌${NC} $1 (NOT FOUND)"
    return 1
  fi
}

check_function() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $1 contains $2"
    return 0
  else
    echo -e "${RED}❌${NC} $1 missing $2"
    return 1
  fi
}

# Check files exist
echo "Checking files..."
check_file "websocket-server.js"
check_file "apps/web/src/hooks/useWebSocket.ts"
check_file "apps/web/src/components/ChessSpectator/ChessSpectator.tsx"
check_file "apps/web/src/components/ChessSpectator/ChessSpectator.css"
check_file "apps/web/src/App.tsx"
check_file "apps/web/src/App.css"
echo ""

# Check integrations
echo "Checking integrations..."
check_function "arena.js" "WebSocketServer"
check_function "arena.js" "wsServer.emitGameStarted"
check_function "real-chess-game.js" "this.wsServer"
check_function "real-chess-game.js" "emitMovePlayed"
check_function "ui.js" "WebSocket Server"
echo ""

# Check dependencies
echo "Checking dependencies..."
if grep -q '"ws"' "package.json"; then
  echo -e "${GREEN}✅${NC} ws dependency in package.json"
else
  echo -e "${RED}❌${NC} ws dependency missing"
fi

if grep -q '"react-chessboard"' "apps/web/package.json"; then
  echo -e "${GREEN}✅${NC} react-chessboard dependency in apps/web/package.json"
else
  echo -e "${RED}❌${NC} react-chessboard dependency missing"
fi

if grep -q '"chess.js"' "apps/web/package.json"; then
  echo -e "${GREEN}✅${NC} chess.js dependency in apps/web/package.json"
else
  echo -e "${RED}❌${NC} chess.js dependency missing"
fi
echo ""

# Check documentation
echo "Checking documentation..."
check_file "EPIC-72-IMPLEMENTATION.md"
check_file "QUICK-START-EPIC-72.md"
check_file "EPIC-72-SUMMARY.md"
check_file "EPIC-72-READY.txt"
echo ""

echo "=================================================================================="
echo "✅ EPIC 72 Verification Complete"
echo "=================================================================================="
echo ""
echo "To start streaming:"
echo ""
echo "  Terminal 1:"
echo "    npm run chess"
echo ""
echo "  Terminal 2:"
echo "    cd apps/web && pnpm run dev"
echo ""
echo "  Browser:"
echo "    http://localhost:5173"
echo ""
