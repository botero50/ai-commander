@echo off
REM Quick diagnostic to check if Ollama is controlling the game

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║        Checking if Ollama is Controlling the Game             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Find the most recent log file
for /f "tokens=*" %%a in ('dir /b /o-d validation-output\epic-62-5-*.log 2^>nul ^| findstr /r ".*" ^| head -1') do set LOG_FILE=validation-output\%%a

if "!LOG_FILE!"=="" (
    echo ❌ No validation log found.
    echo.
    echo Run validation first:
    echo   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
    exit /b 1
)

echo 📋 Analyzing: !LOG_FILE!
echo.

echo ════════════════════════════════════════════════════════════════
echo 1. OLLAMA BRAIN INITIALIZATION
echo ════════════════════════════════════════════════════════════════
echo.

findstr "Ollama brain P1 initialized" "!LOG_FILE!" >nul
if errorlevel 1 (
    echo ❌ Player 1 Ollama Brain: NOT INITIALIZED
    findstr "Ollama P1 not available" "!LOG_FILE!"
) else (
    echo ✅ Player 1 Ollama Brain: INITIALIZED
    for /f "tokens=*" %%a in ('findstr "Ollama brain P1 initialized" "!LOG_FILE!"') do echo    %%a
)

echo.

findstr "Ollama brain P2 initialized" "!LOG_FILE!" >nul
if errorlevel 1 (
    echo ❌ Player 2 Ollama Brain: NOT INITIALIZED
) else (
    echo ✅ Player 2 Ollama Brain: INITIALIZED
    for /f "tokens=*" %%a in ('findstr "Ollama brain P2 initialized" "!LOG_FILE!"') do echo    %%a
)

echo.
echo ════════════════════════════════════════════════════════════════
echo 2. TRASH TALK MESSAGES (Proof of LLM Activity)
echo ════════════════════════════════════════════════════════════════
echo.

for /f %%a in ('findstr /c:"Trash talk captured for broadcast" "!LOG_FILE!" ^| find /c "Trash"') do set TRASH_TALK_COUNT=%%a
if "!TRASH_TALK_COUNT!"=="" set TRASH_TALK_COUNT=0

echo Total trash talk messages: !TRASH_TALK_COUNT!
echo.

if !TRASH_TALK_COUNT! GTR 0 (
    echo Sample trash talk messages:
    findstr /c:"Trash talk captured" "!LOG_FILE!" | findstr /c:"speaker" | more +0
    echo.
    echo Message details found in log
) else (
    echo ❌ No trash talk messages found
    echo    This could mean:
    echo    - Ollama not available (using fallback taunts)
    echo    - Decision frequency too low (every 500 ticks)
    echo    - Match too short
)

echo.
echo ════════════════════════════════════════════════════════════════
echo 3. BROADCAST STATE (Real Game Data)
echo ════════════════════════════════════════════════════════════════
echo.

for /f %%a in ('findstr /c:"BROADCAST STATE SAMPLE" "!LOG_FILE!" ^| find /c "BROADCAST"') do set BROADCAST_COUNT=%%a
if "!BROADCAST_COUNT!"=="" set BROADCAST_COUNT=0

echo Broadcast state samples: !BROADCAST_COUNT!
echo.

if !BROADCAST_COUNT! GTR 0 (
    echo ✅ Broadcast state is being sampled

    REM Check for non-zero resources
    for /f %%a in ('findstr """wood"":[1-9]" "!LOG_FILE!" ^| find /c "wood"') do set NON_ZERO=%%a
    if "!NON_ZERO!"=="" set NON_ZERO=0

    echo Non-zero resource extractions: !NON_ZERO!
    if !NON_ZERO! GTR 0 (
        echo ✅ Resources are being extracted (not hardcoded zeros)
    ) else (
        echo ⚠️  All resources showing as zero
    )
) else (
    echo ❌ No broadcast state samples found
)

echo.
echo ════════════════════════════════════════════════════════════════
echo 4. MATCH COMPLETION
echo ════════════════════════════════════════════════════════════════
echo.

findstr "MATCH 1 COMPLETE" "!LOG_FILE!" >nul
if errorlevel 1 (
    echo ❌ Match 1: NOT COMPLETE
) else (
    echo ✅ Match 1: COMPLETE
    for /f "tokens=*" %%a in ('findstr "MATCH 1 COMPLETE" "!LOG_FILE!"') do echo    %%a
)

echo.

findstr "MATCH 2 COMPLETE" "!LOG_FILE!" >nul
if errorlevel 1 (
    echo ⚠️  Match 2: Not started or not complete
) else (
    echo ✅ Match 2: COMPLETE
    for /f "tokens=*" %%a in ('findstr "MATCH 2 COMPLETE" "!LOG_FILE!"') do echo    %%a
)

echo.
echo ════════════════════════════════════════════════════════════════
echo 5. DIAGNOSTIC SUMMARY
echo ════════════════════════════════════════════════════════════════
echo.

echo Key Questions:
echo.
echo Q: Is Ollama Brain P1 initialized?
findstr "Ollama brain P1 initialized" "!LOG_FILE!" >nul && echo ✅ YES || echo ❌ NO
echo.

echo Q: Are trash talk messages being generated?
if !TRASH_TALK_COUNT! GTR 0 (
    echo ✅ YES - !TRASH_TALK_COUNT! messages found
) else (
    echo ❌ NO - 0 messages
)
echo.

echo Q: Is broadcast state showing real game data?
if !BROADCAST_COUNT! GTR 0 (
    echo ✅ YES - !BROADCAST_COUNT! samples found
) else (
    echo ❌ NO - 0 samples
)
echo.

echo ════════════════════════════════════════════════════════════════
echo.
echo INTERPRETATION:
echo.
echo If Ollama brain initialized + trash talk + broadcast state:
echo   → Ollama IS controlling the game ✅
echo.
echo If Ollama brain NOT initialized + no trash talk:
echo   → Petra AI is controlling (Ollama unavailable) ❌
echo.
echo If partial results:
echo   → Check Ollama server and model availability
echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo Full log: !LOG_FILE!
echo.
pause
