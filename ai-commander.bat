@echo off
REM AI Commander CLI Script for Windows
REM Usage: ai-commander match start [options]
REM        ai-commander tournament run [options]

setlocal enabledelayedexpansion

REM Colors not supported in cmd, use text instead
set "RESET="
set "GREEN="
set "BLUE="
set "YELLOW="
set "RED="

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo Error: Node.js is not installed
    echo Download from: https://nodejs.org/
    exit /b 1
)

REM Check if pnpm is installed
where pnpm >nul 2>nul
if errorlevel 1 (
    echo Installing pnpm...
    call npm install -g pnpm
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
)

REM Check if project is built
if not exist "packages\zeroad-adapter\dist" (
    echo Building project...
    call pnpm build
)

REM Show help if no arguments
if "%1"=="" (
    goto :show_help
)

REM Parse command
if /i "%1"=="help" goto :show_help
if /i "%1"=="--help" goto :show_help
if /i "%1"=="-h" goto :show_help
if /i "%1"=="version" goto :show_version
if /i "%1"=="--version" goto :show_version
if /i "%1"=="-v" goto :show_version

if /i "%1"=="match" goto :run_cli
if /i "%1"=="tournament" goto :run_cli
if /i "%1"=="config" goto :run_cli
if /i "%1"=="replay" goto :run_cli

echo Unknown command: %1
echo.
goto :show_help

:run_cli
echo Running: ai-commander %*
echo.
REM Run the CLI with all arguments
node --input-type=module -e "import { createCLI } from './packages/zeroad-adapter/dist/cli/index.js'; const cli = createCLI(); const args = process.argv.slice(2); const exitCode = await cli.run(['node', 'cli', ...args]); process.exit(exitCode);" %*
exit /b %ERRORLEVEL%

:show_version
echo AI Commander v1.0.0-mvp
echo.
for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i
for /f "tokens=*" %%i in ('pnpm --version') do echo pnpm: %%i
exit /b 0

:show_help
echo.
echo AI Commander CLI
echo.
echo Usage: ai-commander ^<command^> [options]
echo.
echo Commands:
echo   match start         Start a match between two AI brains
echo   tournament run      Run a tournament
echo   tournament status   Show tournament status
echo   tournament list     List all tournaments
echo   config preset list  List available presets
echo   help                Show this help message
echo   version             Show version information
echo.
echo Examples:
echo   ai-commander match start
echo   ai-commander match start --brain1 Ollama --brain2 Ollama --max-ticks 5000
echo   ai-commander tournament run --preset multi-llm
echo   ai-commander match start --help
echo.
echo For detailed setup and usage instructions, see GETTING-STARTED.md
echo.
exit /b 0
