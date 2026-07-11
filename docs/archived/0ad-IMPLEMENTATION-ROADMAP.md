# 0 A.D. Adapter - Implementation Roadmap

**Status**: Design Complete, Ready for Implementation  
**Date**: 2026-07-07  
**Target Release**: AI Commander v2.1

---

## Project Structure

```
ai-commander/
├── packages/
│   ├── adapter-0ad/              # Main adapter package
│   └── [existing packages]
└── docs/
    ├── 0ad-INVESTIGATION.md      # (this directory)
    ├── 0ad-INTEGRATION-ARCHITECTURE.md
    └── 0ad-IMPLEMENTATION-ROADMAP.md
```

---

## Implementation Backlog

Complete breakdown of all stories needed to implement the 0 A.D. adapter.

---

# EPIC 1: FOUNDATION & PROCESS MANAGEMENT

## STORY 1.1: Package Setup & Scaffolding

**Type**: Setup  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Create the `@ai-commander/adapter-0ad` package with proper TypeScript configuration, build setup, and directory structure.

**Acceptance Criteria**:
- [ ] Package created in `packages/adapter-0ad/`
- [ ] `tsconfig.json` configured for strict mode
- [ ] Exports in `src/index.ts` define public API
- [ ] Build produces CommonJS and type definitions
- [ ] README documents package purpose

**Technical Details**:
```typescript
// src/index.ts
export { Match0ADAdapter } from './adapter';
export { Launcher } from './launcher';
export { ConfigBuilder } from './config';
export { ReplayParser } from './parser/replay-parser';
export type { Match0ADConfig, Match0ADResult } from './types';
```

**Dependencies**: None (greenfield)

**Risk**: None

---

## STORY 1.2: 0 A.D. Executable Detection & Path Resolution

**Type**: Feature  
**Effort**: 2 days  
**Owner**: TBD  

**Description**:
Implement detection and resolution of 0 A.D. installation path on Windows, macOS, and Linux. Support both Steam and direct installations.

**Acceptance Criteria**:
- [ ] Detects 0 A.D. on Windows (Steam, direct, registry)
- [ ] Detects 0 A.D. on macOS (Applications folder, homebrew)
- [ ] Detects 0 A.D. on Linux (standard paths, snap)
- [ ] Validates executable exists and is runnable
- [ ] Allow environment variable override
- [ ] Clear error message if not found

**Technical Details**:
```typescript
// src/launcher.ts
class Launcher {
  static detectExecutablePath(override?: string): string {
    // Windows: HKLM\SOFTWARE\0ad or Steam
    // macOS: /Applications/0ad.app or ~/.homebrew/bin/0ad
    // Linux: /usr/bin/0ad or /snap/bin/0ad
    // Return full path to pyrogenesis executable
  }
}
```

**Common Paths**:
- **Windows**: 
  - `C:\Program Files\0 A.D. Empires Ascendant\bin\pyrogenesis.exe`
  - `C:\Program Files (x86)\Steam\steamapps\common\0 A.D. Empires Ascendant\bin\pyrogenesis.exe`
- **macOS**: `/Applications/0 A.D. Empires Ascendant.app/Contents/MacOS/pyrogenesis`
- **Linux**: `/usr/games/0ad` or `/snap/bin/0ad`

**Dependencies**: Node.js `fs` and `path` modules

**Risk**: Low - path detection is straightforward

---

## STORY 1.3: Process Launcher & Lifecycle Management

**Type**: Feature  
**Effort**: 3 days  
**Owner**: TBD  

**Description**:
Implement process spawning, monitoring, and lifecycle management. Handle startup, running, and cleanup.

**Acceptance Criteria**:
- [ ] Spawn 0 A.D. process with command-line arguments
- [ ] Capture stdout and stderr to files
- [ ] Monitor process for crashes
- [ ] Implement timeout mechanism (default 30 min)
- [ ] Graceful shutdown (SIGTERM then SIGKILL)
- [ ] Clean up temporary files on exit
- [ ] Return exit code and error message

**Technical Details**:
```typescript
// src/launcher.ts
interface ProcessOptions {
  executable: string;
  args: string[];
  timeout: number;           // milliseconds
  workdir: string;           // temporary directory
}

class Launcher {
  async launch(opts: ProcessOptions): Promise<ProcessResult> {
    // 1. Spawn child process
    // 2. Monitor with timeout
    // 3. Capture stdout/stderr
    // 4. Clean up on exit
    // 5. Return results
  }
}
```

**Process Management**:
- Spawn via `child_process.spawn()`
- Capture streams to temp files
- Set up timeout with `setTimeout()`
- Kill process gracefully then force
- Cleanup temp files

**Dependencies**: Node.js `child_process` and `fs` modules

**Risk**: Medium - cross-platform signal handling may vary

---

## STORY 1.4: Temporary File & Directory Management

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Implement safe creation and cleanup of temporary directories for each match. Ensure no file collisions.

**Acceptance Criteria**:
- [ ] Create unique temporary directory per match
- [ ] Use OS temp directory or custom path
- [ ] Generate unique names (UUID-based)
- [ ] Clean up all files after match completes
- [ ] Clean up even on errors/crashes
- [ ] Preserve logs for debugging

