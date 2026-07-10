@echo off
REM AI Commander Arena — Automated Match Loop
REM Auto-starts/stops 0 A.D. game between each match
REM
REM Usage: arena-loop.bat [matches]
REM Examples:
REM   arena-loop.bat         (run forever)
REM   arena-loop.bat 10      (run 10 matches)

setlocal enabledelayedexpansion

set MATCHES=%1
if "%MATCHES%"=="" (
    echo Running arena forever...
    npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
) else (
    echo Running %MATCHES% matches...
    npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches %MATCHES%
)

endlocal
pause
