# Tournament Game Content Setup - README

## 🚀 Quick Start (5 minutes)

### If you already have OpenRA installed:

1. **Ensure Red Alert content is downloaded:**
   - Launch OpenRA → Select Red Alert → Accept download when prompted

2. **Copy content to Docker:**
   ```powershell
   # Windows PowerShell
   $appData = [Environment]::GetFolderPath("ApplicationData")
   docker cp "$appData\OpenRA\Content\ra\v2\." openra-content:/root/.config/openra/Content/ra/v2/
   ```
   
   ```bash
   # macOS/Linux
   docker volume create openra-content
   docker run --rm -v ~/.config/openra/Content:/src -v openra-content:/dst \
     alpine cp -r /src/ra/v2/* /dst/ra/v2/
   ```

3. **Verify the copy worked:**
   ```bash
   docker run --rm -v openra-content:/data alpine ls /data/ra/v2/ | grep mix
   ```

4. **Run a tournament:**
   ```bash
   # Terminal 1: Start game server
   cd docker-images && bash run.sh

   # Terminal 2: Start Ollama (if using Ollama tournament)
   ollama serve
   ollama pull mistral

   # Terminal 3: Run tournament
   npx ts-node ollama-tournament.ts
   ```

### If you don't have OpenRA:

1. **Download & install OpenRA:** https://www.openra.net/download/
2. **Follow steps 2-4 above**

OR for advanced manual setup:
- See `docker-images/GAME_CONTENT_SETUP.md` for 3 different methods

---

## 📋 Documentation

| Document | Purpose |
|----------|---------|
| **TOURNAMENT_SETUP.md** | Main setup guide with troubleshooting |
| **GAME_CONTENT_SETUP.md** | Detailed content installation methods |
| **TROUBLESHOOTING_FLOWCHART.md** | Interactive diagnostics & fixes |
| **GAME_CONTENT_FIX_SUMMARY.md** | Summary of the issue & solution |
| **This file** | Quick overview & starting point |

---

## ❌ Are you getting errors?

### "Reset timeout" or "gRPC bridge failed to start"
→ Game content is missing. Follow Quick Start steps above.

### "Cannot connect to localhost:8000"
→ Game server not running. In the docker-images directory:
```bash
bash run.sh
```

### "Cannot connect to Ollama"
→ Ollama not running:
```bash
ollama serve
ollama pull mistral
```

### Setup script fails to download
→ Use the OpenRA Launcher method instead (Quick Start steps 1-2 above)

---

## ✅ Verify Setup

Test that everything is working:

```bash
# Check game server
curl http://localhost:8000/health

# Should return: {"status":"healthy"}

# Test game reset
curl -X POST http://localhost:8000/reset \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 10

# Should return JSON game state (not an error)
```

---

## 🏗️ Architecture

```
Tournament Runner
    ↓
OpenRA-RL Docker Container (port 8000)
    ├── HTTP Server (/health, /reset, /step)
    ├── OpenRA Game Engine (Xvfb)
    └── Game Content (from Docker volume)
            ↓
    Docker Volume: openra-content
        └── ra/v2/ (*.mix files)
```

---

## 🔧 Key Commands

```bash
# Start game server
cd docker-images && bash run.sh

# Run Ollama tournament (free, local)
npx ts-node ollama-tournament.ts

# Run ChatGPT tournament (requires API key)
export OPENAI_API_KEY=sk-...
npx ts-node chatgpt-tournament.ts

# Check game server health
curl http://localhost:8000/health

# View game content files
docker run --rm -v openra-content:/data alpine ls -lh /data/ra/v2/

# View game server logs
docker logs $(docker ps -q -f ancestor=openra-rl:latest)
```

---

## 📚 More Information

- **OpenRA Official Site:** https://www.openra.net/
- **Game Content Documentation:** https://github.com/OpenRA/OpenRA/wiki/Game-Content
- **This Repository:** See TOURNAMENT_SETUP.md for full documentation

---

## 🎯 What Was Fixed

**Problem:** The tournament couldn't run because the game server was missing Red Alert content files.

**Root Cause:** 
- Automatic download sources are broken
- Docker container needs .mix files from Red Alert
- Without content, the OpenRA engine can't initialize

**Solution Provided:**
- ✅ Documentation on 3 ways to get game content
- ✅ Step-by-step copy instructions for all platforms
- ✅ Troubleshooting guides and error message clarification
- ✅ Verification commands to ensure setup is correct
- ✅ Enhanced tournament scripts with better error messages

---

## 🚦 Status

- **Game Server:** Ready (via Docker container)
- **Tournament Scripts:** Ready (with improved error messages)
- **Documentation:** Complete (4 guides + this file)
- **Game Content:** ⚠️ **YOU NEED TO INSTALL** (follow Quick Start above)

Once you install the game content, tournaments will work!

---

**Last Updated:** July 7, 2026  
**Status:** Fixed & Documented  
**Next Step:** Follow the Quick Start section above
