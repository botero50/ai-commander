@echo off
REM Script to start 0 A.D. with RL Interface for testing
REM Keep this window open while running tests

echo Starting 0 A.D. with RL Interface on port 6000...
echo You can now run: node test-r2-1-manual-protocol.js

"C:\Users\boter\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe" --rl-interface=127.0.0.1:6000 --mod=public

echo.
echo Game closed.
pause
