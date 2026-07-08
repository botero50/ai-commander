# EPIC 16.1: CLI — Start Match

**Status**: Ready for implementation  
**Goal**: Enable starting a single match from command line

---

## Overview

Implement CLI command to start an Ollama vs Ollama match with configurable parameters.

```bash
ai-commander match start \
  --brain1 "Ollama" \
  --brain2 "Ollama" \
  --max-ticks 5000 \
  --replay-dir ./replays
```

---

## Requirements

### Command Structure

```
ai-commander match start [OPTIONS]
```

### Options

- `--brain1 <name>` - First brain (default: "Ollama")
- `--brain2 <name>` - Second brain (default: "Ollama")
- `--max-ticks <number>` - Maximum ticks (default: 5000)
- `--replay-dir <path>` - Directory to save replays (default: ./replays)
- `--no-window` - Don't launch 0 A.D. window
- `--no-replay` - Don't save replay
- `--verbose` - Enable verbose logging

### Output

- Start match
- Display live progress (ticks, winner detection)
- Save replay to `--replay-dir`
- Show replay path on completion
- Exit with code 0 on success, 1 on failure

### Error Handling

- Validate brain names exist
- Validate `replay-dir` is writable
- Handle Ollama connection failures
- Handle 0 A.D. crashes
- Graceful shutdown on interrupt (Ctrl+C)

### Testing

- Unit tests: Option parsing
- Integration test: Full match execution
- E2E test: Match completes, replay saved

---

## Acceptance Criteria

- [ ] CLI parses all options correctly
- [ ] Match starts successfully
- [ ] Live progress displayed
- [ ] Replay saved to correct directory
- [ ] Exit code 0 on success
- [ ] Exit code 1 on failure
- [ ] Ctrl+C gracefully stops match
- [ ] All errors display helpful messages
- [ ] Help text available (`--help`)

---

## Files to Create

- `packages/zeroad-adapter/src/cli/cli.ts` - Main CLI entrypoint
- `packages/zeroad-adapter/src/cli/commands/match-start.ts` - Match start command
- `packages/zeroad-adapter/src/cli/commands/index.ts` - Command registry
- `packages/zeroad-adapter/src/cli/cli.test.ts`

---

## Related

- Match execution: `runDualBrainMatch()` (src/match/simple-match.ts)
- Replay service: `ReplayService` (src/web/replay-service.ts)
- Brain adapter: `BrainAdapter` (src/match/brain-adapter.js)
