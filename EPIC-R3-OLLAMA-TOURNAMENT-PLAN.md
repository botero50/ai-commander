# EPIC R3: Ollama vs Ollama Tournament — Implementation Plan

**Status**: PLANNING (awaiting R2.6 validation gate to pass)  
**Target**: Build competitive tournament system using local Ollama models  
**Timeline**: 4-6 hours (3-4 stories)

---

## Overview

After R2.6 validation confirms the RL Interface integration works with real 0 A.D., EPIC R3 will:

1. **Connect Ollama** (local LLM inference server)
2. **Implement decision logic** (WorldState → prompt → model → GameCommand)
3. **Run competitive matches** (multiple Ollama models vs each other)
4. **Analyze results** (which models play better, decision latency, win rates)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         0 A.D. Instance (running with RL Interface)     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP (observed game state)
                     │
┌────────────────────▼────────────────────────────────────┐
│       RL Interface HTTP Client (R2 - already built)     │
│   - POST /reset (initialize match)                      │
│   - POST /step (get observations, send commands)        │
│   - Converts observations → RawGameState                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│       WorldStateMapper (R2 - already built)             │
│   - RawGameState → WorldState (domain types)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│       OllamaAIBrain (R3.1 - NEW)                        │
│   - Implements AIBrain interface                        │
│   - WorldState → LLM prompt (context-aware)             │
│   - LLM inference via Ollama API                        │
│   - Parse LLM response → GameCommand[]                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│       AILoopOrchestrator (R2.5 - already built)         │
│   - Runs complete cycle: Observe → Map → Decide → Exec │
│   - Metrics tracking per tick                           │
│   - Multiple instances for tournament play              │
└─────────────────────────────────────────────────────────┘
```

---

## Story Breakdown

### R3.1: Ollama Brain Implementation (1-2 hours)

**Goal**: Create custom AIBrain that uses Ollama for decision-making

**Requirements**:
- Ollama server running on localhost:11434
- Model selection (e.g., llama2, neural-chat, mistral)
- Prompt engineering (convert WorldState to clear game state description)
- Response parsing (extract commands from LLM output)

**Deliverables**:
- `OllamaAIBrain` class (implements AIBrain interface)
- Prompt templates for game state understanding
- Command parser (LLM text → GameCommand[])
- Unit tests validating brain decisions

**Key File**: `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts`

**Example Implementation**:
```typescript
export class OllamaAIBrain implements AIBrain {
  constructor(
    private modelName: string = 'llama2',
    private ollamaUrl: string = 'http://localhost:11434'
  ) {}

  async decide(worldState: WorldState): Promise<BrainDecision> {
    // 1. Create game state description
    const gameDescription = this.describeGameState(worldState);
    
    // 2. Build prompt
    const prompt = this.buildPrompt(gameDescription);
    
    // 3. Call Ollama
    const response = await this.callOllama(prompt);
    
    // 4. Parse commands from response
    const commands = this.parseCommands(response, worldState);
    
    return {
      playerID: 1,
      commands,
      reasoning: response.substring(0, 200),
      timestamp: new Date(),
    };
  }

  private describeGameState(worldState: WorldState): string {
    return `
      Player Count: ${worldState.players.length}
      Agents: ${worldState.agents.length}
      - Units: ${worldState.agents.filter(a => (a.customData as any).type === 'unit').length}
      - Buildings: ${worldState.agents.filter(a => (a.customData as any).type === 'building').length}
      ...
    `;
  }

  private buildPrompt(gameDescription: string): string {
    return `
      You are an AI playing Age of Empires 2. Analyze the game state and decide on 3-5 strategic commands.
      
      Game State:
      ${gameDescription}
      
      Available Commands:
      - move [unit_ids] to [x, z]
      - attack [unit_ids] target [entity_id]
      - gather [unit_ids] from [entity_id]
      - build [structure_template] at [x, z]
      - research [tech_name] at [building_id]
      
      Decide on the next 3-5 commands. Focus on early expansion and resource gathering.
      Format each command as: "command_type: details"
    `;
  }

  private async callOllama(prompt: string): Promise<string> {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        stream: false,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.response;
  }

  private parseCommands(response: string, worldState: WorldState): GameCommand[] {
    // Parse LLM response into structured commands
    // Validate against available units/buildings
    // Return GameCommand[] ready for execution
    
    const commands: GameCommand[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.includes('move:')) {
        const units = worldState.agents.filter(a => (a.customData as any)?.type === 'unit').slice(0, 3);
        commands.push({
          playerID: 1,
          json_cmd: {
            type: 'Move',
            entities: units.map(u => (u.customData as any)?.entityId).filter(Boolean),
            x: 150,
            z: 150,
            queued: false,
          },
        });
      }
      // ... parse other command types
    }
    
    return commands;
  }
}
```

---

### R3.2: Decision Strategy & Testing (1 hour)

**Goal**: Validate Ollama brain works correctly against real 0 A.D.

**Requirements**:
- Test harness for single brain vs game
- Verify latency is acceptable
- Confirm commands execute
- Test with different Ollama models

**Deliverables**:
- `test-r3-2-ollama-brain.ts` — single brain vs game
- Per-model performance metrics
- Latency tracking (prompt building, LLM inference, parsing)

**Test Procedure**:
```bash
# Ensure Ollama is running
ollama serve

# In another terminal, pull a model
ollama pull llama2

# Run test
node test-r3-2-ollama-brain.js

