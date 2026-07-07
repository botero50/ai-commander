# Platform-Specific Guide: Windows, Mac, and Linux

Complete instructions for each platform.

---

## Prerequisites (All Platforms)

- **Docker Desktop** installed and running
  - Windows: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
  - Mac: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
  - Linux: [Docker Engine](https://docs.docker.com/engine/install/)

- **Node.js 22+** installed
  - Download from [nodejs.org](https://nodejs.org/)

- **API Keys** (optional, for non-free models)
  - Claude: [console.anthropic.com](https://console.anthropic.com/)
  - GPT-4: [platform.openai.com](https://platform.openai.com/)
  - Google Gemini: [ai.google.dev](https://ai.google.dev/)

---

## Windows

### Setup (First Time Only)

**Option 1: Using PowerShell (Recommended)**

```powershell
# Navigate to docker-images directory
cd .\docker-images

# Run setup script with bash
bash load-and-run.sh
```

This will:
1. Load the Docker image (501 MB)
2. Create a Docker volume for game content
3. Download game assets (~500 MB)
4. Verify everything is ready

**Expected output:**
```
✓ Image loaded
✓ Volume created
✓ Game content ready
```

**Option 2: Using Git Bash (If PowerShell doesn't work)**

```bash
cd ./docker-images
bash load-and-run.sh
```

**Option 3: Manual commands (Complete control)**

```powershell
# Open PowerShell in ./docker-images directory

# Load the image
docker load < openra-rl-latest.tar.gz

# Create volume
docker volume create openra-content

# Download and setup game content
docker run --rm -v openra-content:/root/.config/openra/Content `
  openra-rl:latest bash -c "mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc} && cd /tmp && curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip && unzip -q ra.zip && cp *.mix /root/.config/openra/Content/ra/v2/ && cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true && cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true"
```

### Running the Server

**Every time you want to play:**

```powershell
cd .\docker-images
bash run.sh
```

Or manually:
```powershell
docker run -p 9999:9999 `
  -v openra-content:/root/.config/openra/Content `
  openra-rl:latest
```

### Running Tournaments

**In another PowerShell window:**

```powershell
# Build the project (first time)
npm run build

# Run a tournament
node .\packages\cli\dist\cli.js tournament `
  --brain-a claude `
  --brain-b gpt4 `
  --games 3
```

### Environment Variables (API Keys)

Create a `.env` file in the project root:

```powershell
# Create .env file
@"
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-gemini-key
"@ | Out-File -Encoding UTF8 .env

# Verify it was created
type .env
```

Or set in PowerShell (temporary, this session only):

```powershell
$env:OPENAI_API_KEY = "sk-your-key"
$env:ANTHROPIC_API_KEY = "sk-ant-your-key"
```

---

## Mac

### Setup (First Time Only)

**Using Terminal (zsh or bash)**

```bash
cd ./docker-images
bash load-and-run.sh
```

This will:
1. Load the Docker image (501 MB)
2. Create a Docker volume for game content
3. Download game assets (~500 MB)
4. Verify everything is ready

**Manual commands (if script fails):**

```bash
cd ./docker-images

# Load image
docker load < openra-rl-latest.tar.gz

# Create volume
docker volume create openra-content

# Download and setup game content
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c "
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}
    cd /tmp
    curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip
    unzip -q ra.zip
    cp *.mix /root/.config/openra/Content/ra/v2/
    cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true
    cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true
  "
```

### Running the Server

**Every time you want to play:**

```bash
cd ./docker-images
bash run.sh
```

Or manually:
```bash
docker run -p 9999:9999 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest
```

### Running Tournaments

**In another Terminal window:**

```bash
# Build the project (first time)
npm run build

# Run a tournament
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3
```

### Environment Variables (API Keys)

**Option 1: Using .env file**

```bash
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-gemini-key
EOF
```

**Option 2: Set in Terminal (temporary)**

```bash
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export GOOGLE_API_KEY="your-gemini-key"

# Then run tournament
npm run build
node ./packages/cli/dist/cli.js tournament --brain-a claude --brain-b gpt4 --games 3
```

**Option 3: Permanent (add to ~/.zshrc or ~/.bash_profile)**

```bash
# Edit your shell config
nano ~/.zshrc  # or ~/.bash_profile for bash

# Add these lines at the end:
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export GOOGLE_API_KEY="your-gemini-key"

# Save and reload
source ~/.zshrc  # or source ~/.bash_profile
```

### Mac-Specific Notes

- **M1/M2/M3 Macs (ARM)**: Docker Desktop handles this automatically
- **Intel Macs**: Should work with standard x86_64 image
- **Performance**: Game rendering uses software OpenGL (Xvfb), so expect ~3-5 min per game

---

## Linux

### Setup (First Time Only)

**Using bash or zsh**

```bash
cd ./docker-images
bash load-and-run.sh
```

This will:
1. Load the Docker image (501 MB)
2. Create a Docker volume for game content
3. Download game assets (~500 MB)
4. Verify everything is ready

**Manual commands:**

```bash
cd ./docker-images

# Load image
docker load < openra-rl-latest.tar.gz

# Create volume
docker volume create openra-content

# Download and setup game content
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c "
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}
    cd /tmp
    curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip
    unzip -q ra.zip
    cp *.mix /root/.config/openra/Content/ra/v2/
    cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true
    cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true
  "
```

### Running the Server

**Every time you want to play:**

```bash
cd ./docker-images
bash run.sh
```

Or manually:
```bash
docker run -p 9999:9999 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest
```

### Running Tournaments

**In another Terminal:**

```bash
# Build the project (first time)
npm run build

# Run a tournament
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3
```

### Environment Variables (API Keys)

**Option 1: Using .env file**

```bash
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-gemini-key
EOF
```

**Option 2: Set in Terminal (temporary)**

```bash
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export GOOGLE_API_KEY="your-gemini-key"

npm run build
node ./packages/cli/dist/cli.js tournament --brain-a claude --brain-b gpt4 --games 3
```

**Option 3: Permanent (add to ~/.bashrc or ~/.zshrc)**

```bash
# Edit your shell config
nano ~/.bashrc  # or ~/.zshrc

# Add these lines:
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export GOOGLE_API_KEY="your-gemini-key"

# Reload
source ~/.bashrc  # or source ~/.zshrc
```

### Linux-Specific Notes

- **Docker**: May need `sudo` for some commands. See [Docker docs](https://docs.docker.com/engine/install/linux-postinstall/)
- **No GUI**: Use headless rendering (Xvfb) - games run without display
- **Fastest**: Linux typically has the best Docker performance

---

## Troubleshooting by Platform

### Windows Issues

**"bash: command not found"**
- Use PowerShell instead of cmd.exe
- Or install Git Bash from [git-scm.com](https://git-scm.com/)

**"docker: command not found"**
- Restart PowerShell/cmd after installing Docker Desktop
- Make sure Docker Desktop is running (check system tray)

**Port 9999 already in use**
```powershell
# Use different port
docker run -p 9998:9999 -v openra-content:/root/.config/openra/Content openra-rl:latest

# Then connect to localhost:9998
```

### Mac Issues

**"Permission denied" when running bash scripts**
```bash
chmod +x ./docker-images/*.sh
bash ./docker-images/load-and-run.sh
```

**M1/M2 compatibility issues**
- Docker Desktop handles ARM automatically
- If issues persist: `docker buildx build --platform linux/amd64`

**Slow performance on Mac**
- Docker runs in a VM, so it's slower than native
- Use smaller games: `--max-ticks 300`

### Linux Issues

**"Permission denied" for docker commands**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Then retry
docker run -p 9999:9999 openra-rl:latest
```

**Volume permission issues**
```bash
# Make sure user owns the volume
docker volume inspect openra-content

# If issues, recreate:
docker volume rm openra-content
docker volume create openra-content
```

---

## Quick Reference Table

| Task | Windows | Mac | Linux |
|------|---------|-----|-------|
| Setup (first time) | `bash load-and-run.sh` | `bash load-and-run.sh` | `bash load-and-run.sh` |
| Start server | `bash run.sh` | `bash run.sh` | `bash run.sh` |
| Set API key | `.env` file or `$env:VAR` | `export VAR=...` | `export VAR=...` |
| Run tournament | `node .\packages\cli...` | `node ./packages/cli...` | `node ./packages/cli...` |
| Need sudo? | No | No | Maybe (docker) |

---

## Platform-Specific Recommendations

### Windows
- Use **PowerShell** (not cmd.exe)
- Docker Desktop must be running
- Backticks (`) for line continuation
- Use `.env` for API keys (easier than `$env`)

### Mac
- Use **Terminal** (zsh by default)
- Docker Desktop must be running
- Add API keys to `~/.zshrc` for persistence
- Performance is adequate but slower than native

### Linux
- Most **performant** option
- May need `sudo` initially
- Add user to docker group for convenience
- Perfect for production deployments

---

## Getting Help

If you're stuck:

1. Check the main guides: QUICK_START_TOURNAMENT.md, GETTING_STARTED.md
2. See troubleshooting section in RUN_TOURNAMENTS_SUMMARY.md
3. Verify Docker is running: `docker ps`
4. Check API keys are set: `echo $OPENAI_API_KEY`
5. Try manual commands instead of scripts

---

**Ready? Pick your platform above and follow the Setup section.**
