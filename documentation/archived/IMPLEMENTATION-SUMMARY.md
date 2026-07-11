# Map Rotation Implementation — Summary

## ✅ What Was Implemented

### 1. **MapDiscovery Service** (`map-discovery.ts`)
- Scans 0 A.D. installation for available maps in `skirmishes/` and `random_maps/`
- Supports 10 built-in fallback maps if auto-discovery fails
- Extracts metadata: name, player count, display name
- Methods:
  - `discoverMaps()` — Find all maps (with caching)
  - `getRandomMapAvoidingBlacklist()` — Select map avoiding recently used
  - `getMapsForPlayerCount()` — Filter by player count
  - `exportMaps()` — JSON export for debugging
- **Tests:** 12 unit tests, all passing ✅

### 2. **Arena Loop Integration** (`run-arena-loop.ts`)
- Initializes `MapDiscovery` and `MatchRotation` at startup
- **Before each match:** Selects a random map, avoiding last 3 used maps
- **After each match:** Records map + AI pair in rotation history
- **Logging:** Shows which map was selected, with display name
- **Statistics:** Tracks unique maps played and total matches

### 3. **Diagnostic Tools**
- `test-map-discovery.ts` — Verify map discovery works
- `test-game-launch.ts` — Test game launch with different map formats
- Both included for debugging map issues

## 🎯 How It Works

```
Startup
  ↓
Initialize MapDiscovery
  ├─ Scan for maps in 0 A.D. installation
  └─ Fall back to 10 hardcoded maps if not found
  ↓
Initialize MatchRotation (tracks history)
  ↓
For each match:
  1. Get blacklist from rotation (last 3 maps)
  2. Select random map avoiding blacklist
  3. Launch game: `-autostart=skirmishes/[mapname]`
  4. Run match until completion
  5. Record: map name + AI pair
  6. Log rotation stats (unique maps, total matches)
  ↓
Loop to next match or exit
```

## 📊 Map Selection Algorithm

```typescript
// Get blacklist of recently used maps
const blacklist = matchRotation.getMapBlacklist(); // Set<string>

// Select map avoiding blacklist
const mapInfo = await mapDiscovery.getRandomMapAvoidingBlacklist(
  blacklist,
  2  // Only 2-player maps
);

// Use selected map
const selectedMap = mapInfo.filePath; // "skirmishes/acropolis_bay_2p"
```

**Result:** Maps rotate fairly, preventing fatigue from same map repeatedly.

## 🚀 Running the Arena

### Quick Test (1 Match)
```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

### Multiple Matches
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 100
```

### Infinite (Until Stopped)
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
# Press Ctrl+C to stop
```

## 📋 Fallback Maps (If Discovery Fails)

All 2-player maps from 0 A.D.:
1. Acropolis Bay
2. Ambush Valley
3. Cantabria
4. Hideouts
5. Islands
6. Nomad
7. Setons' Way
8. Sinai
9. The Great Lakes

Plus 1 three-player map:
10. Alpine Mountains

## 🔧 Configuration

Edit `run-arena-loop.ts` to adjust rotation settings:

```typescript
const matchRotation = new MatchRotation(
  {
    mapBlacklistSize: 3,      // ← Increase to prevent recent map repeats
    civBlacklistSize: 2,      // ← Increase to prevent civ pair repeats
    maxHistorySize: 144,      // ← Increase to track more history
  },
  logger
);
```

## 🧪 Verification

### 1. Run Diagnostic
```bash
npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts
```
Should show: `✅ Discovered 10 maps` (or more if auto-discovery works)

### 2. Test Game Launch
```bash
npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
```
Should show: `✅ SUCCESS! Game started and RL Interface responding`

### 3. Run Arena Loop
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```
Should complete one full match with map rotation.

## 📁 Files Changed/Added

**New Files:**
- `packages/zeroad-adapter/src/match/map-discovery.ts` — Map discovery service
- `packages/zeroad-adapter/src/match/map-discovery.test.ts` — 12 unit tests
- `packages/zeroad-adapter/src/arena/test-map-discovery.ts` — Diagnostic tool
- `packages/zeroad-adapter/src/arena/test-game-launch.ts` — Game launch test
- `MAP-ROTATION-GUIDE.md` — User guide
- `IMPLEMENTATION-SUMMARY.md` — This file

**Modified Files:**
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts` — Integrated map discovery + rotation

## ✨ Features

- ✅ Automatic map discovery from 0 A.D. installation
- ✅ Fallback to hardcoded list if discovery fails
- ✅ Smart rotation prevents map repetition
- ✅ Per-match logging of selected map
- ✅ Rotation statistics tracking
- ✅ Graceful error handling
- ✅ Comprehensive unit tests
- ✅ Diagnostic tools for debugging
- ✅ No breaking changes to existing code

## 🔄 Next Steps

1. **Run diagnostics to verify setup:**
   ```bash
   npm run build
   npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts
   npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
   ```

2. **Run arena loop with map rotation:**
   ```bash
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
   ```

3. **Monitor logs** for:
   - ✓ Map discovery success or fallback
   - ✓ Map selection per match
   - ✓ Rotation statistics

4. **Check map variety** across matches to confirm rotation is working

## 📝 Notes

- **Performance:** Map discovery happens once at startup and is cached
- **Fallback Safety:** System gracefully handles missing map directories
- **Backwards Compatible:** No changes to existing match flow
- **Platform:** Currently Windows-focused (uses Windows paths for 0 A.D. installation)
- **Tested:** All 12 unit tests passing, game launch verified with `test-game-launch.ts`

---

For detailed documentation, see `MAP-ROTATION-GUIDE.md`
