# Voice Synthesis Troubleshooting Guide

## Current Status

✅ Piper TTS installed  
✅ Voice model downloaded (en_US-lessac-medium)  
✅ Voice synthesis working (manually tested)  
⚠️ Audio files should be created in `.data/audio/trash_talk/` during matches

---

## How Voice Synthesis Works

```
Match starts
    ↓
Trash talk generated (AI creates message)
    ↓
PiperTTSService.synthesize() called
    ↓
Request queued (no concurrent conflicts)
    ↓
Piper TTS spawns subprocess
    ↓
Audio file created: .data/audio/trash_talk/trash_talk_TIMESTAMP_RANDOM.wav
    ↓
HTTP server broadcasts audio path
```

---

## Verify Each Component

### 1. Piper TTS Command Works

**Windows (PowerShell):**
```powershell
echo "Test voice" | piper --model en_US-lessac-medium --data-dir "C:\Users\$env:USERNAME\.local\share\piper\voices" --output-file test.wav
```

**macOS/Linux:**
```bash
echo "Test voice" | piper --model en_US-lessac-medium --data-dir ~/.local/share/piper/voices --output-file test.wav
```

Expected: `test.wav` created (50-100 KB)

### 2. Voice Model Files Exist (In Project)

```bash
ls -lh packages/zeroad-adapter/voices/
```

Should show:
```
-rw-r--r--  en_US-lessac-medium.onnx (63 MB)
-rw-r--r--  en_US-lessac-medium.onnx.json (5 KB)
```

Or via Python:
```bash
python -c "
import os
voices_dir = 'packages/zeroad-adapter/voices'
files = os.listdir(voices_dir)
print(f'Found {len(files)} files:')
for f in files:
    size = os.path.getsize(os.path.join(voices_dir, f))
    print(f'  - {f}: {size:,} bytes')
"
```

### 3. Project Structure

```bash
# Voices stored in project
ls -lh packages/zeroad-adapter/voices/

# Audio output directory
mkdir -p .data/audio/trash_talk
ls -la .data/audio/trash_talk/
```

- Voices directory should contain the downloaded model files
- Audio output should be empty before running matches, then populated with `.wav` files

---

## Run Test Synthesis

Use the test script:

```bash
npx tsx test-piper-tts.ts
```

This will:
1. Initialize PiperTTSService
2. Synthesize 3 test phrases
3. Create audio files in `.data/audio/trash_talk/`
4. Show file paths

Expected output:
```
[PiperTest:INFO] Synthesizing trash talk { textLength: 22, voice: 'en_US-lessac-medium', ... }
[PiperTest:INFO] Synthesized trash talk: trash_talk_1234567_abc123.wav
✅ Success: /path/to/.data/audio/trash_talk/trash_talk_1234567_abc123.wav
```

---

## During Match Run

Watch for logs:

```
[ArenaLoop:INFO] Synthesizing trash talk...
[ArenaLoop:INFO] ✓ Synthesized trash talk: trash_talk_XXXX_XXXX.wav
```

Files should appear in `.data/audio/trash_talk/`:

```bash
ls -lh .data/audio/trash_talk/
```

Should show `.wav` files (50-100 KB each)

---

## Audio Playback

**Note:** Audio files are created and served via HTTP, but require playback client:

### Option 1: Direct File Playback
```bash
# Windows
start .data/audio/trash_talk/trash_talk_*.wav

# macOS
open .data/audio/trash_talk/trash_talk_*.wav

# Linux
vlc .data/audio/trash_talk/trash_talk_*.wav
```

### Option 2: Web Browser
When streaming is implemented, audio will be played automatically in the broadcast interface.

### Option 3: OBS Integration
Piper TTS will integrate with OBS via WebSocket (see SETUP-OBS-STREAMING.md).

---

## Common Issues

### "Unable to find voice" Error
**Cause:** Voice model file path not found by Piper  
**Solution:** Verify voice model exists (see step 2 above)  
**Check:** `ls ~/.local/share/piper/voices/`

### Audio Files Not Created
**Cause:** Synthesis failing silently (graceful fallback)  
**Solution:** Run test script to debug
**Check:** `npx tsx test-piper-tts.ts`

### Slow Synthesis on First Run
**Cause:** Voice model initialization taking time  
**Normal:** First synthesis ~1-2 seconds, subsequent calls ~50-100ms  
**Expected:** Only happens once per match

### "piper: command not found"
**Cause:** Piper not installed  
**Solution:** `pip install piper-tts`

---

## Expected File Sizes

| File | Size |
|------|------|
| en_US-lessac-medium.onnx | 63 MB |
| en_US-lessac-medium.onnx.json | 5 KB |
| Synthesized WAV (10 words) | 50-100 KB |

---

## Performance

| Operation | Time |
|-----------|------|
| Initialize Piper | ~100ms |
| Download voice model | 1-2 minutes (first time) |
| First synthesis | 1000-2000ms (model setup) |
| Subsequent synthesis | 50-200ms (per message) |

---

## Debugging

### Enable Debug Logging

Check logs for Piper TTS:

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1 2>&1 | grep -i "piper\|synthesiz"
```

### Check Audio File Created

After each trash talk message:

```bash
ls -lh .data/audio/trash_talk/ | tail -5
```

Should show newest `.wav` files

### Verify Queue Processing

Watch for queue info in logs:

```bash
npx tsx test-piper-tts.ts 2>&1 | grep -i "queue\|processing"
```

---

## Next Steps

1. **Run test script:** `npx tsx test-piper-tts.ts`
2. **Check audio files:** `ls -lh .data/audio/trash_talk/`
3. **Run match:** `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1`
4. **Verify synthesis:** `ls -lh .data/audio/trash_talk/` (should have new files)
5. **Play audio:** Use media player to test synthesized voice

---

## Success Criteria

✅ Test script creates audio files  
✅ Audio files appear in `.data/audio/trash_talk/` during matches  
✅ Files are valid WAV format (test with media player)  
✅ Audio quality is clear and understandable  
✅ No synthesis errors in logs  

---

## Getting Help

1. Run test script first: `npx tsx test-piper-tts.ts`
2. Check logs for "piper", "synth", "voice" keywords
3. Verify voice model files exist
4. Verify Piper command works manually
5. Check INSTALLATION.md Piper TTS section

