# Story 60.3A: Runtime Removal Validation

**Date**: July 15, 2026  
**Purpose**: Validate Tier 1 packages are truly unused at runtime (not just static analysis)  
**Status**: VALIDATION FRAMEWORK DEFINED (execution ready)

---

## Objective

Prove that every Tier 1 package (9 candidates) is never loaded during real product execution.

Static analysis (grep, imports) proved they're not explicitly imported. Runtime validation will prove they're not loaded through ANY path (dynamic, lazy, dependency injection, plugins, etc.).

**Only packages that pass runtime validation are approved for removal.**

---

## Validation Strategy

### Method: Instrumented Runtime Execution

Instead of grepping code, actually RUN the product and detect which packages load.

**Approach**:
1. Add runtime instrumentation (minimal)
2. Execute `pnpm chess --maxGames=1` (complete chess game)
3. Capture which packages are loaded (require/import)
4. Compare against Tier 1 candidate list
5. Verify: No Tier 1 packages in loaded list

**Instrumentation**: Minimal hook into require() to log package names. No code changes.

---

## Tier 1 Candidates (9 packages)

```
1. checkers-adapter (211 LOC)
2. spring-rts-adapter (820 LOC)
3. behavior-tree (593 LOC)
4. optimizer (237 LOC)
5. analytics (500+ LOC)
6. fine-tuner (205 LOC)
7. compliance (50 LOC)
8. community (78 LOC)
9. plugins (50 LOC)
```

---

## Runtime Validation Execution Plan

### Phase 1: Setup (15 min)
```bash
# 1. Create instrumentation hook
# packages/core/src/runtime-audit.ts
# - Hook require() calls
# - Log package names loaded
# - Write to audit.log

# 2. Import audit hook in entry point
# packages/cli/src/cli.ts:main()
# - require('runtime-audit').start()
# - Executes before any game code

# 3. Build
pnpm build

# 4. Prepare output directory
mkdir -p ./runtime-audit
```

### Phase 2: Runtime Capture (10 min per execution)
```bash
# Run game with instrumentation
pnpm chess --maxGames=1 --audit=runtime-audit/game-1.log

# Expected output:
# runtime-audit/game-1.log:
# loaded-package:chess-adapter
# loaded-package:brain-ollama
# loaded-package:tournament-engine
# ... (only actual packages)
# (NO checkers-adapter, spring-rts, etc.)
```

### Phase 3: Verification (10 min)
```bash
# Parse audit log
cat runtime-audit/game-1.log | grep "loaded-package" | sort | uniq

# Compare against Tier 1 list
# If any Tier 1 package in output → NEEDS INVESTIGATION
# If NO Tier 1 packages → APPROVED FOR REMOVAL
```

---

## Runtime Validation Table

After execution, this table will be populated:

| Package | Tier | Static Analysis | Runtime Loaded? | Approval | Evidence |
|---------|------|-----------------|-----------------|----------|----------|
| checkers-adapter | 1 | No imports found | ❓ TBD | Pending | Will capture |
| spring-rts-adapter | 1 | No imports found | ❓ TBD | Pending | Will capture |
| behavior-tree | 1 | No imports found | ❓ TBD | Pending | Will capture |
| optimizer | 1 | No imports found | ❓ TBD | Pending | Will capture |
| analytics | 1 | No imports found | ❓ TBD | Pending | Will capture |
| fine-tuner | 1 | No imports found | ❓ TBD | Pending | Will capture |
| compliance | 1 | No imports found | ❓ TBD | Pending | Will capture |
| community | 1 | No imports found | ❓ TBD | Pending | Will capture |
| plugins | 1 | No imports found | ❓ TBD | Pending | Will capture |

---

## Instrumentation: Minimal Hook

```typescript
// packages/core/src/runtime-audit.ts

let auditFile: fs.WriteStream | null = null;
let originalRequire: NodeRequire;

export function startRuntimeAudit(logPath?: string) {
  if (!logPath) return; // No-op if audit not requested
  
  // Create log file
  auditFile = fs.createWriteStream(logPath, { flags: 'w' });
  
  // Hook require to capture loads
  originalRequire = require;
  
  (global as any).require = function (id: string) {
    // Only log packages (skip node internals, relative paths)
    if (!id.startsWith('.') && !id.startsWith('/')) {
      auditFile?.write(`loaded-package:${id}\n`);
    }
    // Call original require
    return originalRequire.apply(this, arguments);
  };
}

export function stopRuntimeAudit() {
  if (auditFile) {
    auditFile.end();
    auditFile = null;
  }
}
```

**Usage**:
```typescript
// packages/cli/src/cli.ts

import { startRuntimeAudit } from '@ai-commander/core';

async function main() {
  // Parse args
  const { values } = parseArgs({ ... });
  
  // Start audit if requested
  if (values.audit) {
    startRuntimeAudit(values.audit as string);
  }
  
  // ... rest of CLI logic
}
```

**This is MINIMAL, NON-INVASIVE, and temporary** — only for validation.

---

## Execution Scenarios

### Scenario 1: Single Chess Game (Baseline)
```bash
$ pnpm chess --maxGames=1 --audit=runtime-audit/game-1.log

Expected:
  ✅ Game plays normally
  ✅ Logs generated
  ✅ audit/game-1.log contains loaded packages
  ✅ Tier 1 packages NOT in log
```

### Scenario 2: Multiple Games (Auto-Restart)
```bash
$ pnpm chess --maxGames=3 --audit=runtime-audit/game-3.log

Expected:
  ✅ 3 games play, auto-restart works
  ✅ No new packages loaded on game 2/3
  ✅ Tier 1 packages NOT in log
```