**Technical Details**:
```typescript
// src/util.ts
class TempDir {
  constructor(basePath?: string) {
    this.path = path.join(
      basePath || os.tmpdir(),
      `0ad-${Date.now()}-${crypto.randomUUID()}`
    );
  }

  async create(): Promise<void> { /* mkdir -p */ }
  async cleanup(): Promise<void> { /* rm -rf, but keep logs */ }
}
```

**Directory Structure**:
```
/tmp/0ad-1720094400000-abc123/
├── config.json          # Match configuration
├── stdout.log           # Game output
├── stderr.log           # Error output
├── replay.ogv           # Game replay
└── save.json            # Final save state
```

**Dependencies**: Node.js `os` and `fs` modules

**Risk**: Low

---

# EPIC 2: CONFIGURATION & MATCH SETUP

## STORY 2.1: Match Configuration Data Structures

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Define TypeScript interfaces for match configuration, validation, and serialization.

**Acceptance Criteria**:
- [ ] `Match0ADConfig` interface defined
- [ ] `PlayerConfig` interface for each player
- [ ] `MapConfig` for map selection
- [ ] `GameSettings` for match parameters
- [ ] Full JSDoc documentation
- [ ] Type safety (strict mode)

**Technical Details**:
```typescript
// src/types.ts
export interface Match0ADConfig {
  players: PlayerConfig[];
  map: MapConfig;
  settings: GameSettings;
}

export interface PlayerConfig {
  slot: number;              // 0-7
  civilization: string;      // Validated civ name
  ai?: AIConfig;             // Optional AI
}

export interface MapConfig {
  name: string;              // Built-in map or custom file
  seed?: number;             // -1=random, 0+=specific
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'enormous';
}

export interface GameSettings {
  difficulty: number;        // 0-5
  cheatsEnabled: boolean;
  turnLimit?: number;        // Max ticks
  resources?: 'default' | 'low' | 'high';
}

export interface AIConfig {
  name: string;              // 'petra', etc.
  difficulty: number;        // 0-5
}
```

**Validation**:
- Slot: 0-7 range
- Civilization: From approved list (Britons, Gauls, Han, etc.)
- Map: Exists in game data
- Difficulty: 0-5 range
- All required fields present

**Dependencies**: TypeScript

**Risk**: None

---

## STORY 2.2: Configuration Validation & Defaults

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Implement validation of match configurations with sensible defaults and error messages.

**Acceptance Criteria**:
- [ ] Validate all required fields present
- [ ] Validate value ranges
- [ ] Check civilization exists
- [ ] Check map exists
- [ ] Apply sensible defaults
- [ ] Return detailed error messages

**Technical Details**:
```typescript
// src/config.ts
class ConfigValidator {
  validate(config: Partial<Match0ADConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    config: Match0ADConfig;  // With defaults applied
  }
}

// Default values
const DEFAULTS: Match0ADConfig = {
  players: [],
  map: { name: 'Alpine Lakes', seed: undefined }, // Random seed
  settings: {
    difficulty: 3,
    cheatsEnabled: false,
    resources: 'default'
  }
};
```

**Validation Rules**:
- Exactly 2-8 players
- Each player has unique slot (0-7)
- Each slot has civilization
- Valid map name
- Difficulty in range

**Error Messages**:
- "Player slot 0 missing civilization"
- "Invalid map name: SpaceBase"
- "Difficulty must be 0-5, got 10"

**Dependencies**: None

**Risk**: Low

---

## STORY 2.3: Command-Line Argument Builder

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Build command-line arguments from Match0ADConfig for launching 0 A.D. process.

**Acceptance Criteria**:
- [ ] Convert config to CLI arguments
- [ ] Handle all game-supported flags
- [ ] Escape special characters
- [ ] Return array ready for `spawn()`
- [ ] Document argument format

**Technical Details**:
```typescript
// src/config.ts
class CLIBuilder {
  build(config: Match0ADConfig, opts: LaunchOptions): string[] {
    const args = ['-autostart'];
    args.push('-autostart-map', config.map.name);
    
    if (config.map.seed !== undefined) {
      args.push('-autostart-seed', String(config.map.seed));
    }

    args.push('-autostart-players', String(config.players.length));

    config.players.forEach(player => {
      if (player.ai) {
        args.push(
          `-autostart-player-${player.slot + 1}-ai`, 
          player.ai.name
        );
        args.push(
          `-autostart-player-${player.slot + 1}-difficulty`,
          String(player.ai.difficulty)
        );
      }
      args.push(
        `-autostart-player-${player.slot + 1}-civ`,
        player.civilization
      );
    });

    return args;
  }
}
```

**Output Example**:
```
[
  '-autostart',
  '-autostart-map', 'Alpine Lakes',
  '-autostart-players', '2',
  '-autostart-player-1-ai', 'petra',
  '-autostart-player-1-difficulty', '3',
  '-autostart-player-1-civ', 'britons',
  '-autostart-player-2-civ', 'gauls'
]
```

