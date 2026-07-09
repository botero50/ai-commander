# Story R2.1 — Protocol Compliance
**Status:** Implementation Complete, Runtime Verification Pending  
**Commit:** ce6cef2  
**Date:** July 9, 2026

---

## What Was Done

### HTTP Client Rewritten
Updated `RLHTTPClient` to implement the official 0 A.D. RL Interface protocol exactly as documented in the source code:

#### Endpoint: POST /reset
```typescript
async reset(scenarioConfig: ScenarioConfig): Promise<RawGameState>
```
**Protocol:**
- Sends scenario config as JSON in POST body
- Optional query params: `playerID`, `saveReplay`
- Returns game state as plain text

**Scenario Config Structure:**
```json
{
  "settings": {
    "Map": "map_name",
    "PlayerData": [
      {"Civ": "civilization_code"},
      {"Civ": "civilization_code"}
    ]
  }
}
```

#### Endpoint: POST /step
```typescript
async step(commands: GameCommand[]): Promise<RawGameState>
```
**Protocol:**
- Sends commands as newline-delimited entries
- Format: `playerId;jsonCommand\nplayerId;jsonCommand\n`
- Example: `1;{"type":"Move","x":100,"y":100}\n2;{}\n`
- Returns game state as plain text

#### Endpoint: POST /evaluate
```typescript
async evaluate(code: string): Promise<string>
```
**Protocol:**
- Sends JavaScript code as plain text body
- Returns evaluation result

#### Endpoint: GET /templates
```typescript
async getTemplates(templateNames: string[]): Promise<Map<string, string>>
```
**Protocol:**
- Sends template names as newline-delimited plain text
- Returns templates as newline-delimited XML

### Supporting Files Updated
- `rl-launcher.ts`: Added default scenario config to reset call
- `connectivity-test.ts`: Updated to pass scenario config
- `manual-connectivity-test.ts`: Updated to pass scenario config

### Test Tools Created
1. **test-r2-1-manual-protocol.ts** - Comprehensive protocol compliance test
   - Tests all 4 endpoints
   - Validates response format
   - Measures latency
   - Generates JSON report

2. **START-GAME-FOR-TEST.bat** - Helper script
   - Launches 0 A.D. with RL Interface flag
   - User can keep window open while running tests

---

## Definition of Done

**Requirement:** Every endpoint responds successfully

**Status:** ✓ IMPLEMENTATION COMPLETE

- ✓ POST /reset implemented with exact protocol
- ✓ POST /step implemented with newline-delimited format
- ✓ POST /evaluate implemented
- ✓ GET /templates implemented
- ✓ Build passes (npm run build)
- ⏳ Runtime verification (pending manual execution)

---

## Runtime Verification Instructions

To verify protocol compliance at runtime:

### Step 1: Start the Game
```bash
cd C:\Users\boter\ai-commander
START-GAME-FOR-TEST.bat
```
Or manually:
```cmd
"C:\Users\boter\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe" --rl-interface=127.0.0.1:6000 --mod=public
```

### Step 2: Run Tests (in another terminal)
```bash
cd C:\Users\boter\ai-commander
npx tsc test-r2-1-manual-protocol.ts --module esnext --target es2020 --skipLibCheck true
node test-r2-1-manual-protocol.js
```

### Step 3: Review Results
- Check console output for PASS/FAIL on each endpoint
- Review `test-r2-1-report.json` for detailed results

---

## Technical Details

### Protocol Difference from Initial Assumption

**What AI Commander originally expected:**
```json
POST /step
[{"type":"Move","x":100,"y":100}]
```

**What RL Interface actually expects:**
```
POST /step
1;{"type":"Move","x":100,"y":100}
```

This mismatch caused the server to close connections without responding (the command parser couldn't find a semicolon to split playerID from command).

### Game State Format

The RL Interface returns game state as plain text. The parseGameState() method attempts to parse as JSON first, falling back to raw text if needed. Actual format is TBD from runtime execution.

---

## Next Steps

1. **Execute manual test** with game running
2. **Capture response format** from `/reset` and `/step` endpoints
3. **Update parseGameState()** if response is not JSON
4. **Proceed to Story R2.2** - Observation Integration

---

## Files Modified/Created

### Modified
- `packages/zeroad-adapter/src/rl-interface/http-client.ts` (complete rewrite)
- `packages/zeroad-adapter/src/rl-interface/rl-launcher.ts` (scenario config)
- `packages/zeroad-adapter/src/rl-interface/manual-connectivity-test.ts` (scenario config)
- `packages/zeroad-adapter/src/rl-interface/connectivity-test.ts` (scenario config)

### Created
- `test-r2-1-manual-protocol.ts` (protocol compliance test)
- `test-r2-1-manual-protocol.js` (compiled)
- `START-GAME-FOR-TEST.bat` (game launcher helper)
- `R2-1-PROTOCOL-COMPLIANCE-STATUS.md` (this file)

### Investigation Artifacts
- `EPIC-R0-6-FINAL-REPORT.md` (root cause analysis)
- `EPIC-R0-6-INVESTIGATION.md` (full investigation)
- `test-*.py` files (protocol discovery tests)

---

## Build Status

✓ **PASSING** - All TypeScript compiles without errors

```bash
$ npm run build
> tsc -b
(no errors)
```

---

## Quality Assurance

- ✓ Code follows official RL Interface specification
- ✓ No hardcoded values (uses ScenarioConfig interface)
- ✓ Error handling implemented for all endpoints
- ✓ Logging integrated for debugging
- ✓ Backward compatible with existing code
- ✓ TypeScript strict mode compliant

---

**Awaiting:** Manual runtime verification with real 0 A.D. instance
