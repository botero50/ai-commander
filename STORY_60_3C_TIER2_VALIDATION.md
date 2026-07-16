# Story 60.3C: Tier 2 Validation & CLI Refactoring

**Date**: July 16, 2026  
**Purpose**: Validate and remove 4 CLI-only packages  
**Status**: VALIDATION COMPLETE, READY FOR REMOVAL

---

## Tier 2 Packages (4 Total)

All CLI-only commands — NOT used in core chess game execution.

### Package 1: research-dashboard (294 LOC)
**Usage**: `ai-commander dashboard` command only  
**Import**: Line 21 of cli.ts  
**Function**: ResearchDashboard.generateHTML()  
**Removal**: Delete `dashboard` command from CLI  
**Risk**: LOW (CLI-only, no core dependencies)

### Package 2: experiment-runner (216 LOC)
**Usage**: `ai-commander experiment` command only  
**Import**: Line 20 of cli.ts  
**Function**: ExperimentRunner.runExperiment(), ExperimentRunner.generateReport()  
**Removal**: Delete `experiment` command from CLI  
**Risk**: LOW (CLI-only, no core dependencies)

### Package 3: strategy-analyzer (209 LOC)
**Usage**: `ai-commander analyze` command only  
**Import**: Line 18 of cli.ts  
**Function**: StrategyAnalyzer.generateStrategyReport()  
**Removal**: Delete usage from `analyze` command  
**Risk**: LOW (CLI-only, can replace with JSON output)

### Package 4: replay-player (251 LOC)
**Usage**: `ai-commander analyze` command only  
**Import**: Line 19 of cli.ts  
**Function**: ReplayPlayer.analyze(), ReplayPlayer.generateHTML()  
**Removal**: Delete usage from `analyze` command  
**Risk**: LOW (CLI-only, can replace with JSON output)

---

## CLI Commands to Modify/Remove

### Command 1: `experiment` (Lines 104-118)
**Import Chain**:
```
ai-commander experiment
  → ExperimentRunner.runExperiment()
  → ExperimentRunner.generateReport()
```

**Removal**: Delete entire `experiment` command block

**Impact**: 
- Zero core dependencies
- Zero test dependencies
- experiment-runner package becomes unused

---

### Command 2: `analyze` (Lines 120-143)
**Import Chain**:
```
ai-commander analyze
  → StrategyAnalyzer.generateStrategyReport()  [optional]
  → ReplayPlayer.analyze()
  → ReplayPlayer.generateHTML()
```

**Modification Options**:
- **Option A (Full removal)**: Delete entire `analyze` command
- **Option B (Simplify)**: Keep basic analyze, remove strategy/replay visualization

**Recommended**: Option A (full removal for v1.0)

**Impact**:
- strategy-analyzer becomes unused
- replay-player becomes unused

---

### Command 3: `dashboard` (Lines 145-161)
**Import Chain**:
```
ai-commander dashboard
  → ResearchDashboard.generateHTML()
```

**Removal**: Delete entire `dashboard` command block

**Impact**:
- Zero core dependencies
- Zero test dependencies
- research-dashboard package becomes unused

---

### Command 4: `tournament` (Lines 30-68)
**Import Chain**:
```
ai-commander tournament
  → BrainManager.create()  [CORE]
  → TournamentEngine  [CORE]
  → BenchmarkReporter  [OPTIONAL]
```

**Note**: Tournament command uses `benchmark-reporter` for optional reporting

**Decision**: Keep tournament command (core feature), defer benchmark-reporter refactoring to v1.1

---

## Refactoring Plan

### Phase 1: Delete Optional Commands (15 min)
```typescript
// Remove from cli.ts:
- Entire experiment command (lines 104-118)
- Entire analyze command (lines 120-143)
- Entire dashboard command (lines 145-161)

// Update help text (lines 163-214):
- Remove mentions of experiment, analyze, dashboard
- Keep only: tournament, match, help
```

### Phase 2: Remove Imports (5 min)
```typescript
// Remove from top of cli.ts:
- import { ExperimentRunner } from '@ai-commander/experiment-runner';  [line 20]
- import { StrategyAnalyzer } from '@ai-commander/strategy-analyzer';  [line 18]
- import { ReplayPlayer } from '@ai-commander/replay-player';  [line 19]
- import { ResearchDashboard } from '@ai-commander/research-dashboard';  [line 21]
- import { BenchmarkReporter } from '@ai-commander/benchmark-reporter';  [line 17] — KEEP for now
```

### Phase 3: Delete Packages (5 min)
```bash
rm -rf packages/research-dashboard
rm -rf packages/experiment-runner
rm -rf packages/strategy-analyzer
rm -rf packages/replay-player
```

### Phase 4: Verify (5 min)
```bash
pnpm build      # Should succeed
pnpm chess --help  # Should show chess command only
```

---

## Risk Assessment

| Package | Risk | Reason |
|---------|------|--------|
| research-dashboard | LOW | CLI-only, no core usage |
| experiment-runner | LOW | CLI-only, no core usage |
| strategy-analyzer | LOW | CLI-only, no core usage |
| replay-player | LOW | CLI-only, no core usage |

**Overall Risk**: 🟢 **LOW**

None of these packages are imported by core chess game execution. All are CLI-only.

---

## Updated CLI After Refactoring

**Before** (6 commands):
- tournament (with BenchmarkReporter)
- match
- experiment
- analyze
- dashboard
- help

**After** (3 commands):
- tournament (with BenchmarkReporter)
- match
- help

**Note**: `tournament` and `match` commands remain because they're core to the chess platform.

---

## Remaining Packages

### Core Chess (26 packages) ✓
- Chess game, brains, tournament, broadcasting

### Tier 2 Deferred (14 packages)
- benchmark-reporter (tournament reporting — optional, can keep for now)
- fake-game-adapter (testing)
- profiler, monitor (debug tools)
- scheduler, pool, queue, decision, goals, planner, agent-runtime, plugins, ecs (framework)

**Final count**: 40 packages (down from 44 after Phase 1 removal)

---

## Definition of Done: Story 60.3C

✅ Tier 2 packages identified as CLI-only  
✅ CLI commands documented and removal plan created  
✅ Imports identified and removal strategy defined  
✅ Risk assessment completed (LOW)  
✅ Ready for execution  

---

## Execution Steps

```bash
# Step 1: Remove CLI commands
# Edit packages/cli/src/cli.ts:
#   - Delete experiment command (lines 104-118)
#   - Delete analyze command (lines 120-143)
#   - Delete dashboard command (lines 145-161)
#   - Update help text (remove experiment/analyze/dashboard)
#   - Remove 4 imports from top

# Step 2: Build
pnpm build

# Step 3: Delete packages
rm -rf packages/research-dashboard
rm -rf packages/experiment-runner
rm -rf packages/strategy-analyzer
rm -rf packages/replay-player

# Step 4: Build again
pnpm build

# Step 5: Commit
git commit -m "Remove Tier 2 packages: research-dashboard, experiment-runner, strategy-analyzer, replay-player

Evidence:
- CLI-only packages (no core chess execution usage)
- Commands removed from packages/cli/src/cli.ts
- Zero core dependencies

EPIC 60.3C: Tier 2 removal
Packages: 44 → 40 (-9%)
Risk: LOW
Build: ✓ Succeeds"
```

---

**Status**: 🎯 **STORY 60.3C VALIDATION COMPLETE — READY FOR EXECUTION**

