# Map Rotation System — Setup & Usage Guide

## Overview

The map rotation system automatically discovers available maps in your 0 A.D. installation and rotates them during continuous arena matches to improve variety.

**Features:**
- ✅ Automatic map discovery from 0 A.D. installation
- ✅ Smart rotation (prevents same map in last N matches)
- ✅ Civ pair tracking (prevents civ repetition)
- ✅ Fallback to hardcoded list if discovery fails
- ✅ Per-match logging of map selection

## How It Works

### 1. Map Discovery (`MapDiscovery` service)

The system scans your 0 A.D. installation for available maps. The script automatically finds your 0 A.D. installation using:
- Windows: `%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\data`
- Linux/Mac: Standard installation paths

**Map Location Structure:**
```
[0 A.D Installation]/binaries/data
├── skirmishes/     ← Built-in map location
│   ├── acropolis_bay_2p.pmp
│   ├── alpine_mountains_3p.pmp
│   └── ...
└── random_maps/    ← User-created / random maps
    └── ...
```

**Discovery Process:**
1. Scans `skirmishes/` and `random_maps/` directories
2. Extracts map metadata (name, player count, display name)
3. Caches results for performance
4. Falls back to hardcoded list if directories not found

### 2. Map Rotation (`MatchRotation` service)

Tracks match history and prevents repetition:

```typescript
const rotation = new MatchRotation({
  mapBlacklistSize: 3,      // Don't repeat same map in last 3 matches
  civBlacklistSize: 2,      // Don't repeat civ pair in last 2 matches
  maxHistorySize: 144,      // Keep ~24 hours of history
});

// Record each completed match
rotation.recordMatch('acropolis_bay_2p', ['Ollama', 'Petra']);

// Get blacklist for next selection
const blacklist = rotation.getMapBlacklist(); // Set<string>
```

### 3. Arena Loop Integration

The `run-arena-loop.ts` script now:
1. Initializes `MapDiscovery` and `MatchRotation` at startup
2. **Before each match:** Selects a map avoiding the blacklist
3. **After each match:** Records the map and civs used
4. **Logs progress:** Shows map selection and rotation stats

## Running the Arena with Map Rotation

### Basic Usage

```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
```

**Example Output:**
```
📍 Selected map for match 1: skirmishes/acropolis_bay_2p (Acropolis Bay)
🎮 Match 1 - Connecting to game...
Map: skirmishes/acropolis_bay_2p
...
✅ MATCH 1 COMPLETE - Winner: player (Ollama) (2150 ticks / ~215s)
📊 Map rotation stats: uniqueMaps=1, totalMatches=1

📍 Selected map for match 2: skirmishes/islands_2p (Islands)
🎮 Match 2 - Connecting to game...
...
```

### Quick Test (Single Match)

To verify map rotation works without running a full match:

```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

This will:
1. ✓ Discover or load maps
2. ✓ Select a random map
3. ✓ Launch the game with that map
4. ✓ Run until a winner is determined
5. ✓ Record the match in rotation history
6. ✓ Display rotation statistics

### Configuration

Edit `run-arena-loop.ts` to adjust rotation settings:

```typescript
const matchRotation = new MatchRotation(
  {
    mapBlacklistSize: 3,      // ← Increase to avoid map repetition longer
    civBlacklistSize: 2,      // ← Increase to avoid civ pairs longer
    maxHistorySize: 144,      // ← Increase to track more history
  },
  logger
);
```

## Available Maps

The system discovers maps from your 0 A.D. installation. If auto-discovery fails, it uses these **verified working maps**:

**2-Player Maps (1):**
- Acropolis Bay

**3-Player Maps (1):**
- Alpine Mountains

**Note:** These are the only maps that are installed by default and work with 0 A.D. The other 8 maps from the standard set are not included in your installation. For more map variety, see [Map Testing Results](MAP-TEST-RESULTS.md).

To see all available maps, you can also call:

```typescript
const discovery = new MapDiscovery();
const maps = await discovery.discoverMaps();
maps.forEach(m => console.log(`${m.name} (${m.players}p): ${m.displayName}`));
```

## Testing & Verification

### 1. Check Map Discovery

Run the diagnostic tool to verify maps are discovered:

```bash
npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts
```

**Expected Output:**
```
✅ Discovered 10 maps
📍 First 5 maps:
  - acropolis_bay_2p
      Display: Acropolis Bay
      Path: skirmishes/acropolis_bay_2p
      Players: 2
