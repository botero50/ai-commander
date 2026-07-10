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
  -autostart="skirmishes/alpine_mountains_3p" ^
  -autostart-ai=2:petra ^
  -autostart-ai=3:petra

echo.
echo Game process ended.
pause
