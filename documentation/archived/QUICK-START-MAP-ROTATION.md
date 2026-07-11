# Quick Start — Map Rotation System

## 🚀 Get Started in 3 Steps

### Step 1: Build the Project
```bash
npm run build
```

### Step 2: Run Diagnostics (Optional but Recommended)
```bash
# Check that maps are discoverable
npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts

# Check that game can launch with maps
npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
```

Expected output:
```
✅ Discovered 10 maps
✅ SUCCESS! Game started and RL Interface responding
```

### Step 3: Run Arena with Map Rotation
```bash
# Test with 1 match
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Or run continuous arena
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
```

## 📊 What You'll See

```
📍 Selected map for match 1: skirmishes/acropolis_bay_2p (Acropolis Bay)
🎮 Match 1 - Connecting to game...
Map: skirmishes/acropolis_bay_2p
...
✅ MATCH 1 COMPLETE - Winner: player (Ollama)
📊 Map rotation stats: uniqueMaps=1, totalMatches=1

📍 Selected map for match 2: skirmishes/alpine_mountains_3p (Alpine Mountains)
...
```

## 🎯 Key Features

- **Automatic Map Discovery** — Finds maps in 0 A.D. installation
- **Smart Rotation** — Prevents same map in last 3 matches
- **Fallback Safety** — Uses 10 hardcoded maps if discovery fails
- **Per-Match Stats** — Shows map variety tracking

## ⚙️ Configuration

Edit rotation settings in `run-arena-loop.ts`:

```typescript
const matchRotation = new MatchRotation({
  mapBlacklistSize: 3,      // Don't repeat same map in last 3 matches
  civBlacklistSize: 2,      // Don't repeat civ pair in last 2 matches
  maxHistorySize: 144,      // Keep ~24 hours of history
});
```

## 📖 Available Maps

The system comes with 2 built-in verified working maps:

**2-Player Maps (1):**
- Acropolis Bay

**3-Player Maps (1):**
- Alpine Mountains

For more variety, see [MAP-TEST-RESULTS.md](MAP-TEST-RESULTS.md) to download additional maps.

## 🆘 Troubleshooting

### "No maps found in game data, using fallback list"
✅ **This is OK!** The system will use the 10 built-in maps.

### Game won't start with map error
Run the diagnostic:
```bash
npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts
```
This tests different map formats to find the working one.

### Want more maps?
1. Edit `packages/zeroad-adapter/src/match/map-discovery.ts`
2. Add maps to the `FALLBACK_MAPS` array:
   ```typescript
   {
     name: 'your_map_name',
     displayName: 'Your Map Display Name',
     filePath: 'skirmishes/your_map_name',
     players: 2,
     isBuiltin: true,
   }
   ```
3. Rebuild: `npm run build`

## 📚 Learn More

- **Full Guide:** See `MAP-ROTATION-GUIDE.md`
- **Implementation Details:** See `IMPLEMENTATION-SUMMARY.md`
- **Source Code:** `packages/zeroad-adapter/src/match/map-discovery.ts`

## ✅ Verification Checklist

- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test -- packages/zeroad-adapter/src/match/map-discovery.test.ts`
- [ ] Map discovery works: `npx tsx packages/zeroad-adapter/src/arena/test-map-discovery.ts`
- [ ] Game launches: `npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts`
- [ ] Arena runs: `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1`

---

Ready to start? Run:
```bash
npm run build && npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```
