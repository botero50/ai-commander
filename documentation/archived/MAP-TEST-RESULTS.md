# Map Testing Results

## Summary

Comprehensive testing of all 10 fallback maps revealed:

- ✅ **Working Maps: 2**
- ❌ **Broken/Missing Maps: 8**

## Test Methodology

Each map was tested by:
1. Starting a fresh 0 A.D. process with the map
2. Waiting 8 seconds for game initialization
3. Attempting to connect via RL Interface (15-second timeout)
4. Recording success/failure with game tick number

**Test Environment:**
- 0 A.D. with RL Interface enabled
- Map format: `skirmishes/[mapname]`
- Startup parameters: `-autostart=skirmishes/[mapname] -autostart-ai=1:petra -autostart-ai=2:petra`

---

## Results

### ✅ Working Maps (2/10)

| Map Name | Display Name | Players | Status | Tick |
|----------|--------------|---------|--------|------|
| `acropolis_bay_2p` | Acropolis Bay | 2 | ✅ Works | 4000 |
| `alpine_mountains_3p` | Alpine Mountains | 3 | ✅ Works | 4000 |

### ❌ Broken/Missing Maps (8/10)

| Map Name | Display Name | Players | Status | Reason |
|----------|--------------|---------|--------|--------|
| `ambush_valley_2p` | Ambush Valley | 2 | ❌ Failed | Map files missing |
| `cantabria_2p` | Cantabria | 2 | ❌ Failed | Map files missing |
| `hideouts_2p` | Hideouts | 2 | ❌ Failed | Map files missing |
| `islands_2p` | Islands | 2 | ❌ Failed | Map files missing |
| `nomad_2p` | Nomad | 2 | ❌ Failed | Map files missing |
| `setons_2p` | Setons' Way | 2 | ❌ Failed | Map files missing |
| `sinai_2p` | Sinai | 2 | ❌ Failed | Map files missing |
| `the_great_lakes_2p` | The Great Lakes | 2 | ❌ Failed | Map files missing |

---

## Action Taken

The map discovery fallback list has been updated to include **only the 2 verified working maps**:

```typescript
private readonly FALLBACK_MAPS: MapInfo[] = [
  { name: 'acropolis_bay_2p', displayName: 'Acropolis Bay', filePath: 'skirmishes/acropolis_bay_2p', players: 2, isBuiltin: true },
  { name: 'alpine_mountains_3p', displayName: 'Alpine Mountains', filePath: 'skirmishes/alpine_mountains_3p', players: 3, isBuiltin: true },
];
```

**File Updated:** `packages/zeroad-adapter/src/match/map-discovery.ts`

---

## Next Steps (Optional)

### Option 1: Download Missing Maps
If you want more map variety, the missing maps can be downloaded from:
- **0 A.D. Community:** [Community Maps](https://0ad.wildfiregames.com/)
- **ModDB:** Maps for 0 A.D.

Installation location: `C:\Users\[YourName]\AppData\Local\0 A.D. Empires Ascendant\binaries\data\skirmishes\`

### Option 2: Keep Current Setup
The current 2-map setup works fine. The arena can:
- Rotate between Acropolis Bay (2p) and Alpine Mountains (3p)
- Prevent same map from playing consecutively (via rotation blacklist)
- Run indefinitely without map variety issues

### Option 3: Add Custom Maps
To add more maps to the fallback list, edit `map-discovery.ts`:

```typescript
private readonly FALLBACK_MAPS: MapInfo[] = [
  // ... existing maps ...
  {
    name: 'your_custom_map',
    displayName: 'Your Custom Map Name',
    filePath: 'skirmishes/your_custom_map',
    players: 2,
    isBuiltin: true,
  },
];
```

Then test with: `npx tsx packages/zeroad-adapter/src/arena/test-game-launch.ts`

---

## Test Execution

To run the comprehensive map test yourself:

```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/test-all-maps.ts
```

This will test all maps and generate an updated recommendation list.

---

## Recommendations

1. **For Immediate Use:** The current 2-map setup is stable and ready to use
2. **For More Variety:** Download additional maps from the 0 A.D. community
3. **For Auto-Discovery:** When auto-discovery finds maps, they'll be added automatically to the rotation

---

## Files Changed

- `packages/zeroad-adapter/src/match/map-discovery.ts` — Updated FALLBACK_MAPS to only include verified working maps
- `packages/zeroad-adapter/src/match/map-discovery.test.ts` — Updated test expectations

## Current Status

✅ **Arena is ready to run with 2 verified maps**

```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
```
