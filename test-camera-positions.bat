@echo off
REM Test camera movement to different positions

echo Testing camera movement...
echo.

REM Test 1: Center of map
echo 1. Moving to CENTER (256, 256)...
curl -X POST http://localhost:6000/evaluate -H "Content-Type: text/plain" -d "CameraControl.SetPosition(256, 256); 'center'"
timeout /t 2 /nobreak
echo.

REM Test 2: Corner
echo 2. Moving to CORNER (50, 50)...
curl -X POST http://localhost:6000/evaluate -H "Content-Type: text/plain" -d "CameraControl.SetPosition(50, 50); 'corner'"
timeout /t 2 /nobreak
echo.

REM Test 3: Another corner
echo 3. Moving to OPPOSITE CORNER (450, 450)...
curl -X POST http://localhost:6000/evaluate -H "Content-Type: text/plain" -d "CameraControl.SetPosition(450, 450); 'opposite'"
timeout /t 2 /nobreak
echo.

REM Test 4: Get current position
echo 4. Getting current position...
curl -X POST http://localhost:6000/evaluate -H "Content-Type: text/plain" -d "JSON.stringify(CameraControl.GetPosition())"
echo.
echo.
echo All tests complete!
