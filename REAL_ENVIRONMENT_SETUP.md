# Real Environment Setup Guide

**Status**: Comprehensive environment documentation  
**Purpose**: Make the runtime environment reproducible from a clean machine  
**Audience**: Developers, QA, DevOps, anyone setting up real OpenRA validation  

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Architecture Overview](#architecture-overview)
4. [Prerequisites](#prerequisites)
5. [Complete Setup Procedure](#complete-setup-procedure)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Environment Variables](#environment-variables)
9. [Startup Sequence](#startup-sequence)
10. [Validation Commands](#validation-commands)

---

## Overview

The real OpenRA validation environment consists of:

1. **Docker Desktop** (Windows 11) — Container runtime
2. **OpenRA-RL Container** — HTTP API service for game state and commands
3. **OpenRA Game Instance** — The actual RTS game (included in OpenRA-RL)
4. **Network Connectivity** — Local HTTP communication (localhost:8000, 9999)

All components run locally. No remote services required.

---

## System Requirements

### Host Machine
- **OS**: Windows 11 (tested on build 10.0.26200)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 10GB free (for Docker images and containers)
- **Architecture**: x86_64 or ARM64

### Docker Requirements
- **Docker Desktop**: Version 20.10+
- **Docker CLI**: Version 29.2.1+ (tested with 29.2.1)
- **WSL 2** or equivalent container runtime
- **Network**: localhost access (127.0.0.1)

### Development Environment
- **Node.js**: v18+ (for running AI Commander code)
- **pnpm**: v7+ (package manager)
- **TypeScript**: v5.x (already configured in project)

### Network Requirements
- **Port 8000**: OpenRA-RL HTTP API (must be available)
- **Port 9999**: Game connection port (must be available)
- **Localhost connectivity**: 127.0.0.1 must work
- **No VPN/Proxy**: Required for local development

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ AI Commander Validation                             │
│ (TypeScript, Node.js)                               │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
                     ↓
┌─────────────────────────────────────────────────────┐
│ Docker Container: OpenRA-RL                         │
│ ┌──────────────────────────────────────────────┐   │
│ │ Port 8000: HTTP API                          │   │
│ │ - GET /status        (health check)          │   │
│ │ - GET /observation   (game state)            │   │
│ │ - POST /step         (command execution)     │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Port 9999: Game Connection                   │   │
│ │ - OpenRA game instance                       │   │
│ │ - Automatic game startup                     │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Key Facts**:
- OpenRA-RL container includes the game engine
- Game starts automatically when container starts
- No separate OpenRA installation needed
- API and game share the same container
- All communication is HTTP-based (no sockets/pipes)

---

## Prerequisites

### Before Starting Setup

**Verify you have**:
```bash
# 1. Windows 11 or compatible
wmic os get caption  # Should show "Microsoft Windows 11"

# 2. Docker installed
docker --version    # Should show Docker version 20.10+

# 3. Adequate disk space
# Windows: Check C: drive has 10GB+ free

# 4. Node.js installed
node --version      # Should show v18+

# 5. pnpm installed
pnpm --version      # Should show v7+

# 6. Git (for this repo)
git --version       # Should show v2.x+

# 7. Network connectivity
ping 127.0.0.1      # Should respond (localhost)
```

### Verify No Port Conflicts

```bash
# Check if port 8000 is already in use
netstat -ano | findstr :8000
# Should return nothing (port is free)

# Check if port 9999 is already in use
netstat -ano | findstr :9999
# Should return nothing (port is free)
```

If ports are in use, kill the process:
```bash
# Find process using port 8000
netstat -ano | findstr :8000
# Note the PID (last column)

# Kill process (replace XXXX with PID)
taskkill /PID XXXX /F
```

---

## Complete Setup Procedure

### Step 1: Start Docker Daemon

**On Windows 11**:

**Option A: GUI (Recommended)**
```
1. Open Start Menu
2. Search for "Docker Desktop"
3. Click to launch
4. Wait 30-60 seconds for daemon to initialize
5. Verify: system tray shows Docker icon (whale symbol)
```

**Option B: PowerShell**
```powershell
# Start Docker Desktop service
Start-Process "C:\Program Files\Docker\Docker\Docker.exe"

# Wait for daemon to start
Start-Sleep -Seconds 30

# Verify it's running
docker ps
# Should show: CONTAINER ID   IMAGE   COMMAND...
```

**Verification**:
```bash
docker ps
# Expected output: (empty list or running containers)
# If error: "cannot connect to Docker daemon" → Docker not running yet
```

---

### Step 2: Pull OpenRA-RL Docker Image

```bash
# Pull the latest OpenRA-RL image
docker pull openra-rl:latest

# Verify image is downloaded
docker images | grep openra-rl
# Expected: Image "openra-rl" with tag "latest" listed
```

**Note**: First pull may take 2-5 minutes depending on internet speed (image ~500MB).

---

### Step 3: Start OpenRA-RL Container

**In a dedicated terminal** (Terminal 1):

```bash
# Start OpenRA-RL container
docker run \
  -p 8000:8000 \
  -p 9999:9999 \
  --name openra-rl-dev \
  openra-rl:latest
```

**Expected Output**:
```
[+] Running 1/1
 ✔ Container openra-rl-dev  Created
Attaching to openra-rl-dev
openra-rl-dev  | OpenRA-RL Server running on http://0.0.0.0:8000
openra-rl-dev  | Game instance initialized
openra-rl-dev  | Ready for connections
```

**What this means**:
- ✅ Container started successfully
- ✅ OpenRA game engine is running
- ✅ HTTP API is listening on port 8000
- ✅ Game connection is ready on port 9999

**Keep this terminal open** — it shows container logs. Do not close until validation is complete.

---

### Step 4: Verify Services Are Running

**In a new terminal** (Terminal 2):

```bash
# Check Docker container is running
docker ps --filter "name=openra-rl-dev"
# Expected: Shows running container with status "Up X seconds"

# Test health endpoint
curl -v http://localhost:8000/status
# Expected: HTTP 200 with JSON response
```

**Expected Health Check Response**:
```json
{
  "status": "ready",
  "timestamp": 1720310400,
  "version": "1.0"
}
```

---

### Step 5: Navigate to Project Directory

```bash
# Go to AI Commander project root
cd C:\Users\boter\ai-commander

# Verify project structure
ls -la | grep -E "packages|docs|README"
# Should show project files and directories
```

---

### Step 6: Install/Update Dependencies

```bash
# Install all dependencies
pnpm install

# Verify TypeScript is working
pnpm --filter openra-adapter exec tsc --version
# Expected: Version 5.x.x
```

---

## Verification Checklist

Use this checklist to confirm everything is working:

```
Environment Verification Checklist
===================================

Docker Setup:
  [ ] Docker Desktop running (icon visible in system tray)
  [ ] Docker CLI responds: docker ps
  [ ] Docker daemon version 20.10+
  [ ] WSL 2 or equivalent active

OpenRA-RL Container:
  [ ] Container started with: docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
  [ ] Container status: docker ps shows "openra-rl-dev" as "Up"
  [ ] Logs show "OpenRA-RL Server running on http://0.0.0.0:8000"
  [ ] Logs show "Game instance initialized"

Network Connectivity:
  [ ] Port 8000 is available (netstat check passed)
  [ ] Port 9999 is available (netstat check passed)
  [ ] Health endpoint responds: curl http://localhost:8000/status
  [ ] Response is valid JSON with "status": "ready"

Project Setup:
  [ ] In C:\Users\boter\ai-commander directory
  [ ] All dependencies installed: pnpm install passed
  [ ] TypeScript compiles: tsc --version works
  [ ] Project files present: packages/, docs/, README.md visible

Ready to Test:
  [ ] All above checks passed
  [ ] Terminal 1 showing OpenRA-RL logs
  [ ] Terminal 2 ready for validation commands
  [ ] Can proceed to Story 7.1
```

---

## Troubleshooting Guide

### Problem: Docker Daemon Not Starting

**Symptoms**:
- Command: `docker ps`
- Error: `error during connect: This error may indicate that the docker daemon is not running`

**Diagnosis**:
1. Check Docker Desktop is installed: `dir "C:\Program Files\Docker\Docker\Docker.exe"`
2. Check Windows service: `Get-Service Docker | Select Status`
3. Check WSL 2: `wsl --list --verbose`

**Solutions**:
1. **Restart Docker Desktop**:
   ```powershell
   # Close all Docker processes
   Get-Process | Where { $_.ProcessName -like "*Docker*" } | Stop-Process -Force
   
   # Wait 5 seconds
   Start-Sleep -Seconds 5
   
   # Restart
   Start-Process "C:\Program Files\Docker\Docker\Docker.exe"
   Start-Sleep -Seconds 60
   
   # Verify
   docker ps
   ```

2. **Restart WSL 2**:
   ```powershell
   # Shut down WSL
   wsl --shutdown
   
   # Restart Docker
   Start-Process "C:\Program Files\Docker\Docker\Docker.exe"
   Start-Sleep -Seconds 60
   
   # Verify
   docker ps
   ```

3. **Reset Docker daemon**:
   ```
   In Docker Desktop Settings:
   - Go to Settings → General
   - Click "Reset Docker" button
   - Wait for restart (~2 minutes)
   - Run: docker ps
   ```

---

### Problem: Port Already in Use

**Symptoms**:
- Error: `Error response from daemon: Ports are not available`
- Or: `bind: address already in use`

**Diagnosis**:
```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# If result shows: TCP ... LISTENING ... [PID]
# Then that PID is using the port
```

**Solutions**:

1. **Kill existing process**:
   ```bash
   # Replace XXXX with the PID from netstat
   taskkill /PID XXXX /F
   
   # Wait 5 seconds
   timeout /t 5
   
   # Try Docker again
   docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
   ```

2. **Use different ports** (if port 8000 is permanently occupied):
   ```bash
   # Run on port 8001 instead
   docker run -p 8001:8000 -p 9999:9999 openra-rl:latest
   
   # Update validation commands to use http://localhost:8001
   ```

3. **Check for zombie containers**:
   ```bash
   # List all containers (including stopped)
   docker ps -a
   
   # Remove old openra-rl containers
   docker rm openra-rl-dev
   
   # Try starting again
   docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
   ```

---

### Problem: OpenRA-RL Container Exits Immediately

**Symptoms**:
- Container starts then stops
- `docker ps` shows nothing
- Logs show error and exit

**Diagnosis**:
```bash
# Check exit logs
docker logs openra-rl-dev
# Look for error messages

# Check exit code
docker ps -a | grep openra-rl-dev
# Status column shows "Exited (X)"
```

**Solutions**:

1. **Container not found**:
   ```bash
   # Pull the image first
   docker pull openra-rl:latest
   
   # Then run
   docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
   ```

2. **Insufficient memory**:
   ```
   In Docker Desktop Settings:
   - Go to Settings → Resources
   - Increase "Memory" to 4GB or more
   - Click "Apply & Restart"
   - Wait for restart
   - Try running container again
   ```

3. **Corrupted image**:
   ```bash
   # Remove old image
   docker rmi openra-rl:latest
   
   # Pull fresh image
   docker pull openra-rl:latest
   
   # Run again
   docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
   ```

---

### Problem: Health Check Fails

**Symptoms**:
- Container is running: `docker ps` shows it
- Health check fails: `curl http://localhost:8000/status` returns error

**Diagnosis**:
```bash
# Test connectivity
curl -v http://localhost:8000/status
# Look at "Connected to" line and response code

# Check container logs
docker logs openra-rl-dev
# Look for startup errors

# Check port mapping
docker port openra-rl-dev
# Should show: 8000/tcp -> 127.0.0.1:8000
```

**Solutions**:

1. **Give container more startup time**:
   ```bash
   # Container may need 10-15 seconds to fully initialize
   timeout /t 15
   curl http://localhost:8000/status
   ```

2. **Incorrect localhost**:
   ```bash
   # Try explicit IP
   curl http://127.0.0.1:8000/status
   
   # If that works, use 127.0.0.1 in all commands
   curl http://127.0.0.1:8000/observation
   ```

3. **Firewall blocking port**:
   ```
   Windows Firewall may block local ports:
   - Open Windows Defender Firewall
   - Click "Allow an app through firewall"
   - Ensure Docker Desktop is allowed
   - Close firewall settings
   - Try curl again
   ```

---

### Problem: Observation Endpoint Returns Empty/Invalid Response

**Symptoms**:
- `curl http://localhost:8000/observation` returns error or empty
- Response is not valid JSON
- Missing `state.world` in response

**Diagnosis**:
```bash
# Get verbose output
curl -v http://localhost:8000/observation

# Check response headers
# Should show: Content-Type: application/json

# Check response body
curl http://localhost:8000/observation | jq .
# Should show structured JSON with game state
```

**Solutions**:

1. **Game not initialized yet**:
   ```bash
   # Wait longer (game startup can take 20-30 seconds)
   timeout /t 30
   curl http://localhost:8000/observation
   ```

2. **Container logs show errors**:
   ```bash
   # Check detailed logs
   docker logs openra-rl-dev
   # Look for initialization errors or warnings
   ```

3. **Port mapping incorrect**:
   ```bash
   # Verify port mapping
   docker port openra-rl-dev 8000
   # Should show: 127.0.0.1:8000
   
   # Try with explicit IP
   curl http://127.0.0.1:8000/observation
   ```

---

## Environment Variables

No environment variables are required for basic operation. All defaults work out of the box.

### Optional Configuration

If needed, these can be set before running the container:

```bash
# Optional: Set log level
docker run \
  -p 8000:8000 \
  -p 9999:9999 \
  -e LOG_LEVEL=DEBUG \
  openra-rl:latest

# Optional: Set custom map
docker run \
  -p 8000:8000 \
  -p 9999:9999 \
  -e OPENRA_MAP="Tsaritsyn" \
  openra-rl:latest
```

### AI Commander Configuration

In your TypeScript code, you can configure OpenRA-RL connection:

```typescript
import { createOpenRARLBridge } from "./packages/openra-adapter/src/index.js";

const bridge = await createOpenRARLBridge({
  baseUrl: "http://localhost:8000",  // Default
  timeout: 5000,                      // Default: 5 seconds
  retries: 2,                         // Default: 2 per-request
  verbose: true,                      // Optional: detailed logging
  maxRetries: 3                       // Default: 3 per-connection
});
```

---

## Startup Sequence

Here's the exact sequence for a clean start:

### Terminal 1: Docker and OpenRA-RL
```bash
# Step 1: Start Docker if not running
# (Use GUI or PowerShell method above)

# Step 2: Pull image (first time only)
docker pull openra-rl:latest

# Step 3: Start container
docker run -p 8000:8000 -p 9999:9999 --name openra-rl-dev openra-rl:latest

# Expected output:
# OpenRA-RL Server running on http://0.0.0.0:8000
# (Keep this terminal open!)
```

### Terminal 2: Verification and Project
```bash
# Step 4: Wait 15-20 seconds for game to initialize
timeout /t 20

# Step 5: Verify service is running
curl http://localhost:8000/status

# Step 6: Navigate to project
cd C:\Users\boter\ai-commander

# Step 7: Install dependencies (if needed)
pnpm install

# Step 8: Run validation test
pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts

# Expected: ✓ Integration Test Complete
```

---

## Validation Commands

### Quick Health Check
```bash
# Single command to verify everything is ready
curl -s http://localhost:8000/status | jq .
```

**Expected Response**:
```json
{
  "status": "ready",
  "timestamp": 1720310400
}
```

### Full Integration Test
```bash
# From project root
pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts
```

**Expected Output**:
```
🎮 Real OpenRA Integration Test
═════════════════════════════════════════════════════

Step 1: Connecting to OpenRA-RL Service
✓ Connected (errors: 0)

Step 2: Observing Live Game State
✓ Observation successful
  Tick: 100
  Units: 5
  Buildings: 2
  Players: 2

... (more steps)

✓ Integration Test Complete
```

### Mock Tests (No Docker Required)
```bash
# Test integration code logic without services
pnpm --filter openra-adapter exec ts-node examples/mock-integration-test.ts

# Expected: ✅ 10/10 tests passing
```

---

## Summary

This guide provides everything needed to set up a reproducible real OpenRA validation environment:

✅ **Step-by-step setup procedure**  
✅ **Verification checklist**  
✅ **Comprehensive troubleshooting**  
✅ **Common errors and solutions**  
✅ **Network and port requirements**  
✅ **Container startup sequence**  
✅ **Validation commands**  

**Time to complete**: ~10 minutes (first time includes Docker startup and image pull, ~5 minutes subsequent times)

**Success criteria**: All items in verification checklist are checked.

---

## Next Steps

Once this setup is complete and verified:

1. ✅ Story 7.0: Environment Bring-up (COMPLETE)
2. → Story 7.1: Validate OpenRA-RL Connectivity
3. → Story 7.2: Validate Live Observation
4. → Story 7.3: Validate Command Execution
5. → Continue through EPICs 7-11

---

**Last Updated**: 2026-07-06  
**Status**: Complete environment documentation  
**Owner**: Development team
