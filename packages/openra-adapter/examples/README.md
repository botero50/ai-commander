# OpenRA Agent Examples (TypeScript)

This directory contains example AI agents built with TypeScript using the OpenRA adapter.

## Agents

**Available Agents:**
1. **Simple Agent** - Basic gameplay
2. **Advanced Agent** - Strategic gameplay
3. **ChatGPT vs ChatGPT** - AI vs AI Tournament (RECOMMENDED) ⭐

### 1. Simple Agent (`simple-agent.ts`)

**Best for:** Learning and testing

**Features:**
- Basic game loop
- State tracking
- Resource awareness
- Training mode with statistics
- Well-commented code for learning

**Run:**
```bash
npx ts-node simple-agent.ts
```

Or after building:
```bash
node dist/examples/simple-agent.js
```

**What it does:**
- Connects to OpenRA server
- Plays 3 games
- Logs game state and rewards
- Reports statistics

### 2. Advanced Agent (`advanced-agent.ts`)

**Best for:** Single-player gameplay and testing strategies

**Features:**
- Multi-state strategy system (EARLY_GAME, MID_GAME, LATE_GAME, DEFEND)
- Threat assessment and adaptation
- Tournament mode with configurable games
- Detailed statistics and analysis

**Run:**
```bash
npx ts-node advanced-agent.ts
```

Or after building:
```bash
node dist/examples/advanced-agent.js
```

**What it does:**
- Analyzes game situation
- Adapts strategy based on threats and resources
- Plays configurable number of games
- Reports tournament statistics

### 3. ChatGPT vs ChatGPT (`claude-vs-chatgpt.ts`)

**Best for:** Competitive AI gameplay between two identical ChatGPT agents

**Features:**
- Two ChatGPT agents competing against each other
- Both use OpenAI API for decision making
- Tournament statistics and win tracking
- Fair head-to-head comparison
- Requires OPENAI_API_KEY

**Run:**
```bash
export OPENAI_API_KEY="sk-..."
npx ts-node claude-vs-chatgpt.ts
```

Or after building:
```bash
export OPENAI_API_KEY="sk-..."
node dist/examples/claude-vs-chatgpt.js
```

**What it does:**
- Creates two ChatGPT agents (ChatGPT-1 and ChatGPT-2)
- Runs them against each other in OpenRA
- Both use the same OpenAI API to decide tactics
- Tracks win count and game statistics
- Reports tournament winner and detailed results

## Prerequisites

1. **Game Server Running**
   ```bash
   cd ./docker-images
   bash run.sh
   ```

2. **Game Content Downloaded**
   ```bash
   cd ./docker-images
   bash load-and-run.sh
   ```

3. **Dependencies Installed**
   ```bash
   npm install
   ```

## Running Agents

### Development (with ts-node)

```bash
# Simple agent
npx ts-node simple-agent.ts

# Advanced agent
npx ts-node advanced-agent.ts
```

### Production (compiled)

```bash
# Build the project
npm run build

# Run agents
node dist/examples/simple-agent.js
node dist/examples/advanced-agent.js
```

## Expected Output

### Simple Agent

```
Simple OpenRA AI Agent (TypeScript)
======================================================================

############################################################
Simple OpenRA Agent - Training Session
############################################################
Games: 3
Max steps per game: 500

Connecting to OpenRA server...
✓ Connected

======================================================================
Episode 1
======================================================================
Resetting game...
Game started!
  Initial units: 2
  Initial buildings: 5

  [Tick 50] Units: 2, Buildings: 5, Credits: 1500
  [Tick 100] Units: 2, Buildings: 5, Credits: 2000

GAME OVER at step 150
  Result: loss
  Total Reward: -50.00

======================================================================
Training Complete
======================================================================
Games completed: 3/3
Time: 285.3s
Average reward: -25.00
```

### Advanced Agent