**Dependencies**: None

**Risk**: Low (format documented in 0 A.D. source)

---

# EPIC 3: PROCESS EXECUTION & MONITORING

## STORY 3.1: Match Execution Orchestration

**Type**: Feature  
**Effort**: 2 days  
**Owner**: TBD  

**Description**:
Orchestrate the full match execution: setup, launch, monitor, cleanup.

**Acceptance Criteria**:
- [ ] Execute match from start to finish
- [ ] Handle process startup
- [ ] Monitor execution with timeout
- [ ] Graceful shutdown on completion
- [ ] Collect output (stdout/stderr)
- [ ] Return execution status

**Technical Details**:
```typescript
// src/adapter.ts
export class Match0ADAdapter {
  async executeMatch(
    config: Match0ADConfig,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // 1. Validate config
    // 2. Create temp directory
    // 3. Detect executable path
    // 4. Build CLI arguments
    // 5. Launch process
    // 6. Monitor execution
    // 7. Collect output
    // 8. Cleanup temp files
    // 9. Return result
  }
}
```

**Execution Flow**:
```
ConfigValidator.validate(config)
    |
    v
TempDir.create()
    |
    v
Launcher.detectExecutable()
    |
    v
CLIBuilder.build(config)
    |
    v
Launcher.spawn(executable, args, timeout)
    |
    v
Monitor.waitForCompletion(process, timeout)
    |
    v
FileCollector.gather(stdout, stderr, replay, save)
    |
    v
TempDir.cleanup()
    |
    v
Return ExecutionResult
```

**Error Handling**:
- Config validation fails → return error
- Process fails to start → return error
- Process times out → kill and return error
- Parse error → log and continue

**Dependencies**: Stories 1.2, 1.3, 1.4, 2.1, 2.2, 2.3

**Risk**: Low (composition of tested components)

---

## STORY 3.2: Process Output Monitoring & Collection

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Collect and manage process output streams (stdout, stderr) for analysis.

**Acceptance Criteria**:
- [ ] Capture stdout line-by-line
- [ ] Capture stderr line-by-line
- [ ] Stream to log files in real-time
- [ ] Buffer for error analysis
- [ ] Handle encoding (UTF-8)
- [ ] Track line numbers

**Technical Details**:
```typescript
// src/launcher.ts
class OutputCapture {
  private stdout: string[] = [];
  private stderr: string[] = [];
  private stdoutFile: fs.WriteStream;
  private stderrFile: fs.WriteStream;

  constructor(private logdir: string) {
    this.stdoutFile = fs.createWriteStream(
      path.join(logdir, 'stdout.log')
    );
    this.stderrFile = fs.createWriteStream(
      path.join(logdir, 'stderr.log')
    );
  }

  attachToProcess(proc: ChildProcess): void {
    proc.stdout?.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      this.stdout.push(...lines);
      this.stdoutFile.write(chunk);
    });

    proc.stderr?.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      this.stderr.push(...lines);
      this.stderrFile.write(chunk);
    });
  }

  getOutput(): { stdout: string; stderr: string } {
    return {
      stdout: this.stdout.join('\n'),
      stderr: this.stderr.join('\n')
    };
  }
}
```

**Usage**:
```typescript
const capture = new OutputCapture(tempdir);
capture.attachToProcess(childProcess);
// ... process runs ...
const { stdout, stderr } = capture.getOutput();
```

**Dependencies**: Node.js `fs` module

**Risk**: Low

---

## STORY 3.3: Timeout & Process Termination

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Implement timeout handling and graceful process termination with escalation.

**Acceptance Criteria**:
- [ ] Set timeout per match (default 30 min)
- [ ] Monitor elapsed time
- [ ] Send SIGTERM on timeout
- [ ] Wait for graceful shutdown (5 sec)
- [ ] Force kill with SIGKILL if needed
- [ ] Log termination reason

**Technical Details**:
```typescript
// src/launcher.ts
class ProcessMonitor {
  async waitForCompletion(
    process: ChildProcess,
    timeout: number
  ): Promise<{ code: number | null; signal: string | null }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Timeout occurred
        process.kill('SIGTERM');  // Graceful
        
        const forceKillTimer = setTimeout(() => {
          process.kill('SIGKILL');  // Force
        }, 5000);  // 5 second grace period

        process.once('exit', () => {
          clearTimeout(forceKillTimer);
          resolve({ code: null, signal: 'SIGTERM' });
        });
      }, timeout);

      process.on('exit', (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal });
      });

      process.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
```

**Timeline**:
- T=0: Process starts
- T=timeout: Send SIGTERM
- T=timeout+5s: Send SIGKILL if still running
- Process exits: Return result

**Dependencies**: Node.js `child_process` module

**Risk**: Medium (signal handling varies by platform)

---

# EPIC 4: REPLAY PARSING & ANALYSIS

## STORY 4.1: Replay File Format Understanding

**Type**: Research  
**Effort**: 2 days  
**Owner**: TBD  

