# OpenRA Tournament Troubleshooting Flowchart

## Quick Diagnosis

### Step 1: Is the game server running?

```bash
curl http://localhost:8000/health
```

**Expected response:** `{"status":"healthy"}`

#### If you get "Connection refused" or no response:
→ **Start the game server:**
```bash
cd docker-images && bash run.sh &
```

#### If you get a response:
→ Go to **Step 2**

---

### Step 2: Can the game server reset?

```bash
curl -X POST http://localhost:8000/reset \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 10
```

**Expected response:** JSON with game state, something like:
```json
{
  "tick": 0,
  "observation": {
    "units": [],
    "buildings": [],
    ...
  }
}
```

#### If you get "timeout" or "no response":
→ **Game content is missing**
- Skip to **SOLUTION: Install Game Content** below

#### If you get "500 error" or "Internal Server Error":
→ **Game content is missing**
- Skip to **SOLUTION: Install Game Content** below

#### If you get valid JSON response:
→ **Your setup is working!** Run tournaments:
```bash
npx ts-node ollama-tournament.ts
npx ts-node chatgpt-tournament.ts
```

---

## SOLUTION: Install Game Content

### Do you have OpenRA already installed on your computer?

#### YES - I have OpenRA installed
→ **Use the Easy Method:**

1. Open OpenRA and verify Red Alert content downloaded
   - If not, run Red Alert mod → accept download when prompted

2. Find your OpenRA content folder:
   - **Windows:** `%APPDATA%\OpenRA\Content`
   - **Mac:** `~/Library/Application Support/OpenRA/Content`
   - **Linux:** `~/.config/openra/Content`

3. Copy Red Alert content to Docker:

   **Windows (PowerShell):**
   ```powershell
   $appData = [Environment]::GetFolderPath("ApplicationData")
   $contentPath = "$appData\OpenRA\Content"
   docker cp "$contentPath\ra\v2\." openra-content:/root/.config/openra/Content/ra/v2/
   ```

   **Mac/Linux:**
   ```bash
   docker volume create openra-content
   docker run --rm -v ~/.config/openra/Content:/src -v openra-content:/dst \
     alpine cp -r /src/ra/v2/* /dst/ra/v2/
   ```

4. Verify the copy worked:
   ```bash
   docker run --rm -v openra-content:/data alpine ls /data/ra/v2/ | grep mix
   ```
   
   Should list `.mix` files

5. Go back to **Step 2** above to verify

#### NO - I don't have OpenRA installed
→ **Choose one of these options:**

**Option A: Download OpenRA (Easiest, ~60MB)**
1. Go to https://www.openra.net/download/
2. Download for your OS
3. Install and run
4. Select Red Alert mod
5. Accept the content download when prompted
6. Then follow the "YES - I have OpenRA" steps above

**Option B: Manual Setup (Advanced)**
→ See `docker-images/GAME_CONTENT_SETUP.md` for detailed instructions
   - Requires finding original game files or obtaining them from EA Games freeware sources
   - More technical but doesn't require installing OpenRA

---

## Common Error Messages & Fixes

### "Reset timeout" or "Could not reset game"

**Cause:** Game content missing

**Fix:** Follow **"SOLUTION: Install Game Content"** above

### "Cannot connect to OpenRA server"

**Cause:** Game server not running

**Fix:** 
```bash
cd docker-images && bash run.sh &
```

### "OpenRA gRPC bridge failed to start"

**Cause:** Game content missing

**Fix:** Follow **"SOLUTION: Install Game Content"** above

### "Connection refused" when hitting localhost:8000

**Cause:** Game server not running

**Fix:** 
```bash
cd docker-images && bash run.sh &
```

### Ollama: "Cannot connect to Ollama on localhost:11434"

**Cause:** Ollama not running

**Fix:**
```bash
ollama serve
# In another terminal:
ollama pull mistral
```

### ChatGPT: "OPENAI_API_KEY not set"

**Cause:** API key not provided

**Fix:**
```bash
export OPENAI_API_KEY=sk-your-key-here
npx ts-node chatgpt-tournament.ts
```

---

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] Game server running: `curl http://localhost:8000/health` ✓
- [ ] Game can reset: `curl -X POST http://localhost:8000/reset -H "Content-Type: application/json" -d '{}'` ✓
- [ ] Game content exists: `docker run --rm -v openra-content:/data alpine ls /data/ra/v2/ | grep mix` ✓
- [ ] Ollama running (if using Ollama): `ollama serve` ✓
- [ ] Ollama model downloaded: `ollama list | grep mistral` ✓
- [ ] OpenAI API key set (if using ChatGPT): `echo $OPENAI_API_KEY` ✓

Once all items are checked, run:
```bash
npx ts-node ollama-tournament.ts
```

---

## Still Having Issues?

### Read these docs in order:

1. **TOURNAMENT_SETUP.md** - Main setup guide
2. **GAME_CONTENT_SETUP.md** - Detailed content installation
3. **GAME_CONTENT_FIX_SUMMARY.md** - Summary of what was fixed

### Check Docker logs:

```bash
# See game server logs
docker logs $(docker ps -q -f ancestor=openra-rl:latest)

# If server not running, check recent containers
docker logs $(docker ps -a -q -f ancestor=openra-rl:latest | head -1)
```

### Manual game content verification:

```bash
# List what's in the Docker volume
docker run --rm -v openra-content:/data alpine find /data -name "*.mix" -type f

# See all files in ra/v2
docker run --rm -v openra-content:/data alpine ls -lh /data/ra/v2/
```

### Clean start (nuclear option):

```bash
# Stop and remove all containers
docker kill $(docker ps -q) 2>/dev/null || true

# Remove old volumes
docker volume rm openra-content 2>/dev/null || true

# Start fresh
cd docker-images && bash run.sh &
# Then reinstall game content
```

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│  Your Tournament Script              │
│  (ollama-tournament.ts)              │
└──────────┬──────────────────────────┘
           │
           ├─ Calls http://localhost:8000/reset
           ├─ Calls http://localhost:8000/step
           └─ Calls http://localhost:11434/api/generate (for Ollama)
           
           │
           ▼
┌──────────────────────────────────────┐
│  OpenRA-RL Docker Container          │
│  (Port 8000)                         │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ HTTP Server                    │  │
│  │ /health, /reset, /step         │  │
│  └───────┬────────────────────────┘  │
│          │                            │
│          ▼                            │
│  ┌────────────────────────────────┐  │
│  │ OpenRA Game Engine             │  │
│  │ (Xvfb + OpenRA binary)         │  │
│  └───────┬────────────────────────┘  │
│          │                            │
│          ▼                            │
│  ┌────────────────────────────────┐  │
│  │ Game Content (from volume)     │  │
│  │ ra/v2/*.mix files              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Docker Volume: openra-content       │
│  Location: /var/lib/docker/volumes/  │
│  Contents: ra/v2/{*.mix, cnc/, ...}  │
└──────────────────────────────────────┘
```

---

## Getting Help

- **OpenRA Documentation:** https://www.openra.net/
- **Game Content Info:** https://github.com/OpenRA/OpenRA/wiki/Game-Content
- **This Repository Issues:** Check if others have had similar problems