```
Advanced OpenRA Agent (TypeScript)
======================================================================

######################################################################
Advanced OpenRA Agent - Tournament
######################################################################
Strategy: aggressive
Games: 3
Max steps per game: 300

Connecting to server...
✓ Connected
======================================================================

======================================================================
Episode 1 - Strategy: aggressive
======================================================================
Initializing game...
Game started! Initial state:
  Units: 2
  Buildings: 5
  Credits: 1000

  [Tick 50] Strategy: EARLY | Units: 2 | Buildings: 5 | Credits: 1200 | Threat: 0%
  [Tick 100] Strategy: MID | Units: 3 | Buildings: 5 | Credits: 1500 | Threat: 10%

GAME OVER!
  Step: 150
  Result: loss
  Total Reward: -50.00

======================================================================
Tournament Results
======================================================================
Games completed: 3/3
Time: 285.3s

Rewards: min=-50.00, avg=-25.00, max=10.00
Steps: min=120, avg=150, max=200

Per-game results:
  Game 1: steps=150, reward=-50.00
  Game 2: steps=175, reward=-25.00
  Game 3: steps=200, reward=10.00
```

## Customizing Agents

### Simple Agent

Edit the `decideActions()` method:

```typescript
private decideActions(observation: GameObservation): any[] {
  const units = observation.units || [];
  const buildings = observation.buildings || [];
  const credits = observation.economy?.credits || 0;

  const actions: any[] = [];

  // Your strategy here
  if (credits > 1000) {
    // Build something
    // actions.push({ action: "BUILD", ... });
  }

  return actions;
}
```

### Advanced Agent

Edit the `analyzeSituation()` method to customize strategy transitions:

```typescript
private analyzeSituation(observation: GameObservation): StrategyState {
  const units = observation.units || [];
  const credits = observation.economy?.credits || 0;
  const powerRatio = observation.military?.power_ratio || 0.5;

  // Your logic here
  if (credits > 5000 && units.length > 15) {
    return StrategyState.LATE_GAME;
  }
  // ... more conditions
}
```

Edit `decideActions()` to implement strategy behavior:

```typescript
switch (this.strategyState) {
  case StrategyState.EARLY_GAME:
    // Early game actions
    break;

  case StrategyState.MID_GAME:
    // Mid game actions
    if (credits > 1000) {
      // Build units
    }
    break;

  // ... more cases
}
```

## API Reference

### OpenRARLBridge

The main interface for connecting to the OpenRA server.

```typescript
import { OpenRARLBridge } from "../src/openra-rl-bridge";

// Create bridge
const bridge = new OpenRARLBridge({
  baseUrl: "http://localhost:8000",
  verbose: true,
});

// Connect
await bridge.connect();

// Reset game (start new episode)
const resetResult = await bridge.reset();
const observation = resetResult.observation;

// Take action
const result = await bridge.step(actions);
const { observation, reward, done, info } = result;

// Disconnect
await bridge.disconnect();
```

### Game Observation Structure

```typescript
interface GameObservation {
  tick: number;                    // Current game tick
  episode_id: string | null;       // Game ID
  units: any[];                    // Array of units
  buildings: any[];                // Array of buildings
  economy: {
    credits: number;               // Available credits
    power_usage: number;           // Current power usage
    power_available: number;       // Available power
  };
  military: {
    power_ratio: number;           // Power ratio vs enemy (0-1)
  };
}
```

### Actions Format

```typescript
interface GameAction {
  action: string;          // Action type (MOVE, ATTACK, BUILD, etc.)
  actor_id?: number;       // Unit/building ID
  target?: [number, number]; // Target position
  target_id?: number;      // Target unit/building ID
  // ... more fields depending on action type
}
```

## Troubleshooting

### "Connection refused on localhost:8000"

Make sure server is running:
```bash
cd ./docker-images
bash run.sh
```

### "Could not reset game"

Game content not downloaded:
```bash
cd ./docker-images
bash load-and-run.sh
```

### "Cannot find module" error

Install dependencies:
```bash
npm install
```

### "ts-node: command not found"

Install ts-node globally or use npx:
```bash
npm install -g ts-node
# or
npx ts-node simple-agent.ts
```

## Next Steps

1. Run a simple agent to verify setup works
2. Study the code and understand the game state
3. Customize the `decideActions()` method
4. Run tournaments to compare strategies
5. Integrate agents into your ML pipeline

## Architecture

```
TypeScript Agent
    ↓
OpenRARLBridge (HTTP client)
    ↓
Game Server (localhost:8000)
    ↓
OpenRA Engine
    ↓
Game State & Observations
```

## See Also

- `../src/openra-rl-bridge.ts` — Bridge implementation
- `../src/openra-rl-state-reader.ts` — State reading
- `../src/openra-rl-command-executor.ts` — Command execution
- `../../cli/` — Tournament runner CLI
- `../../tournament-engine/` — Tournament orchestration
