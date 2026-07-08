# OpenRA Tournament Setup & Troubleshooting

This guide helps you set up and run AI tournaments with the OpenRA game server.

## Quick Start

### 1. Start the Game Server

```bash
cd docker-images
bash run.sh
```

This starts the OpenRA-RL Docker container on port 8000.

### 2. Initialize Game Content (First Time Only)

The game server needs Red Alert game content files to function. Run this once:

```bash
cd docker-images
bash setup-content.sh
```

This attempts to download and install the required game content automatically.

### 3. Start Ollama (If Using Ollama Tournament)

In another terminal:

```bash
ollama serve
ollama pull mistral  # or your preferred model
```

### 4. Run a Tournament

In another terminal:

```bash
# Ollama tournament (completely free, runs locally)
npx ts-node ollama-tournament.ts

# ChatGPT tournament (requires OPENAI_API_KEY)
export OPENAI_API_KEY=your-key-here
npx ts-node chatgpt-tournament.ts
```

## Troubleshooting

### ❌ "Reset failed with status 500" or "Reset timeout"

**Problem:** The game server can't initialize games.

**Cause:** Game content files are missing. The OpenRA-RL server needs Red Alert .mix files.

**Solution:**

```bash
cd docker-images
bash setup-content.sh
```

If the automatic setup fails, see **Manual Setup** below.

### ❌ "Cannot connect to OpenRA server on localhost:8000"

**Problem:** The game server isn't running.

**Solution:**

```bash
cd docker-images
bash run.sh
```

Make sure the container is running:

```bash
docker ps | grep openra-rl
```

### ❌ "OpenRA gRPC bridge failed to start"

**Problem:** The OpenRA game engine inside the container can't start.

**Cause:** Game content files are missing or corrupted.

**Solution:** Follow the game content setup steps above.

### ❌ Setup script fails to download content

**Problem:** The `setup-content.sh` script can't download from openra.baxxster.no.

**Causes:**
- Network connectivity issue
- Source server temporarily unavailable
- Network restrictions inside Docker container

**Solution:** See **Manual Setup** below.

## Manual Game Content Setup

**⚠️ Important:** Automatic download from openra.baxxster.no may not work due to server issues.

If you need to manually install game content, see the detailed guide: **[GAME_CONTENT_SETUP.md](docker-images/GAME_CONTENT_SETUP.md)**

Below are quick instructions, but the full guide has more options and troubleshooting.

### Option A: From the OpenRA Launcher (Recommended)

1. **Install OpenRA** from https://www.openra.net/download/

2. **Launch OpenRA** and select the **Red Alert** mod

3. **When prompted**, download the game content (the launcher will fetch it)

4. **Locate the content files:**
   - **Windows:** `%APPDATA%\OpenRA\Content\ra\v2\`
   - **macOS:** `~/Library/Application Support/OpenRA/Content/ra/v2/`
   - **Linux:** `~/.config/openra/Content/ra/v2/`

5. **Copy the files to Docker:**
   
   Linux/macOS:
   ```bash
   docker volume create openra-content
   docker run --rm -v openra-content:/data -v /path/to/openra/content/ra/v2:/src \
     alpine cp -r /src/* /data/ra/v2/
   ```
   
   Windows (PowerShell):
   ```powershell
   $localPath = "$env:APPDATA\OpenRA\Content\ra\v2"
   docker cp "$localPath\." openra-content:/root/.config/openra/Content/ra/v2/
   ```

### Option B: From Original Game CDs or Freeware

You need these .mix files in the container's `/root/.config/openra/Content/ra/v2/`:

**Base files (required):**
- `allies.mix`
- `russian.mix`
- `hires.mix`
- `lores.mix`
- `interior.mix`
- `local.mix`
- `conquer.mix`
- `scores.mix`
- `snow.mix`
- `sounds.mix`
- `speech.mix`
- `temperat.mix`

**CNC folder:** `cnc/desert.mix`

**Expand folder:** (expansion content if available)

### Option C: Pre-built Content Archive

If you have a pre-packaged OpenRA content archive:

```bash
# Extract to a local directory
unzip ra-content.zip -d ./ra-content

# Copy into Docker volume
docker run --rm -v openra-content:/data -v $(pwd)/ra-content:/src \
  alpine cp -r /src/ra/v2/* /data/ra/v2/
```

## Verify Setup

After setting up content, verify it's available:

```bash
docker exec $(docker ps -q -f ancestor=openra-rl:latest) \
  bash -c "ls -lh /root/.config/openra/Content/ra/v2/ | grep mix"
```

You should see output like:

```
-rw-r--r-- 1 root root 2.8M Jul  7 20:00 allies.mix
-rw-r--r-- 1 root root 2.5M Jul  7 20:00 russian.mix
...
```

## Environment Variables

### Ollama Tournament

- `MODEL`: Model to use (default: `mistral`)
  ```bash
  MODEL=llama2 npx ts-node ollama-tournament.ts
  ```

### ChatGPT Tournament

- `OPENAI_API_KEY`: Your OpenAI API key (required)
  ```bash
  export OPENAI_API_KEY=sk-...
  npx ts-node chatgpt-tournament.ts
  ```

## Advanced: Custom Game Server Port

If port 8000 is already in use:

```bash
# Start game server on a different port
docker run -p 9000:8000 -v openra-content:/root/.config/openra/Content \
  openra-rl:latest

# Update tournament script or set environment variable
GAME_API=http://localhost:9000 npx ts-node ollama-tournament.ts
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Tournament Runner                      │
│  (ollama-tournament.ts or               │
│   chatgpt-tournament.ts)                │
└────────────┬────────────────────────────┘
             │
    ┌────────┴─────────┐
    │                  │
    ▼                  ▼
┌──────────────┐  ┌──────────────┐
│ Ollama/GPT   │  │ OpenRA Server│
│ API          │  │ Docker       │
│ localhost:   │  │ localhost:   │
│ 11434 / API  │  │ 8000         │
└──────────────┘  └──────────────┘
                  │
                  ├─ Game Engine (Xvfb)
                  ├─ OpenRA-RL Service
                  └─ Game Content Volume
                     (openra-content)
```

## For More Help

- **OpenRA Official:** https://www.openra.net/
- **Game Content:** https://github.com/OpenRA/OpenRA/wiki/Game-Content
- **OpenRA-RL:** OpenRA Reinforcement Learning integration

Sources:
- [OpenRA Download](https://www.openra.net/download/)
- [Game Content Wiki](https://github.com/OpenRA/OpenRA/wiki/Game-Content)
- [Manual Installation Guide](https://gist.github.com/abcdefg30/a4fe1110c2727c3960e340ae2ce45bc0)
