@echo off
REM Start 0 A.D. for R2.7.1 test: One Ollama brain vs Built-in AI

set PYROGENESIS=%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe

echo Starting 0 A.D. with RL Interface...
echo.
echo Game will load on localhost:6000
echo Player 1: Athenians (controlled by Ollama)
echo Player 2: Gauls (controlled by Petra AI)
echo Map: Acropolis Bay 2-player
echo.
echo Waiting for game to initialize...
echo.

"%PYROGENESIS%" ^
  --rl-interface=127.0.0.1:6000 ^
  --mod=public ^
  -autostart="skirmishes/acropolis_bay_2p" ^
  -autostart-ai=2:petra ^
  -autostart-civ=1:athen ^
  -autostart-civ=2:gaul

echo.
echo Game process ended.
pause