# Output: metrics showing LLM latency, decision quality
```

---

### R3.3: Tournament Setup & Execution (1.5 hours)

**Goal**: Run competitive matches between different Ollama models

**Requirements**:
- Initialize multiple match instances
- Track player assignments (model1 vs model2)
- Run matches to completion (victory condition)
- Record results

**Deliverables**:
- `TournamentOrchestrator` class
- Match configuration (which models, how many matches)
- Results tracking (win/loss, duration, decision latency)
- `test-r3-3-tournament.ts` — run full tournament

**Example Output**:
```
╔════════════════════════════════════════════════╗
║     OLLAMA VS OLLAMA TOURNAMENT RESULTS        ║
╚════════════════════════════════════════════════╝

Match 1: llama2 vs mistral
  Duration: 450 ticks (12.5 minutes)
  Winner: llama2
  Strategy: Early expansion, aggressive gathering

Match 2: neural-chat vs llama2
  Duration: 380 ticks (10.5 minutes)
  Winner: llama2
  Strategy: Balanced economy, military tech

Summary:
  llama2:      2 wins, 0 losses
  mistral:     0 wins, 1 loss
  neural-chat: 0 wins, 1 loss
```

---

### R3.4: Analysis & Reporting (1 hour)

**Goal**: Analyze tournament results and generate insights

**Requirements**:
- Compare models on: win rate, decision latency, resource efficiency
- Identify decision patterns
- Generate HTML/JSON reports

**Deliverables**:
- Results analysis engine
- Report generation (HTML, JSON, CSV)
- Decision pattern analysis
- ELO rating computation (optional)

---

## Dependencies & Prerequisites

### Before R3 Can Start
- ✅ R2.6 validation gate must pass (confirms RL Interface works)
- Ollama installed locally (download from ollama.ai)
- At least one model pulled: `ollama pull llama2` (takes 5-10 min first time)
- Node.js environment ready

### Ollama Setup
```bash
# Install Ollama (Windows/Mac/Linux)
# From https://ollama.ai/download

# Start Ollama server (runs on localhost:11434)
ollama serve

# Pull initial model (terminal 2)
ollama pull llama2

# Verify it works
curl http://localhost:11434/api/tags
```

### Model Selection for R3
- **llama2** — Good balance, widely used, ~4GB VRAM
- **mistral** — Faster, lighter, good for RTS decisions
- **neural-chat** — Optimized for multi-turn conversations
- **dolphin-mixtral** — Very capable, ~26GB VRAM (if available)

Start with 2-3 models, expand later.

---

## Success Criteria

### R3.1: Ollama Brain
- ✅ Brain connects to Ollama API
- ✅ Prompt building works with various WorldStates
- ✅ Response parsing creates valid GameCommand[]
- ✅ Unit tests pass
- ✅ Latency < 2 seconds per decision (LLM inference)

### R3.2: Decision Strategy Testing
- ✅ Brain makes valid decisions against real 0 A.D.
- ✅ Commands execute without errors
- ✅ Game progresses over 10+ ticks
- ✅ Latency metrics recorded

### R3.3: Tournament Execution
- ✅ Multiple matches run to completion
- ✅ Winner determined correctly
- ✅ Results saved to JSON
- ✅ Tournament summary printed

### R3.4: Analysis & Reporting
- ✅ Win rates computed per model
- ✅ Latency comparison available
- ✅ Reports generated (HTML + JSON)
- ✅ Insights extracted from patterns

---

## Expected Outcomes

**After R3 Complete**:
- First competitive tournament data: Ollama models playing real 0 A.D.
- Proof of concept: LLM-based RTS AI decision-making
- Baseline metrics: latency, win rates, decision quality
- Foundation for future: OpenAI, Claude, Gemini integration

**Example Results** (predicted):
```json
{
  "tournament": "Ollama vs Ollama R3",
  "models": ["llama2", "mistral", "neural-chat"],
  "matches": 9,
  "duration": "45 minutes",
  "results": {
    "llama2": { "wins": 6, "losses": 3, "avgLatency": 1200 },
    "mistral": { "wins": 2, "losses": 7, "avgLatency": 800 },
    "neural-chat": { "wins": 1, "losses": 8, "avgLatency": 1500 }
  }
}
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Ollama slow on system | Matches take too long | Pre-test latency, use smaller models |
| LLM outputs malformed | Commands don't parse | Robust error handling + retry logic |
| Game timeout/crash | Tournament fails | Timeout detection + skip to next match |
| Memory exhaustion | System hangs | Monitor VRAM, limit concurrent matches |
| Model unavailable | Tournament can't run | Bundle model selection + fallback |

---

## Timeline

```
R2.6 Validation (manual):     10 minutes
R3.1 Ollama Brain:            1-2 hours
R3.2 Testing & Strategy:      1 hour
R3.3 Tournament Orchestration: 1.5 hours
R3.4 Analysis & Reporting:    1 hour
─────────────────────────────────────
Total (if sequential):         5-6 hours
```

**Parallel opportunities**:
- Can draft R3.2-R3.4 code while waiting for R2.6 validation
- Unit test OllamaAIBrain without running full tournament

---

## Post-R3 Opportunities

Once Ollama tournament works, expand to:
- **OpenAI/ChatGPT** integration (R4)
- **Claude AI** integration (R4)
- **Google Gemini** integration (R4)
- **Tournament framework** improvements (R5)
- **Advanced strategies** — planning, exploration, economic management (R5)
- **Analysis suite** — decision breakdown, cost tracking, strategy classification (R5)

---

**Status**: Ready to begin after R2.6 validation ✓  
**First Action**: Set up Ollama, pull llama2 model, implement OllamaAIBrain