**Description**:
Document and understand 0 A.D.'s `.ogv` replay file format. This is preparation for parsing.

**Acceptance Criteria**:
- [ ] Understand binary format structure
- [ ] Document compression method (zlib)
- [ ] Identify command structure
- [ ] Extract metadata format
- [ ] Create detailed format documentation
- [ ] Provide examples

**Research Tasks**:
1. Examine 0 A.D. source code (`source/network/NetMessage.h`, `replay.cpp`)
2. Download sample replay files
3. Extract and analyze with hex editor
4. Reverse-engineer command structure
5. Document findings

**Expected Output**:
```
// docs/0ad-REPLAY-FORMAT.md

## OGV File Format

### Header
- Magic: "OGV" (0x4F 0x47 0x56)
- Version: uint32 (little-endian)

### Metadata Section
- Player count: uint8
- Map name: null-terminated string
- ...

### Command Stream
- Commands are serialized in tick order
- Compressed with zlib
- ...

### Example Structure
[Magic][Version][MetadataSize][Metadata][CompressedData]
```

**Dependencies**: 0 A.D. source code access, hex editor

**Risk**: Medium (reverse-engineering required)

---

## STORY 4.2: Replay File Decompression

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Implement decompression of 0 A.D. replay files to access command data.

**Acceptance Criteria**:
- [ ] Read `.ogv` file
- [ ] Decompress zlib-compressed data
- [ ] Extract metadata
- [ ] Extract command stream
- [ ] Handle errors gracefully
- [ ] Return structured data

**Technical Details**:
```typescript
// src/parser/replay-parser.ts
class ReplayFileReader {
  async read(filePath: string): Promise<RawReplayData> {
    const buffer = await fs.promises.readFile(filePath);
    
    // Parse header
    const magic = buffer.toString('ascii', 0, 3);
    if (magic !== 'OGV') throw new Error('Invalid replay file');
    
    const version = buffer.readUInt32LE(3);
    const metadataSize = buffer.readUInt32LE(7);
    
    // Extract metadata
    const metadataBuffer = buffer.subarray(11, 11 + metadataSize);
    const metadata = this.parseMetadata(metadataBuffer);
    
    // Decompress commands
    const compressedData = buffer.subarray(11 + metadataSize);
    const commandData = zlib.gunzipSync(compressedData);
    
    return { metadata, commandData };
  }

  private parseMetadata(buffer: Buffer): ReplayMetadata {
    // Parse player count, map name, seed, etc.
    return { /* ... */ };
  }
}
```

**Dependencies**: Node.js `zlib` module

**Risk**: Medium (format understanding from Story 4.1)

---

## STORY 4.3: Command Sequence Parsing

**Type**: Feature  
**Effort**: 2 days  
**Owner**: TBD  

**Description**:
Parse the decompressed command stream to extract individual game commands and their timing.

**Acceptance Criteria**:
- [ ] Deserialize commands from byte stream
- [ ] Identify command type and owner
- [ ] Extract command parameters
- [ ] Associate with tick number
- [ ] Handle all command types
- [ ] Return command sequence

**Technical Details**:
```typescript
// src/parser/replay-parser.ts
class CommandParser {
  parse(commandData: Buffer): Command[] {
    const commands: Command[] = [];
    let offset = 0;

    while (offset < commandData.length) {
      // Read command header
      const tick = commandData.readUInt32LE(offset);
      offset += 4;

      const commandCount = commandData.readUInt8(offset);
      offset += 1;

      // Read each command in this tick
      for (let i = 0; i < commandCount; i++) {
        const cmd = this.readCommand(commandData, offset);
        cmd.tick = tick;
        commands.push(cmd);
        offset += cmd.byteLength;
      }
    }

    return commands;
  }

  private readCommand(
    buffer: Buffer,
    offset: number
  ): Command & { byteLength: number } {
    const type = buffer.readUInt8(offset);
    const player = buffer.readUInt8(offset + 1);
    
    // Dispatch to type-specific parser
    const parser = this.commandParsers[type];
    return parser(buffer, offset, player);
  }
}

interface Command {
  tick: number;
  player: number;
  type: string;
  parameters: Record<string, unknown>;
}
```

**Command Types** (examples):
- `Move`: Unit ID, target position
- `Attack`: Attacker ID, target ID
- `Build`: Builder ID, building template, position
- `Train`: Building ID, unit template
- `Research`: Building ID, technology ID

**Dependencies**: Story 4.2

**Risk**: High (requires reverse-engineering command format)

---

## STORY 4.4: Replay Metadata Extraction

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Extract and parse metadata from replay files (match settings, players, map, etc.).

**Acceptance Criteria**:
- [ ] Extract player information
- [ ] Get map name and seed
- [ ] Get game settings
- [ ] Get match duration
- [ ] Get winner/outcome
- [ ] Return structured metadata

