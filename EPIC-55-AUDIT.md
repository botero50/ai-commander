# EPIC 55, Story 55.1 — Execution Path Audit

## Summary

The current execution path is **100% simulated**. Real 0 A.D., RL Interface, and Ollama integrations exist but are bypassed by RealMatchLauncher.

## Simulation vs Reality

### **RealMatchLauncher (SIMULATED)**
- Lines 106-171: Hard-coded synthetic match execution
- Fake observations: `Math.random()` game state with random resources, units, buildings
- Fake AI decisions: Random confidence scores, hardcoded reasoning
- Fake commands: Toggle between 'build' and 'train' based on tick modulo
- Fake winner: `Math.random() > 0.5` coin flip

### **Real Components (Unused)**
- **GameProcessManager**: Spawns actual 0 A.D. executable with `child_process.spawn()`
- **IPCConnection**: Creates TCP socket to RL Interface at `localhost:6379`
- **ObservationProvider**: Polls real game state via IPC: `get_state`
- **StateExtractor**: Parses real game state (units, buildings, resources, players)
- **ZeroADCommandExecutor**: Injects commands into running game via IPC
- **LiveMatchRunner**: Orchestrates the complete real match (exists but never called)

### **Staging Components (Real)**
- **SessionEventBus**: Records events (input data is simulated, but recording is real)
- **SessionTimeline**: Records timestamps accurately
- **SessionRecorder**: Writes session JSON to disk (real file I/O)
- **DemoArtifacts**: Transforms session data to artifacts
- **DemoReport**: Analyzes and reports on data

## Replacement Order (EPIC 55)

1. **Story 55.2**: Replace RealMatchLauncher with actual 0 A.D. execution
2. **Story 55.3**: Run complete real match and validate
3. **Story 55.4**: Record real match with replay + artifacts

## Commit Status

- DONE: Story 55.1 (Audit Report)
- NEXT: Story 55.2 (Replace RealMatchLauncher → Use GameProcessManager)

---

**The mission is clear:** Wire RealMatchLauncher to call GameProcessManager instead of generating synthetic data.

When this is done, launchMatch() will actually spawn 0 A.D., connect to RL Interface, run real matches, and produce real artifacts.

That's where the first playable match comes from.
