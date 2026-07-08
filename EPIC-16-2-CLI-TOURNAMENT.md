# EPIC 16.2: CLI — Tournament

**Status**: Ready for implementation  
**Goal**: Enable running tournaments from command line

---

## Overview

Implement CLI command to run round-robin tournaments with multiple brains.

```bash
ai-commander tournament run \
  --brains "Ollama,Claude,GPT" \
  --format round_robin \
  --replay-dir ./tournament-replays
```

---

## Requirements

### Command Structure

```
ai-commander tournament run [OPTIONS]
ai-commander tournament status <tournament-id>
ai-commander tournament list
```

### Run Command Options

- `--brains <names>` - Comma-separated brain names (required)
- `--name <name>` - Tournament name (default: auto-generated timestamp)
- `--format <format>` - Tournament format: `round_robin` or `single_elimination` (default: round_robin)
- `--max-ticks <number>` - Max ticks per match (default: 5000)
- `--replay-dir <path>` - Directory to save replays (default: ./tournament-replays)
- `--parallel <n>` - Run N matches in parallel (default: 1)
- `--no-replay` - Don't save replays
- `--verbose` - Enable verbose logging

### Status Command

- Display tournament progress
- Show current rankings
- List completed matches
- Estimate time remaining

### List Command

- Show all tournaments
- Show completion status
- Show winner for completed tournaments

### Output

- Real-time progress updates
- Leaderboard after each match
- Final rankings with ELO ratings
- Tournament summary on completion

### Error Handling

- Validate brain names
- Handle concurrent execution safely
- Resume interrupted tournament
- Clear error messages

### Testing

- Unit tests: Option parsing, tournament scheduling
- Integration test: Full tournament execution
- E2E test: Multi-brain tournament completes

---

## Acceptance Criteria

- [ ] Tournament options parse correctly
- [ ] Tournament scheduling works (round-robin, single-elimination)
- [ ] Matches execute sequentially
- [ ] Replays saved for all matches
- [ ] Leaderboard updates correctly
- [ ] ELO ratings calculated
- [ ] Tournament status saved
- [ ] Resume interrupted tournament
- [ ] Help text available

---

## Files to Create

- `packages/zeroad-adapter/src/cli/commands/tournament-run.ts`
- `packages/zeroad-adapter/src/cli/commands/tournament-status.ts`
- `packages/zeroad-adapter/src/cli/commands/tournament-list.ts`
- `packages/zeroad-adapter/src/cli/tournament-state.ts` - Tournament state persistence
- `packages/zeroad-adapter/src/cli/cli.test.ts`

---

## Related

- Tournament runner: `TournamentRunner` (src/tournament/tournament-runner.ts)
- ELO rating: `EloRating` (src/tournament/elo-rating.ts)
- Replay service: `ReplayService` (src/web/replay-service.ts)