**Technical Details**:
```typescript
// src/types.ts
export interface ReplayMetadata {
  // Players
  players: ReplayPlayer[];
  
  // Map
  mapName: string;
  mapSeed: number;
  mapSize: number;
  
  // Game settings
  difficulty: number[];  // Per player
  cheatsEnabled: boolean;
  
  // Match outcome
  startTime: Date;
  endTime: Date;
  duration: number;  // ticks
  winner: number;    // player slot
  victoryType: string;
}

export interface ReplayPlayer {
  slot: number;
  civilization: string;
  ai?: string;  // AI name if not human
  team?: number;
}
```

**Implementation**:
```typescript
// src/parser/replay-parser.ts
class ReplayMetadataParser {
  parse(metadataBuffer: Buffer): ReplayMetadata {
    const view = new DataView(metadataBuffer);
    let offset = 0;

    // Parse players
    const playerCount = view.getUint8(offset++);
    const players: ReplayPlayer[] = [];
    
    for (let i = 0; i < playerCount; i++) {
      const civ = readString(metadataBuffer, offset);
      offset += civ.byteLength + 1;  // +1 for null terminator
      
      const ai = readString(metadataBuffer, offset);
      offset += ai.byteLength + 1;
      
      players.push({
        slot: i,
        civilization: civ,
        ai: ai || undefined
      });
    }

    // Parse map info
    const mapName = readString(metadataBuffer, offset);
    offset += mapName.byteLength + 1;

    const seed = view.getUint32(offset, true);
    offset += 4;

    // ... continue parsing

    return { players, mapName, mapSeed: seed, /* ... */ };
  }
}
```

**Dependencies**: Story 4.2

**Risk**: Medium (format structure)

---

## STORY 4.5: Full Replay Parser Integration

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Integrate all replay parsing components into a single public API.

**Acceptance Criteria**:
- [ ] Single entry point for replay parsing
- [ ] Orchestrate decompression, metadata, commands
- [ ] Return complete replay data
- [ ] Handle errors gracefully
- [ ] Provide detailed error messages

**Technical Details**:
```typescript
// src/parser/replay-parser.ts
export class ReplayParser {
  async parse(filePath: string): Promise<ParsedReplay> {
    // 1. Read file
    const raw = await new ReplayFileReader().read(filePath);

    // 2. Parse metadata
    const metadata = new ReplayMetadataParser().parse(raw.metadata);

    // 3. Parse commands
    const commands = new CommandParser().parse(raw.commandData);

    return { metadata, commands };
  }
}

export interface ParsedReplay {
  metadata: ReplayMetadata;
  commands: Command[];
}
```

**Usage**:
```typescript
const parser = new ReplayParser();
const replay = await parser.parse('replay.ogv');

console.log(`Match: ${replay.metadata.players[0].civilization} vs ${replay.metadata.players[1].civilization}`);
console.log(`Winner: Player ${replay.metadata.winner}`);
console.log(`Commands executed: ${replay.commands.length}`);
```

**Error Handling**:
```typescript
try {
  const replay = await parser.parse('corrupt.ogv');
} catch (err) {
  if (err.message.includes('Invalid magic')) {
    console.error('File is not a valid 0 A.D. replay');
  } else if (err.message.includes('Decompression')) {
    console.error('Replay file is corrupted');
  } else {
    console.error(`Unknown error: ${err.message}`);
  }
}
```

**Dependencies**: Stories 4.2, 4.3, 4.4

**Risk**: Low (composition of tested components)

---

# EPIC 5: GAME STATE OBSERVATION

## STORY 5.1: Save Game File Parsing

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Parse 0 A.D. save game JSON files to extract final game state.

**Acceptance Criteria**:
- [ ] Load and parse JSON save file
- [ ] Extract player resources
- [ ] Extract entity list and state
- [ ] Extract technology research progress
- [ ] Handle multiple save formats
- [ ] Return structured game state

**Technical Details**:
```typescript
// src/parser/save-parser.ts
export class SaveGameParser {
  async parse(filePath: string): Promise<GameState> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    const players: PlayerState[] = json.players.map((p: any) => ({
      id: p.id,
      civilization: p.civ,
      resources: {
        food: p.res?.food || 0,
        wood: p.res?.wood || 0,
        stone: p.res?.stone || 0,
        metal: p.res?.metal || 0
      },
      phase: p.phase || 'Village',
      population: p.pop || 0
    }));

    const entities: EntityState[] = json.entities.map((e: any) => ({
      id: e.id,
      template: e.template,
      owner: e.owner,
      position: {
        x: e.pos?.x || 0,
        z: e.pos?.z || 0,
        angle: e.rot || 0
      },
      health: e.health || undefined,
      state: e.state || 'idle'
    }));

    return {
      tick: json.tick || 0,
      timeElapsed: json.time || 0,
      players,
      entities
    };
  }
}
```

**Expected JSON Structure**:
```json
{
  "tick": 10000,
  "time": 500000,
  "players": [
    {
      "id": 1,
      "civ": "britons",
      "res": {"food": 1000, "wood": 500, "stone": 200, "metal": 150},
      "pop": 50
    }
  ],
  "entities": [
    {
      "id": 42,
      "template": "units/britons/cavalry_spearman",
      "owner": 1,
      "pos": {"x": 100, "z": 100},
      "health": 100,
      "state": "walking"
    }
  ]
}
```

