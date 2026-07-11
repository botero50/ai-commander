@echo off
REM Test camera movement using AutoHotkey

setlocal enabledelayedexpansion

REM Full path to AutoHotkey
set AHK="C:\Program Files\AutoHotkey\v2\AutoHotkey.exe"

echo.
echo Checking for AutoHotkey at %AHK%...
if not exist %AHK% (
    echo AutoHotkey not found at %AHK%
    echo Please install from: https://www.autohotkey.com/
    pause
    exit /b 1
)

echo AutoHotkey found!
echo.
echo Camera Control Test with AutoHotkey
echo Make sure 0 A.D. game window is visible
echo.

echo 1. Moving camera UP (W key) for 2 seconds...
%AHK% camera-controller.ahk w 2000
timeout /t 1 /nobreak

echo 2. Moving camera DOWN (S key) for 2 seconds...
%AHK% camera-controller.ahk s 2000
timeout /t 1 /nobreak

echo 3. Moving camera LEFT (A key) for 2 seconds...
%AHK% camera-controller.ahk a 2000
timeout /t 1 /nobreak

echo 4. Moving camera RIGHT (D key) for 2 seconds...
%AHK% camera-controller.ahk d 2000
timeout /t 1 /nobreak

echo 5. Zooming OUT (Q key) for 1 second...
%AHK% camera-controller.ahk q 1000
timeout /t 1 /nobreak

echo 6. Zooming IN (E key) for 1 second...
%AHK% camera-controller.ahk e 1000

echo.
echo All tests complete!
echo Did the camera move? If yes, AutoHotkey works!
pause
