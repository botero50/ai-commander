@echo off
REM Setup script for automatic camera control
REM Installs required Python dependencies

echo.
echo ================================================================
echo AI Commander - Camera Control Setup
echo ================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo ✓ Python found
python --version
echo.

echo Installing pynput and pywin32...
pip install pynput pywin32 --quiet

if errorlevel 1 (
    echo ERROR: Failed to install packages
    pause
    exit /b 1
)

echo ✓ pynput and pywin32 installed
echo.

echo Setting up pywin32 post-install...
python -m pip install --upgrade pywin32 --quiet

REM Try the post-install script
python -c "import pywin32_postinstall; pywin32_postinstall.install()" 2>nul
if errorlevel 1 (
    echo Note: Some pywin32 setup may have been skipped (non-critical)
)

echo.
echo ================================================================
echo Setup complete!
echo ================================================================
echo.
echo Next steps:
echo 1. Make sure 0 A.D. is installed and working
echo 2. Edit .env file and set ENABLE_AUTO_CAMERA=true
echo 3. Run the arena: npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
echo 4. Camera should automatically follow battles using WASD keys
echo.
echo For more help, see CAMERA_SETUP.md
echo.
pause
