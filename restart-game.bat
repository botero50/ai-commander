@echo off
REM Kill any running pyrogenesis processes
taskkill /F /IM pyrogenesis.exe 2>nul
echo.
echo Waiting for process cleanup...
timeout /T 3 /nobreak

REM Start fresh 0 A.D. instance
echo.
echo Starting fresh 0 A.D. instance with RL Interface...
echo.

set PYROGENESIS=%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe

"%PYROGENESIS%" ^
  --rl-interface=127.0.0.1:6000 ^
  --mod=public ^
  -autostart="skirmishes/acropolis_bay_2p" ^
  -autostart-ai=1:petra ^
  -autostart-civ=1:athen ^
  -autostart-civ=2:gaul

echo.
echo Game process ended.
pause