...
```

### 2. Test Game Launch with Map

Verify the game can launch with a map:

```bash
npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
```

**Expected Output:**
```
Testing map format: "skirmishes/acropolis_bay_2p"
✅ SUCCESS! Game started and RL Interface responding
Game tick: 4000
```

### 3. Run Arena with Map Rotation

Test the full arena loop with one match:

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

You should see:
- ✓ Map discovery/fallback
- ✓ Map selection with display name
- ✓ Game launch with selected map
- ✓ Match completion
- ✓ Rotation statistics

## Troubleshooting

### Maps Not Being Discovered

If you see:
```
[MapDiscovery:WARN] No maps found in game data, using fallback list
```

**Why:** The system can't find the actual map files in your 0 A.D. installation. This is OK - the fallback list of 10 maps will be used instead.

**To verify maps are working anyway:**
1. Run: `npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts`
2. If you see `✅ SUCCESS! Game started`, maps are working fine with the fallback list

### Game Fails to Start with Error

If you see: `CCachelloader failed to find archived or source file for: "maps/skirmishes/..."`

**Cause:** Incorrect map path format

**Solution:**
- Our system uses format: `skirmishes/acropolis_bay_2p` ✓
- Game expects: `-autostart=skirmishes/acropolis_bay_2p` ✓

This is handled automatically. If you see this error, run the diagnostic:
```bash
npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
```

### Same Map Playing Consecutively

This shouldn't happen. To debug:

1. Check the `mapBlacklistSize` setting in `run-arena-loop.ts` (should be ≥ 2)
2. Look at rotation stats in logs:
   ```
   📊 Map rotation stats: uniqueMaps=3, totalMatches=5
   ```
   - Shows how many unique maps have been played
   - If low with many matches, most maps might be blacklisted

### Custom/User Maps Not Showing

The system can scan user-created maps from your 0 A.D. installation's `random_maps/` folder:
- **Windows:** `%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\data\random_maps\`
- **Linux:** `~/.local/share/0ad/random_maps/`
- **Mac:** `~/Library/Application Support/0ad/random_maps/`

However, since auto-discovery might not find the maps directory, the fallback list is used. To add more maps to the fallback list, edit `map-discovery.ts` and add to the `FALLBACK_MAPS` array.

## Architecture

### Files

- **Map Discovery:** `packages/zeroad-adapter/src/match/map-discovery.ts`
  - Auto-discovers maps from 0 A.D. installation
  - Handles player count extraction
  - Provides fallback list

- **Match Rotation:** `packages/zeroad-adapter/src/match/match-rotation.ts` (existing)
  - Tracks match history
  - Prevents repetition via blacklisting
  - Maintains statistics

- **Arena Loop:** `packages/zeroad-adapter/src/arena/run-arena-loop.ts` (updated)
  - Integrates map discovery
  - Selects maps using rotation system
  - Records match results

### Tests

```bash
npm test -- packages/zeroad-adapter/src/match/map-discovery.test.ts
```

12 tests covering:
- Map loading & caching
- Player count extraction
- Map name formatting
- Random selection
- Filtering by player count
- JSON export

## Next Steps

1. **Run the arena with map rotation:**
   ```bash
   npm run build
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
   ```

2. **Check the logs** for:
   - ✓ Map discovery success/fallback
   - ✓ Map selection per match
   - ✓ Rotation stats after each match

3. **Monitor map variety** across multiple matches to confirm rotation is working

4. **(Optional) Install more maps** in the random_maps directory for greater variety

## Notes

- **Performance:** Map discovery happens once at startup and is cached
- **Fallback Safety:** If discovery fails, system gracefully falls back to hardcoded list
- **No Breaking Changes:** Existing match flow is unchanged, rotation is additive
- **Platform:** Currently designed for Windows (0 A.D. installation path uses Windows paths)

---

For issues or questions, check the logs in the arena output directory.
