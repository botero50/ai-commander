@echo off
REM Start EPIC 62 Streaming Demo
REM This script starts the arena loop and opens a WebSocket test window

echo.
echo ================================================================
echo  EPIC 62 - Ollama vs Ollama Trash Talk Broadcast
echo ================================================================
echo.

echo Starting Arena Loop (Terminal 1)...
echo This will run the game with Ollama players and stream data.
echo.

REM Start the arena loop in a new window
start cmd /k "cd /d %cd% && npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1"

REM Wait 10 seconds for server to start
echo Waiting for broadcast server to start (10 seconds)...
timeout /t 10 /nobreak

echo.
echo ================================================================
echo.
echo Starting WebSocket Test (Terminal 2)...
echo This connects to the streaming server and shows messages.
echo.

REM Start the WebSocket test in another new window
start powershell -ExecutionPolicy Bypass -Command "cd '%cd%'; .\test-websocket.ps1; pause"

echo.
echo ================================================================
echo.
echo You should now see:
echo - Terminal 1: Arena loop running (match in progress)
echo - Terminal 2: WebSocket test receiving messages
echo.
echo If Terminal 2 says "Connected", then STREAMING IS WORKING!
echo.
echo ================================================================
echo.
pause
