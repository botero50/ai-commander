@echo off
REM EPIC 62.5 Validation Runner for Windows
REM Runs 2 real matches and captures evidence

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  EPIC 62.5: Multi-Match Trash Talk Validation Runner      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check build
echo 📋 Verifying build...
call npm run build >nul 2>&1
if errorlevel 1 (
    echo ❌ Build failed. Run: npm run build
    exit /b 1
)
echo ✓ Build verified

REM Check for 0 A.D.
if not exist "%APPDATA%\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe" (
    echo ❌ 0 A.D. not found at expected location
    exit /b 1
)
echo ✓ 0 A.D. found

echo.

REM Create output directory
if not exist "validation-output" mkdir validation-output

REM Generate timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%-%mytime%

set LOG_FILE=validation-output\epic-62-5-%TIMESTAMP%.log

echo 🚀 Starting validation run...
echo 📝 Logging to: %LOG_FILE%
echo.

echo ⚠️  IMPORTANT: Make sure 0 A.D. is NOT already running
echo    If 0 A.D. is running, close it now
echo.

pause

echo Starting Arena loop with 2 matches...
echo This will take 10-20 minutes depending on gameplay.
echo.

REM Run the matches with full output capture
call npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2 > "%LOG_FILE%" 2>&1

echo.
echo ✅ Validation run complete!
echo 📝 Full output saved to: %LOG_FILE%
echo.

echo ════════════════════════════════════════════════════════════
echo 📊 VALIDATION RESULTS
echo ════════════════════════════════════════════════════════════
echo.

REM Count broadcast state samples
for /f %%a in ('findstr /c:"BROADCAST STATE SAMPLE" "%LOG_FILE%" ^| find /c "BROADCAST"') do set SAMPLES=%%a
if "!SAMPLES!"=="" set SAMPLES=0
echo 📺 Broadcast state samples captured: !SAMPLES!

REM Count trash talk messages
for /f %%a in ('findstr /c:"Trash talk captured for broadcast" "%LOG_FILE%" ^| find /c "Trash"') do set TRASH_TALKS=%%a
if "!TRASH_TALKS!"=="" set TRASH_TALKS=0
echo 🗣️  Trash talk messages captured: !TRASH_TALKS!

REM Check for match completions
findstr "MATCH 1 COMPLETE" "%LOG_FILE%" >nul
if errorlevel 1 (
    set MATCH_1=❌ NO
) else (
    set MATCH_1=✅ YES
)

findstr "MATCH 2 COMPLETE" "%LOG_FILE%" >nul
if errorlevel 1 (
    set MATCH_2=❌ NO
) else (
    set MATCH_2=✅ YES
)

echo.
echo Match Completion:
echo   Match 1: !MATCH_1!
echo   Match 2: !MATCH_2!

REM Count non-zero resource values
for /f %%a in ('findstr /r "\"wood\":[1-9]" "%LOG_FILE%" ^| find /c "wood"') do set RESOURCES=%%a
if "!RESOURCES!"=="" set RESOURCES=0
echo.
echo Resource extraction (non-zero detected): !RESOURCES! instances

echo.
echo ════════════════════════════════════════════════════════════
echo ✅ Validation complete!
echo.
echo Next steps:
echo 1. Review full log: type %LOG_FILE%
echo 2. Check for:
echo    ✓ BROADCAST STATE SAMPLE appears multiple times
echo    ✓ Resources are non-zero (not all zeros)
echo    ✓ Unit counts increase during match
echo    ✓ Trash talk messages appear
echo    ✓ Match 2 has different map from Match 1
echo    ✓ No stale trash talk between matches
echo 3. Create validation report: EPIC-62-5-FINAL-VALIDATION.md
echo.

pause
