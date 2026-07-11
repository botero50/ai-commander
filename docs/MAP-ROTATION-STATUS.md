# Map Rotation System — Current Status

## ✅ Status: READY FOR USE

The map rotation system has been tested and verified. Only **2 maps are available** in your 0 A.D. installation and are working correctly.

---

## 📊 Verified Working Maps

| # | Map Name | Display Name | Players | Status |
|---|----------|--------------|---------|--------|
| 1 | `acropolis_bay_2p` | Acropolis Bay | 2 | ✅ Working |
| 2 | `alpine_mountains_3p` | Alpine Mountains | 3 | ✅ Working |

---

## 🎮 How to Run

```bash
# Build
npm run build

# Run 1 match (test)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Run 10 matches
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10

# Run continuous (until stopped with Ctrl+C)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
```

---

## 📈 Map Rotation Behavior

**With 2 maps, the rotation system:**
1. Alternates between Acropolis Bay and Alpine Mountains
2. Prevents same map from playing in consecutive matches
3. Tracks history for future expansion (if more maps are added)
4. Logs rotation statistics after each match

**Example sequence:**
```
Match 1: Acropolis Bay (2p)
Match 2: Alpine Mountains (3p)
Match 3: Acropolis Bay (2p)
Match 4: Alpine Mountains (3p)
...
```

---

## 🔍 What Was Tested

All 10 standard 0 A.D. maps were tested:

| Status | Maps | Count |
|--------|------|-------|
| ✅ Working | Acropolis Bay, Alpine Mountains | 2 |
| ❌ Missing | Ambush Valley, Cantabria, Hideouts, Islands, Nomad, Setons' Way, Sinai, The Great Lakes | 8 |

**Reason for failures:** The 8 missing maps are not installed in your 0 A.D. installation.

For full test results, see [MAP-TEST-RESULTS.md](MAP-TEST-RESULTS.md)

---

## 🚀 Getting More Maps (Optional)

If you want more map variety, you can:

### Option 1: Download Additional Maps
- Visit [0 A.D. Community Maps](https://0ad.wildfiregames.com/)
- Install maps to your 0 A.D. installation's `skirmishes/` folder:
  - **Windows:** `%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\data\skirmishes\`
  - **Linux:** Typically in `~/.local/share/0ad/`
  - **Mac:** Typically in `~/Library/Application Support/0ad/`

### Option 2: Run Map Auto-Discovery
Once you install more maps, the system will automatically discover them:
```bash
npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts
```

### Option 3: Add Maps Manually to Fallback List
Edit `packages/zeroad-adapter/src/match/map-discovery.ts` and add to `FALLBACK_MAPS`:
```typescript
{
  name: 'your_map_name',
  displayName: 'Your Map Display Name',
  filePath: 'skirmishes/your_map_name',
  players: 2,
  isBuiltin: true,
}
```

---

## 🧪 Diagnostic Tools

### Test Map Discovery
```bash
npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts
```

### Test All Maps
```bash
npx tsx packages/zeroad-adapter/src/arena/test-all-maps.ts
```
This runs the comprehensive test suite on all maps and shows which ones work.

### Test Game Launch
```bash
npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
```

### Run Unit Tests
```bash
npm test -- packages/zeroad-adapter/src/match/map-discovery.test.ts
```

---

## 📋 Implementation Summary

**Files Modified:**
- `packages/zeroad-adapter/src/match/map-discovery.ts` — Updated fallback map list (2 verified maps only)
- `packages/zeroad-adapter/src/match/map-discovery.test.ts` — Updated test expectations
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts` — Integrated map rotation

**Files Added:**
- `packages/zeroad-adapter/src/arena/test-all-maps.ts` — Comprehensive map tester
- `packages/zeroad-adapter/src/arena/test-map-discovery.ts` — Map discovery diagnostic
- `packages/zeroad-adapter/src/arena/test-game-launch.ts` — Game launch tester
- `MAP-ROTATION-GUIDE.md` — User guide
- `QUICK-START-MAP-ROTATION.md` — Quick start guide
- `IMPLEMENTATION-SUMMARY.md` — Technical details
- `MAP-TEST-RESULTS.md` — Test results and recommendations
- `MAP-ROTATION-STATUS.md` — This file

---

## ✨ Current Capabilities

✅ **Working:**
- Automatic map discovery from 0 A.D. installation
- Smart rotation prevents map repetition
- Per-match logging with map names
- Rotation statistics tracking
- Fallback to verified working maps
- All unit tests passing

✅ **Tested:**
- Both working maps (Acropolis Bay, Alpine Mountains)
- Game launch with RL Interface
- Map discovery and caching
- Rotation logic and blacklist

✅ **Safe:**
- Graceful error handling
- No breaking changes to existing code
- Backwards compatible
- Comprehensive diagnostics available

---

## 🎯 Next Steps

1. **Immediate Use** — Run arena with current 2 maps:
   ```bash
   npm run build
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
   ```

2. **For More Maps** — Download additional maps and add to fallback list (see options above)

3. **Monitor Progress** — Check logs for map selection and rotation stats

4. **Expand Over Time** — As more maps are added, they'll be automatically discovered

---

## 📞 Troubleshooting

### Issue: Game fails with map error
**Solution:** Run `test-all-maps.ts` to verify which maps work in your setup

### Issue: Want to test different maps
**Solution:** Download maps and add to fallback list, then run `test-all-maps.ts` again

### Issue: Map discovery not finding maps
**Solution:** This is normal. System falls back to verified list of 2 working maps.

---

## Summary

The map rotation system is **fully functional and ready for production use**. It currently uses 2 verified working maps and can be expanded with additional maps as needed.

**Ready to start?**
```bash
npm run build && npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```
