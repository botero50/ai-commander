# OpenRA Integration Design

## Investigation Summary

### What Exists

1. **OpenRA-RL Package** (Python)
   - Already installed in miniconda
   - Provides HTTP API for OpenRA state and commands
   - Runs as service (Docker container or local)
   - Listens on `http://localhost:8000` by default

2. **OpenRA-RL Integration Host** (TypeScript)
   - File: `apps/reference/src/openra-rl-integration-host.ts`
   - Manages HTTP communication with OpenRA-RL service
   - Provides callbacks:
     - `gameStateAccessor()`: Get live game state
     - `orderSubmitter(order)`: Send commands
     - `stateChecker()`: Verify state changes

3. **OpenRA Mission Agent** (TypeScript)
   - File: `apps/reference/src/openra-mission-agent.ts`
   - Demonstrates complete autonomous execution
   - Uses integration host callbacks
   - Tracks execution trace and metrics

4. **OpenRA Adapter Package** (TypeScript)
   - 21 modules already implemented
   - Mock StateReader (returns test data)
   - Full tournament framework
   - Currently NOT wired to real game

### Architecture Flow

```
AI Commander Tournament
        ↓
DemoOrchestrator
        ↓
SingleMatchRunner / MultiMatchRunner / TournamentEngine
        ↓
MatchOrchestrator (needs real integration here)
        ↓
StateReader (currently MOCK - needs OpenRA-RL)
        ↓
WorldMapper / CommandExecutor / Validators
        ↓
LLM Providers (Claude, GPT-4, etc)
```

### What APIs Exist in OpenRA-RL

Based on code inspection:

**Status Endpoint**
```
GET /status
Response: {
  status: 'ready' | 'connecting' | 'error',
  timestamp: number,
  message?: string
}
```

**Observation Endpoint**
```
GET /observation
Response: {
  state: {
    world: {
      tick: number,
      actors: Array<Actor>,
      players: Array<Player>,
      map: Map
    },
    orderManager: {...},
    modData: {...}
  }
}
```

**Step/Order Endpoint**
```
POST /step
Body: order (command to execute)
Response: {
  success: boolean,
  timestamp: number,
  data?: any
}
```

### Integration Path

**Minimum viable bridge:**

1. **Real StateReader** 
   - Replace mock with HTTP client to OpenRA-RL
   - Endpoint: `/observation`
   - Transform response to `OpenRAGameState`

2. **Real CommandExecutor**
   - Transform Brain commands to OpenRA-RL orders
   - Endpoint: `/step`
   - Verify state changes

3. **Connection Manager**
   - Health checks
   - Retry logic
   - Service startup verification

### Design Decision: Reuse vs Replace

**Option A: Wrapper approach (CHOSEN)**
- Keep existing OpenRAIntegrationHost in reference app
- Create new adapter bridge in openra-adapter package
- Bridge converts between OpenRA-RL API and AI Commander interfaces
- Minimal coupling, clear separation of concerns

**Option B: Direct HTTP**
- Remove openra-rl-integration-host dependency
- Add HTTP client directly to StateReader
- Simpler but less tested

**Chosen: Option A** - Leverage existing integration host which is already tested and documented.

## Integration Implementation Plan

### Phase 1: Real StateReader (Story A)
- Create `openra-rl-state-reader.ts`
- Implement HTTP calls to OpenRA-RL `/observation`
- Transform response to OpenRAGameState
- Add service health checks

### Phase 2: Real CommandExecutor (Story B)
- Create `openra-rl-command-executor.ts`
- Transform AI Commander commands to OpenRA-RL orders
- Implement HTTP calls to `/step`
- Verify state changes

### Phase 3: Connection Bridge (Story C)
- Create `openra-rl-bridge.ts`
- Initialize StateReader and CommandExecutor
- Manage service lifecycle
- Wire into MatchOrchestrator

### Phase 4: Integration Test (Story D)
- Replace mock adapters in MatchOrchestrator
- Run single match against real OpenRA
- Verify:
  1. Observe live state
  2. Execute one command
  3. Verify world changed
  4. Repeat

## Code Changes Required

### File: `packages/openra-adapter/src/openra-rl-state-reader.ts` (NEW)
```typescript
export class OpenRAStateReaderRL {
  constructor(private baseUrl: string = 'http://localhost:8000') {}
  
  async getGameState(): Promise<OpenRAGameState>
  async checkServiceHealth(): Promise<boolean>
}
```

### File: `packages/openra-adapter/src/openra-rl-command-executor.ts` (NEW)
```typescript
export class OpenRACommandExecutorRL {
  constructor(private baseUrl: string = 'http://localhost:8000') {}
  
  async executeCommand(command: OpenRACommand): Promise<CommandValidationResult>
  async verifyStateChange(beforeState: OpenRAGameState, afterState: OpenRAGameState): Promise<boolean>
}
```

### File: `packages/openra-adapter/src/match-orchestrator.ts` (MODIFY)
- Add flag to enable real OpenRA mode
- Replace mock StateReader with real one when flag is set
- Keep existing structure intact

### File: `packages/openra-adapter/src/index.ts` (MODIFY)
- Export new real reader/executor classes
- Add factory functions for easy initialization

## Dependencies

**Already satisfied:**
- `@ai-commander/openra-adapter` (all types defined)
- HTTP client (Node.js built-in `fetch`)
- Error handling infrastructure

**Need to verify:**
- OpenRA-RL service availability
- Response format compatibility
- Command format compatibility

## Success Criteria

1. ✅ Observe live OpenRA match state
2. ✅ Send one real command to OpenRA
3. ✅ Verify world changed accordingly
4. ✅ Run full tournament loop
5. ✅ Generate reports from real matches

## Timeline

- Phase 1 (Real StateReader): ~30 min
- Phase 2 (Real CommandExecutor): ~30 min  
- Phase 3 (Connection Bridge): ~20 min
- Phase 4 (Integration Test): ~20 min

**Total: ~2 hours for full integration**

## Risk Assessment

**Low Risk**
- OpenRA-RL API is documented and tested
- Existing code already uses it successfully
- AI Commander interfaces are frozen (no changes)
- Can run in parallel with mock (feature flag)

**Mitigation**
- Keep mock adapters for fallback
- Add comprehensive error handling
- Health checks before match execution
- Detailed logging for debugging
