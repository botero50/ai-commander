@echo off
REM Kill any running pyrogenesis processes
taskkill /F /IM pyrogenesis.exe 2>nul
echo.
echo Waiting for process cleanup...
timeout /T 3 /nobreak

REM Start fresh 0 A.D. instance with tournament configuration
echo.
echo Starting fresh 0 A.D. instance with tournament configuration...
echo - No fog of war
echo - Both players neutral (Ollama controlled)
echo - Cheats enabled (for testing)
echo.

set PYROGENESIS=%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe

REM Launch with:
REM --nofog: Disable fog of war (see all map)
REM -autostart: Start game automatically with scenario
REM No AI assignments (both players neutral)
"%PYROGENESIS%" ^
  --rl-interface=127.0.0.1:6000 ^
  --mod=public ^
  -autostart="skirmishes/acropolis_bay_2p" ^
  -autostart-civ=1:gaul ^
  -autostart-civ=2:athen

echo.
echo Game process ended.
pause