**Dependencies**: None (pure JSON parsing)

**Risk**: Low

---

## STORY 5.2: Final State Extraction & Statistics

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Extract final game state from save file and calculate match statistics.

**Acceptance Criteria**:
- [ ] Parse final save game
- [ ] Calculate winner from victory condition
- [ ] Count units by type/civilization
- [ ] Sum resources per player
- [ ] Calculate building inventory
- [ ] Determine tech progress

**Technical Details**:
```typescript
// src/parser/stats-extractor.ts
export class StatsExtractor {
  extract(gameState: GameState): MatchStatistics {
    // Determine winner
    const winner = this.determineWinner(gameState);

    // Count units
    const unitStats = this.countUnits(gameState.entities);

    // Count buildings
    const buildingStats = this.countBuildings(gameState.entities);

    // Final resources
    const resourceStats = gameState.players.map(p => ({
      player: p.id,
      resources: p.resources
    }));

    return {
      winner,
      duration: gameState.timeElapsed,
      playerStats: gameState.players.map(p => ({
        civilization: p.civilization,
        resources: p.resources,
        population: p.population,
        phase: p.phase
      })),
      unitStats,
      buildingStats,
      resourceStats
    };
  }

  private determineWinner(state: GameState): number {
    // Check victory conditions:
    // 1. Last player standing (conquest)
    // 2. Wonder completed (wonder victory)
    // 3. All relics gathered (relic victory)
    // 4. Time limit reached (highest score)

    const alivePlayers = state.players.filter(p => {
      // Player alive if has units or buildings
      return state.entities.some(e => e.owner === p.id);
    });

    if (alivePlayers.length === 1) {
      return alivePlayers[0].id;
    }

    // Default: highest resource count
    return state.players.reduce((max, p) =>
      this.totalResources(p.resources) > this.totalResources(state.players[max].resources)
        ? p.id
        : max
    );
  }

  private countUnits(entities: EntityState[]): UnitStats {
    // Count units by civilization and type
    const stats: Record<string, Record<string, number>> = {};

    entities.forEach(e => {
      if (e.template.startsWith('units/')) {
        const civ = e.template.split('/')[1];
        const type = e.template.split('/')[2];

        if (!stats[civ]) stats[civ] = {};
        stats[civ][type] = (stats[civ][type] || 0) + 1;
      }
    });

    return stats;
  }

  private totalResources(resources: PlayerResources): number {
    return resources.food + resources.wood + resources.stone + resources.metal;
  }
}
```

**Output**:
```typescript
interface MatchStatistics {
  winner: number;
  duration: number;  // ticks
  playerStats: Array<{
    civilization: string;
    resources: PlayerResources;
    population: number;
    phase: string;
  }>;
  unitStats: Record<string, Record<string, number>>;
  buildingStats: Record<string, Record<string, number>>;
  resourceStats: Array<{
    player: number;
    resources: PlayerResources;
  }>;
}
```

**Dependencies**: Story 5.1

**Risk**: Low

---

# EPIC 6: RESULT PARSING & VALIDATION

## STORY 6.1: Match Outcome Determination

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Determine match winner and victory condition from replay and save state.

**Acceptance Criteria**:
- [ ] Parse victory condition from replay metadata
- [ ] Identify winner from game state
- [ ] Classify victory type
- [ ] Detect errors/cheats if applicable
- [ ] Return structured result

**Technical Details**:
```typescript
// src/parser/outcome-parser.ts
export enum VictoryCondition {
  CONQUEST = 'conquest',           // Last player standing
  WONDER = 'wonder',               // Wonder complete
  RELICS = 'relics',               // All relics gathered
  TIME_LIMIT = 'time_limit',       // Time limit reached
  ERROR = 'error',                 // Game error
  UNKNOWN = 'unknown'              // Unable to determine
}

export class OutcomeParser {
  determine(
    replay: ParsedReplay,
    gameState: GameState
  ): MatchOutcome {
    // Check victory conditions in order of precedence
    
    // 1. Check for wonder victory
    const wonderWinner = this.checkWonderVictory(gameState);
    if (wonderWinner !== null) {
      return {
        winner: wonderWinner,
        condition: VictoryCondition.WONDER,
        tick: replay.metadata.duration
      };
    }

    // 2. Check for relics victory
    const relicsWinner = this.checkRelicsVictory(gameState);
    if (relicsWinner !== null) {
      return {
        winner: relicsWinner,
        condition: VictoryCondition.RELICS,
        tick: replay.metadata.duration
      };
    }

    // 3. Check for conquest (last player alive)
    const conquestWinner = this.checkConquestVictory(gameState);
    if (conquestWinner !== null) {
      return {
        winner: conquestWinner,
        condition: VictoryCondition.CONQUEST,
        tick: replay.metadata.duration
      };
    }

    // 4. Time limit reached
    return {
      winner: this.determineByScore(gameState),
      condition: VictoryCondition.TIME_LIMIT,
      tick: replay.metadata.duration
    };
  }

  private checkWonderVictory(state: GameState): number | null {
    // Check for completed wonder building
    const wonder = state.entities.find(e =>
      e.template.includes('wonder')
    );
    return wonder ? wonder.owner : null;
  }

  private checkConquestVictory(state: GameState): number | null {
    // Count living players
    const livingPlayers = new Set(
      state.entities
        .filter(e => e.owner > 0)  // Ignore gaia (owner 0)
        .map(e => e.owner)
    );

    return livingPlayers.size === 1 
      ? Array.from(livingPlayers)[0] 
      : null;
  }

  private determineByScore(state: GameState): number {
    // Highest resource count wins
    return state.players.reduce((maxId, p) => {
      const maxResources = 
        state.players[maxId - 1].resources.food +
        state.players[maxId - 1].resources.wood +
        state.players[maxId - 1].resources.stone +
        state.players[maxId - 1].resources.metal;

      const pResources = 
        p.resources.food +
        p.resources.wood +
        p.resources.stone +
        p.resources.metal;

      return pResources > maxResources ? p.id : maxId;
    });
  }
}

export interface MatchOutcome {
  winner: number;
  condition: VictoryCondition;
  tick: number;
}
```