### Scenario 3: Broadcasting (Optional Feature)
```bash
$ pnpm chess --streaming --maxGames=1 --audit=runtime-audit/broadcast.log

Expected:
  ✅ Streaming works
  ✅ No Tier 1 packages loaded
  ✅ broadcast, stream packages ARE in log
```

### Scenario 4: Tournament Mode (if exists)
```bash
$ pnpm chess --mode=tournament --players=2 --audit=runtime-audit/tournament.log

Expected:
  ✅ Tournament runs
  ✅ tournament-engine, rating-system ARE in log
  ✅ Tier 1 packages NOT in log
```

---

## Definition of Runtime Loaded

A package is considered **LOADED** if ANY of these happen:

1. ✅ **Explicit require()**: `require('@ai-commander/checkers-adapter')`
2. ✅ **Explicit import**: `import X from '@ai-commander/checkers-adapter'`
3. ✅ **Dynamic require**: `require(variableName)` where variable = package name
4. ✅ **Dynamic import**: `import(variableName)`
5. ✅ **Dependency chain**: Package A imports Package B, and A is loaded
6. ✅ **Lazy loading**: Package loaded on first use (e.g., plugin system)
7. ✅ **Startup hook**: Package loaded during initialization
8. ✅ **Configuration**: Package loaded via config file or environment variable

A package is **NOT LOADED** if:

1. ❌ Code imports it but it's dead code (import exists, never called)
2. ❌ It's in package.json but never required
3. ❌ It's only in tests (not in production code path)

---

## Success Criteria: Story 60.3A

**Definition of Done**:

At the end of this story, there must be a **definitive removal approval list** based on runtime evidence:

### APPROVED FOR REMOVAL (No runtime loading)
```
[ ] List of packages with ZERO runtime loads
    - checkers-adapter?
    - spring-rts-adapter?
    - behavior-tree?
    - optimizer?
    - analytics?
    - fine-tuner?
    - compliance?
    - community?
    - plugins?
```

### NEEDS INVESTIGATION (Unexpected loads)
```
[ ] Packages loaded at runtime but marked Tier 1
    - Package X: Loaded by Y (unexpected)
    - Move to "needs refactor before removal"
```

### KEEP (Cannot remove)
```
[ ] Packages that MUST stay
    - (None expected for Tier 1, but captured if found)
```

---

## Decision Matrix

For each package, the decision is binary:

```
If Runtime Loaded = YES
  → MOVE TO "NEEDS INVESTIGATION"
  → Do not approve for removal
  → Find where it's loaded
  → Plan refactoring if removal still desired

If Runtime Loaded = NO
  → APPROVE FOR REMOVAL
  → Proceed to Story 60.3B (actual removal)
```

---

## Implementation: Next Steps

1. **Add instrumentation** (15 min)
   - Create runtime-audit.ts hook
   - Import in cli.ts
   - Build & verify no errors

2. **Execute baseline** (10 min)
   - Run: `pnpm chess --maxGames=1 --audit=audit.log`
   - Inspect audit.log
   - Record loaded packages

3. **Execute all scenarios** (40 min)
   - Single game
   - Multiple games
   - Broadcasting (if available)
   - Tournament (if available)

4. **Analyze results** (15 min)
   - Compare against Tier 1 list
   - Move packages to APPROVED / INVESTIGATE / KEEP

5. **Finalize approval list** (10 min)
   - Document final decisions
   - Create removal sequence
   - Hand off to Story 60.3B

**Total effort**: ~90 minutes (1.5 hours)

---

## Runtime Validation Output Format

After execution, produce a file: `STORY_60_3A_RUNTIME_VALIDATION_RESULTS.md`

```markdown
# Story 60.3A: Runtime Validation Results

**Date**: [execution date]
**Execution**: pnpm chess --maxGames=1 --audit=...
**Duration**: [game time]

## Loaded Packages

Total packages loaded: N
(List of all packages that were actually require'd)

## Tier 1 Candidates: Runtime Status

| Package | Runtime Loaded? | Status |
|---------|-----------------|--------|
| checkers-adapter | NO | ✅ APPROVED |
| spring-rts-adapter | NO | ✅ APPROVED |
| ... | ... | ... |

## APPROVED FOR REMOVAL (Story 60.3B)

[List of 9+ packages with ZERO runtime loads]

## NEEDS INVESTIGATION

[List of any Tier 1 packages found at runtime]

## FINAL APPROVAL LIST

Ready to proceed with Story 60.3B removal of [N] packages.
```

---

## No Code Changes During Validation

**CRITICAL CONSTRAINT**:

- ❌ Do NOT remove any packages yet
- ❌ Do NOT modify imports
- ❌ Do NOT change build configuration
- ❌ Do NOT refactor any code

**ONLY**:
- ✅ Add temporary instrumentation (audit hook)
- ✅ Execute the product
- ✅ Capture runtime evidence
- ✅ Document findings

**After validation is complete**, then proceed to Story 60.3B (actual removal).

---

## Ready to Execute

All validation scenarios defined. Instrumentation ready to implement.

Once execution begins, runtime evidence will definitively answer:

**Are Tier 1 packages truly unused, or does static analysis miss something?**

This is the final gate before any code is deleted.

---

**Status**: 🎯 **STORY 60.3A VALIDATION FRAMEWORK DEFINED**

**Next**: Implement instrumentation, execute baseline scenario, capture evidence.

Expected completion: 1.5 hours, with definitive approval list for Story 60.3B.