**Dependencies**: Story 4.5, Story 5.1

**Risk**: Medium (victory condition rules must be accurate)

---

## STORY 6.2: Match Result Aggregation

**Type**: Feature  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Aggregate all match data (outcome, replay, statistics) into a single Match0ADResult object.

**Acceptance Criteria**:
- [ ] Combine replay metadata, commands, and outcome
- [ ] Combine game state and statistics
- [ ] Validate completeness
- [ ] Return Match0ADResult

**Technical Details**:
```typescript
// src/adapter.ts
export class Match0ADAdapter {
  private async generateResult(
    config: Match0ADConfig,
    execution: ExecutionResult
  ): Promise<Match0ADResult> {
    // Parse replay
    const replay = await new ReplayParser().parse(
      execution.replayPath
    );

    // Parse save game
    const gameState = await new SaveGameParser().parse(
      execution.savePath
    );

    // Determine outcome
    const outcome = new OutcomeParser().determine(replay, gameState);

    // Extract statistics
    const stats = new StatsExtractor().extract(gameState);

    return {
      config,
      outcome,
      replay: {
        metadata: replay.metadata,
        commandCount: replay.commands.length,
        commands: replay.commands  // Include for detailed analysis
      },
      gameState,
      statistics: stats,
      executionTime: execution.duration
    };
  }
}

export interface Match0ADResult {
  config: Match0ADConfig;
  outcome: MatchOutcome;
  replay: {
    metadata: ReplayMetadata;
    commandCount: number;
    commands: Command[];
  };
  gameState: GameState;
  statistics: MatchStatistics;
  executionTime: number;  // milliseconds
}
```

**Dependencies**: Stories 4.5, 5.1, 5.2, 6.1

**Risk**: Low (composition)

---

# EPIC 7: INTEGRATION TESTING & DOCUMENTATION

## STORY 7.1: Unit Tests for Core Components

**Type**: QA  
**Effort**: 2 days  
**Owner**: TBD  

**Description**:
Write unit tests for each component (config, launcher, parsers, etc.)

**Acceptance Criteria**:
- [ ] Tests for ConfigValidator
- [ ] Tests for CLIBuilder
- [ ] Tests for ReplayParser
- [ ] Tests for SaveGameParser
- [ ] Tests for StatsExtractor
- [ ] Tests for OutcomeParser
- [ ] Coverage > 80%

**Test Structure**:
```
test/
├── config.test.ts
├── launcher.test.ts
├── parser/
│   ├── replay-parser.test.ts
│   ├── save-parser.test.ts
│   └── outcome-parser.test.ts
└── fixtures/
    ├── sample-replay.ogv
    ├── sample-save.json
    └── sample-config.json
```

**Example Test**:
```typescript
// test/config.test.ts
describe('ConfigValidator', () => {
  it('should validate correct config', () => {
    const config = {
      players: [
        { slot: 0, civilization: 'britons' },
        { slot: 1, civilization: 'gauls', ai: { name: 'petra', difficulty: 3 } }
      ],
      map: { name: 'Alpine Lakes', seed: 12345 },
      settings: { difficulty: 3, cheatsEnabled: false }
    };

    const result = new ConfigValidator().validate(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid civilization', () => {
    const config = {
      players: [
        { slot: 0, civilization: 'invalid_civ' }
      ],
      // ...
    };

    const result = new ConfigValidator().validate(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid civilization: invalid_civ');
  });
});
```

**Dependencies**: All stories (test fixtures prepared)

**Risk**: Low

---

## STORY 7.2: Integration Tests with Real 0 A.D.

**Type**: QA  
**Effort**: 3 days  
**Owner**: TBD  

**Description**:
Test full match execution with real 0 A.D. installation. Requires 0 A.D. to be installed.

**Acceptance Criteria**:
- [ ] Test match setup and execution
- [ ] Test replay recording and parsing
- [ ] Test outcome determination
- [ ] Test statistics calculation
- [ ] Support skippable tests if 0 A.D. not available

**Test Structure**:
```typescript
// test/integration.test.ts
describe('Match0ADAdapter (Integration)', () => {
  // Skip all tests if 0 A.D. not found
  beforeAll(() => {
    const exe = Launcher.detectExecutablePath();
    if (!exe) {
      console.warn('0 A.D. not found, skipping integration tests');
      SKIP_INTEGRATION = true;
    }
  });

  it('should execute match 2v2 Petra', async function() {
    if (SKIP_INTEGRATION) this.skip();

    const config: Match0ADConfig = {
      players: [
        { slot: 0, civilization: 'britons' },
        { slot: 1, civilization: 'gauls', ai: { name: 'petra', difficulty: 3 } }
      ],
      map: { name: 'Alpine Lakes', seed: 12345 },
      settings: { difficulty: 3, cheatsEnabled: false }
    };

    const adapter = new Match0ADAdapter();
    const result = await adapter.executeMatch(config, {
      timeout: 10 * 60 * 1000  // 10 minutes for test
    });

    expect(result.outcome.winner).toBeDefined();
    expect(result.outcome.condition).toBeDefined();
    expect(result.statistics.unitStats).toBeDefined();
  }, 15 * 60 * 1000);  // 15 minute timeout
});
```

**Test Scenarios**:
1. Simple 1v1 on small map
2. 2v2 on medium map
3. With Petra AI
4. Different civilizations
5. Different seeds
6. Error handling (timeout, crash)

**Dependencies**: Real 0 A.D. installation

**Risk**: High (requires external dependency)

---

## STORY 7.3: API Documentation & Examples

**Type**: Documentation  
**Effort**: 1 day  
**Owner**: TBD  

**Description**:
Write JSDoc and example usage for public API.

**Acceptance Criteria**:
- [ ] JSDoc for all public classes/methods
- [ ] README with quick start
- [ ] Example: Simple 1v1 match
- [ ] Example: Custom AI bot
- [ ] Example: Replay analysis
- [ ] API reference

**Documentation**:
```typescript
/**
 * Execute a 0 A.D. match between players.
 *
 * @param config - Match configuration (players, map, settings)
 * @param options - Execution options (timeout, executable path)
 * @returns Match result (outcome, replay, statistics)
 *
 * @example
 * const adapter = new Match0ADAdapter();
 * const result = await adapter.executeMatch({
 *   players: [
 *     { slot: 0, civilization: 'britons' },
 *     { slot: 1, civilization: 'gauls', ai: { name: 'petra', difficulty: 3 } }
 *   ],
 *   map: { name: 'Alpine Lakes' },
 *   settings: { difficulty: 3 }
 * });
 * console.log(`Winner: Player ${result.outcome.winner}`);
 */
async executeMatch(
  config: Match0ADConfig,
  options?: ExecutionOptions
): Promise<Match0ADResult>
```

**README Contents**:
- Installation
- Quick start (2 min example)
- API reference
- Advanced usage
- Troubleshooting

**Dependencies**: All previous stories

**Risk**: Low

---

# SUMMARY

## Story Count by Epic

| Epic | Stories | Effort |
|------|---------|--------|
| 1: Foundation | 4 | 5 days |
| 2: Configuration | 3 | 3 days |
| 3: Execution | 3 | 4 days |
| 4: Replay | 5 | 7 days |
| 5: State | 2 | 2 days |
| 6: Results | 2 | 2 days |
| 7: Testing | 3 | 6 days |
| **Total** | **22** | **31 days** |

## Implementation Order

**Recommended sequence**:
1. Stories 1.1-1.4 (Foundation)
2. Stories 2.1-2.3 (Configuration)
3. Stories 3.1-3.3 (Execution)
4. Story 4.1 (Research)
5. Stories 4.2-4.5 (Replay parsing)
6. Stories 5.1-5.2 (State observation)
7. Stories 6.1-6.2 (Results)
8. Stories 7.1-7.3 (Testing & docs)

## Critical Path

```
1.1 → 1.2 → 1.3 → 1.4
                      ↓
                2.1 → 2.2 → 2.3
                              ↓
                          3.1 → 3.2 → 3.3
                                          ↓
                                4.1 → 4.2 → 4.3 → 4.4 → 4.5
                                                          ↓
                                                  5.1 → 5.2
                                                          ↓
                                                  6.1 → 6.2
                                                          ↓
                                                  7.1 → 7.2 → 7.3
```

## Risk Areas

- **High**: Story 4.3 (command format reverse-engineering)
- **High**: Story 7.2 (integration with real 0 A.D.)
- **Medium**: Story 4.1 (format research)

## Recommendations

1. **Research First**: Do Story 4.1 early to unblock Story 4.3
2. **Test Early**: Create sample replay files for testing
3. **Version Pin**: Lock to specific 0 A.D. release
4. **Parallel Work**: Stories 1-3 can be parallelized with careful coordination
5. **Design Review**: Review Story 4.1 results before implementation

---

**Status**: Ready for implementation  
**Next Step**: Begin Epic 1 (Foundation)
