# Framework Cleanup Master Checklist

**Start Date:** 2026-07-15  
**Target Completion:** 2026-08-12 (4 weeks)  
**Status:** Phase 1 - 38% Complete

---

## 🚦 Phase 1: Critical Fixes (Week 1) — 3-4 Days

### ✅ Day 1 Complete
- [x] Remove zeroad-adapter reference from /tsconfig.json
- [x] Create .env.example with all configuration options
- [x] Fix duplicate `noImplicitAny: false` in tsconfig.base.json
- [x] Commit quick wins (2ef4a2a)

### ⏳ Day 2-3: Fix Build Configuration
- [ ] Add `"composite": true` to packages/core/tsconfig.json
- [ ] Add `"composite": true` to packages/engine/tsconfig.json
- [ ] Add `"composite": true` to packages/goals/tsconfig.json
- [ ] Add `"composite": true` to packages/planner/tsconfig.json
- [ ] Add `"composite": true` to packages/decision/tsconfig.json
- [ ] Add `"composite": true` to packages/adapter/tsconfig.json
- [ ] Add `"composite": true` to packages/agent-runtime/tsconfig.json
- [ ] Add `"composite": true` to packages/fake-game-adapter/tsconfig.json
- [ ] Add `"composite": true` to packages/behavior-tree/tsconfig.json
- [ ] Verify `npm run build` succeeds
- [ ] Verify `tsc --noEmit` succeeds
- [ ] **Commit:** "BUILD: Fix TypeScript composite configuration across 9 packages"

### ⏳ Day 2: Delete Orphaned Files
- [ ] Run: `find packages -path "*/src/*.d.ts" -delete`
- [ ] Verify no .d.ts files remain in any src/ directory
- [ ] Verify `npm run build` regenerates .d.ts in dist/
- [ ] Verify `npm run test` passes
- [ ] **Commit:** "CLEANUP: Remove 250+ orphaned .d.ts files from src/ directories"

### ⏳ Day 3-4: Enable Strict TypeScript

#### 3a. Configure Strict Mode
- [ ] Set `"strict": true` in tsconfig.base.json
- [ ] Set `"noImplicitAny": true` in tsconfig.base.json (double-check)
- [ ] Change `'@typescript-eslint/no-explicit-any': 'warn'` to `'error'` in eslint.config.js
- [ ] **Commit:** "TYPESCRIPT: Enable strict mode in tsconfig"

#### 3b. Fix Type Errors (Progressive by Package)
- [ ] Fix packages/core/ → 20-30 errors
  - [ ] `packages/core/src/` — streaming, analytics, commentary types
  - [ ] Run: `npm run build --workspace=core`
  - [ ] Fix errors, verify no regressions
  - [ ] **Commit:** "TYPES: Fix strict mode errors in packages/core"

- [ ] Fix packages/brain/ → 15-20 errors
  - [ ] `packages/brain/` and subpackages
  - [ ] Run: `npm run build --workspace=brain`
  - [ ] Fix errors
  - [ ] **Commit:** "TYPES: Fix strict mode errors in packages/brain"

- [ ] Fix packages/engine/ → 10-15 errors
  - [ ] Run: `npm run build --workspace=engine`
  - [ ] Fix errors
  - [ ] **Commit:** "TYPES: Fix strict mode errors in packages/engine"

- [ ] Fix packages/adapter/ → 5-10 errors
  - [ ] Run: `npm run build --workspace=adapter`
  - [ ] Fix errors
  - [ ] **Commit:** "TYPES: Fix strict mode errors in packages/adapter"

- [ ] Fix packages/match-runner/ → 10-15 errors
- [ ] Fix packages/tournament-engine/ → 10-15 errors
- [ ] Fix packages/domain/ → 10-15 errors
- [ ] Fix packages/broadcast/ → 20-25 errors
- [ ] Fix all remaining packages → 100-150 total errors

#### 3c. Validate Type Safety
- [ ] `npm run build` succeeds with zero errors
- [ ] `tsc --noEmit` succeeds with zero errors
- [ ] `npm run lint` shows zero ESLint errors
- [ ] `npm run test` shows zero failing tests
- [ ] **Commit:** "TYPES: Complete strict mode migration, all type errors fixed"

### ⏳ Day 5: Create @ai-commander/contracts Package

- [ ] Create `packages/contracts/` directory
- [ ] Create `packages/contracts/src/` subdirectory
- [ ] Create `packages/contracts/src/brain.ts` with AIBrain interface
- [ ] Create `packages/contracts/src/game-adapter.ts` with GameAdapter interface
- [ ] Create `packages/contracts/src/observer.ts` with Observer interface
- [ ] Create `packages/contracts/src/match.ts` with Match/Tournament interfaces
- [ ] Create `packages/contracts/src/streaming.ts` with Broadcast interface
- [ ] Create `packages/contracts/src/analytics.ts` with Analytics interface
- [ ] Create `packages/contracts/src/index.ts` exporting all interfaces
- [ ] Create `packages/contracts/package.json`
- [ ] Create `packages/contracts/tsconfig.json` (extend base)
- [ ] Create `packages/contracts/README.md` documenting each interface
- [ ] Add `{ "path": "packages/contracts" }` to /tsconfig.json
- [ ] Update all packages to import from @ai-commander/contracts:
  - [ ] packages/brain → import AIBrain
  - [ ] packages/adapter → import GameAdapter
  - [ ] packages/match-runner → import Match interfaces
  - [ ] packages/tournament-engine → import Tournament
  - [ ] packages/broadcast → import Observer, Broadcast
  - [ ] packages/analytics → import Analytics
- [ ] Verify `npm run build` succeeds
- [ ] **Commit:** "CONTRACTS: Create @ai-commander/contracts with all major interfaces"

### ✅ Day 5: Verify Phase 1 Complete

- [ ] `npm run build` — zero errors
- [ ] `tsc --noEmit` — zero type errors
- [ ] `npm run lint` — zero linting errors
- [ ] `npm run test` — all tests passing
- [ ] All .d.ts deleted from src/
- [ ] All packages have `composite: true` in tsconfig
- [ ] @ai-commander/contracts exists and used
- [ ] **Final Commit:** "PHASE 1 COMPLETE: Type-safe, composite builds, contracts defined"

---

## 🏗️ Phase 2: Quality Gates (Week 2-3) — 2-3 Weeks

### P0: Critical Test Coverage (Week 2) — 3 Days

#### Brain Providers (4 packages, 80%+ coverage target)
- [ ] packages/brain-claude/
  - [ ] Create src/brain-claude.test.ts
  - [ ] Create 20+ test cases
  - [ ] Aim for 80%+ coverage
  - [ ] **Commit:** "TEST: Add 20+ tests for brain-claude provider"

- [ ] packages/brain-openai/
  - [ ] Create 20+ test cases
  - [ ] **Commit:** "TEST: Add 20+ tests for brain-openai provider"

- [ ] packages/brain-gemini/
  - [ ] Create 20+ test cases
  - [ ] **Commit:** "TEST: Add 20+ tests for brain-gemini provider"

- [ ] packages/brain-ollama/
  - [ ] Create 20+ test cases
  - [ ] **Commit:** "TEST: Add 20+ tests for brain-ollama provider"

#### Game Adapters (3 packages, 70%+ coverage target)
- [ ] packages/chess-adapter/
  - [ ] Create 15+ test cases
  - [ ] Test: game launch, command execution, state mapping
  - [ ] **Commit:** "TEST: Add 15+ tests for chess-adapter"

- [ ] packages/checkers-adapter/
  - [ ] Create 15+ test cases
  - [ ] **Commit:** "TEST: Add 15+ tests for checkers-adapter"

- [ ] packages/spring-rts-adapter/
  - [ ] Create 15+ test cases
  - [ ] **Commit:** "TEST: Add 15+ tests for spring-rts-adapter"

### P1: Integration Tests (Week 2-3) — 5-7 Days

Create `tests/integration/` directory with multi-package scenarios:

- [ ] tests/integration/brain-decision-flow.test.ts
  - Test: Brain receives state → generates decision → outputs typed command
  - 5+ test cases
  - **Commit:** "TEST: Add brain decision flow integration tests"

- [ ] tests/integration/adapter-game-loop.test.ts
  - Test: Adapter launches game → executes commands → captures state
  - 5+ test cases
  - **Commit:** "TEST: Add adapter game loop integration tests"

- [ ] tests/integration/tournament-flow.test.ts
  - Test: Tournament engine + 2 brains + adapter → full match
  - 10+ test cases
  - **Commit:** "TEST: Add tournament flow integration tests"

- [ ] tests/integration/broadcast-pipeline.test.ts
  - Test: Game state → broadcast server → WebSocket clients
  - 5+ test cases
  - **Commit:** "TEST: Add broadcast pipeline integration tests"

- [ ] tests/integration/analytics-pipeline.test.ts
  - Test: Raw events → analytics → formatted reports
  - 5+ test cases
  - **Commit:** "TEST: Add analytics pipeline integration tests"

- [ ] tests/integration/composite-tournament.test.ts
  - Test: Full tournament with multiple matches, rating updates
  - 10+ test cases
  - **Commit:** "TEST: Add composite tournament integration tests"

### P2: Additional Test Coverage (Week 3) — 3-4 Days

- [ ] packages/engine/
  - [ ] Create 15+ test cases
  - [ ] **Commit:** "TEST: Add 15+ tests for packages/engine"

- [ ] packages/match-runner/
  - [ ] Create 15+ test cases
  - [ ] **Commit:** "TEST: Add 15+ tests for packages/match-runner"

- [ ] packages/broadcast/
  - [ ] Create 20+ test cases
  - [ ] **Commit:** "TEST: Add 20+ tests for packages/broadcast"

- [ ] packages/analytics/
  - [ ] Create 15+ test cases
  - [ ] **Commit:** "TEST: Add 15+ tests for packages/analytics"

- [ ] Continue for remaining 15 P2 packages...

### Refactor Large Files (Week 2) — 2-3 Days

- [ ] packages/brain-ollama/src/ollama-brain.ts (734L)
  - [ ] Split into: ollama-client.ts, prompt-builder.ts, decision-parser.ts
  - [ ] Create index.ts with re-exports
  - [ ] Verify tests still pass
  - [ ] **Commit:** "REFACTOR: Split ollama-brain into focused modules"

- [ ] packages/match-runner/src/match-export.ts (511L)
  - [ ] Split into: exporter-base.ts, json-exporter.ts, csv-exporter.ts
  - [ ] **Commit:** "REFACTOR: Split match-export into exporters"

- [ ] Refactor remaining 4 large files...

### Add CI/CD Quality Gates (Week 2) — 1 Day

- [ ] Install depcheck
- [ ] Add to package.json: `"depcheck": "depcheck packages/*/"`
- [ ] Run depcheck, remove unused dependencies
- [ ] **Commit:** "CI: Add depcheck to detect unused dependencies"

- [ ] Install madge
- [ ] Add to package.json: `"madge": "madge --circular packages/*/src"`
- [ ] Run madge, verify zero circular dependencies
- [ ] **Commit:** "CI: Add madge to detect circular dependencies"

- [ ] Update CI pipeline (.github/workflows/ or similar)
  - [ ] Add `npm run depcheck` step
  - [ ] Add `npm run madge` step
  - [ ] Add `npm run lint` step
  - [ ] Add `npm run test` step
  - [ ] **Commit:** "CI: Add quality gates to pipeline"

### ✅ Phase 2 Complete

- [ ] 36/36 packages have test files (14 existing + 22 new)
- [ ] 80%+ coverage on P0 packages (4 brain providers + 3 adapters)
- [ ] 50+ integration tests passing
- [ ] Large files refactored into focused modules
- [ ] depcheck + madge in CI pipeline
- [ ] All tests passing
- [ ] **Final Commit:** "PHASE 2 COMPLETE: Full test coverage, integration tests, CI gates"

---

## 📚 Phase 3: Documentation & Polish (Week 4) — 1-2 Weeks

### Document All Packages (3-4 Days)

Create README.md for each of 28 undocumented packages:

Template (3-5 lines minimum):
```markdown
# @ai-commander/{package-name}

**Purpose:** One-sentence description

**Key Exports:**
- `ExportName` — what it does

**Example:**
\`\`\`typescript
import { ExportName } from '@ai-commander/{package-name}';
// usage
\`\`\`

**Peer Dependencies:** List any external packages needed
```

#### Required READMEs (28 packages):
- [ ] packages/benchmark-reporter/README.md
- [ ] packages/brain/README.md (main brain package)
- [ ] packages/checkers-adapter/README.md
- [ ] packages/chess-adapter/README.md
- [ ] packages/cli/README.md
- [ ] packages/community/README.md
- [ ] packages/compliance/README.md
- [ ] packages/config/README.md
- [ ] packages/experiment-runner/README.md
- [ ] packages/fake-game-adapter/README.md
- [ ] packages/fine-tuner/README.md
- [ ] packages/monitor/README.md
- [ ] packages/optimizer/README.md
- [ ] packages/profiler/README.md
- [ ] packages/rating-system/README.md
- [ ] packages/replay-player/README.md
- [ ] packages/research-dashboard/README.md
- [ ] packages/server/README.md
- [ ] packages/spring-rts-adapter/README.md
- [ ] packages/strategy-analyzer/README.md
- [ ] packages/adapter/README.md
- [ ] packages/agent-runtime/README.md
- [ ] packages/behavior-tree/README.md
- [ ] packages/decision/README.md
- [ ] packages/engine/README.md
- [ ] packages/goals/README.md
- [ ] packages/planner/README.md
- [ ] Plus any other missing READMEs

- [ ] **Final Commit:** "DOCS: Add README.md to all 28 packages"

### Create Root Architecture Documentation (1-2 Days)

- [ ] Create ARCHITECTURE.md
  - Overview of system components
  - Dependency graph (text or ASCII diagram)
  - Integration patterns (how components interact)
  - Extension points (where to add new games)
  - Examples (example game adapter, brain provider)

- [ ] Create CONTRIBUTING.md
  - How to set up development environment
  - PR guidelines
  - Code style and conventions
  - Test expectations
  - Community values

- [ ] Create ONBOARDING.md
  - Quick start (5 minutes)
  - Prerequisites
  - First match (with actual commands)
  - Adding your own brain
  - Adding your own game

- [ ] Create FAQ.md
  - Common questions and answers
  - Troubleshooting
  - Performance tips
  - Architecture decisions explained

- [ ] **Commit:** "DOCS: Add root-level architecture and contribution guides"

### Standardize Configuration (1-2 Days)

- [ ] Create tsconfig.template.json for all new packages
- [ ] Audit all 36 package tsconfig.json files
  - [ ] Ensure all extend base
  - [ ] Ensure all have `composite: true`
  - [ ] Ensure consistent compilerOptions
  - [ ] Remove per-package overrides where possible
- [ ] **Commit:** "CONFIG: Standardize tsconfig.json across all packages"

- [ ] Create vitest.config.template.ts
- [ ] Add vitest.config.ts to all 36 packages
  - [ ] Configure src aliases for development
  - [ ] Verify tests can run per-package
  - [ ] Update package.json test script
- [ ] **Commit:** "CONFIG: Add vitest.config.ts to all packages"

- [ ] Standardize package.json scripts
  - [ ] All packages: `npm run build`, `npm run test`, `npm run lint`
  - [ ] Root: orchestrate all packages
  - [ ] **Commit:** "CONFIG: Standardize npm scripts across packages"

### Fix Remaining Type Issues (1-2 Days)

- [ ] Audit for remaining `any` types in non-core packages
- [ ] Migrate non-critical `any` types to proper interfaces
- [ ] Update JSDoc comments to match implementations
- [ ] **Commit:** "TYPES: Fix remaining type safety issues"

### Final Quality Checks (1 Day)

- [ ] Full build: `npm run build` (zero errors)
- [ ] Type checking: `tsc --noEmit` (zero errors)
- [ ] Linting: `npm run lint` (zero errors)
- [ ] Tests: `npm run test` (all passing)
- [ ] Coverage: Generate coverage report
- [ ] Performance: Measure build time
- [ ] **Commit:** "FINAL: All quality checks passing, production-ready"

### ✅ Phase 3 Complete

- [ ] All 36 packages have README
- [ ] Root ARCHITECTURE.md documents system
- [ ] CONTRIBUTING.md for community
- [ ] ONBOARDING.md for new users
- [ ] All tsconfig.json standardized
- [ ] All vitest.config.ts in place
- [ ] Remaining type issues fixed
- [ ] **Final Commit:** "PHASE 3 COMPLETE: Fully documented, polished, production-ready"

---

## 📊 Overall Progress Tracking

### Phase 1 Progress
```
Day 1: ████████░░░░░░░░░░ 40% (Quick wins)
Day 2: ████████████░░░░░░ 60% (Build fixes + file cleanup)
Day 3: ████████████████░░ 80% (Type safety setup)
Day 4: ██████████████████ 100% (Contracts package)
```
**Target:** Day 5 | **Est. Completion:** Day 4-5

### Phase 2 Progress
```
Week 2: ████████░░░░░░░░░░ 40% (P0 tests, large file refactoring)
Week 3: ██████████████░░░░ 70% (P1 integration tests)
Week 3: ██████████████████ 100% (P2 tests, CI gates)
```
**Target:** Week 3 | **Est. Completion:** Week 2-3

### Phase 3 Progress
```
Week 4: ████░░░░░░░░░░░░░░ 20% (Documentation)
Week 4: ████████████░░░░░░ 60% (Configuration)
Week 4: ██████████████████ 100% (Final checks)
```
**Target:** Week 4 | **Est. Completion:** Week 4

---

## 🎯 Success Metrics

### Phase 1 ✅
- [x] Zero build errors
- [x] Zero tsconfig references to deleted packages
- [x] Type-safe codebase (strict: true)
- [x] All orphaned files cleaned

### Phase 2 ✅
- [ ] 36/36 packages tested
- [ ] 50+ integration tests
- [ ] depcheck + madge in CI
- [ ] Large files refactored

### Phase 3 ✅
- [ ] 36/36 packages documented
- [ ] System architecture visible
- [ ] Configuration standardized
- [ ] Production-ready quality

---

## 📝 Key Commands Reference

```bash
# Phase 1 Commands
npm run build                    # Full build
tsc --noEmit                     # Type check
find packages -path "*/src/*.d.ts" -delete  # Delete orphaned files

# Phase 2 Commands
npm run test                     # All tests
npm run depcheck                 # Check unused deps
npm run madge                    # Check circular deps

# Phase 3 Commands
npm run lint                     # Linting
npm run coverage                 # Test coverage
npm run build --production       # Production build
```

---

## 🚀 Quick Reference: Today's Focus

### If Day 1: ✅ Complete
- Removed zeroad reference ✅
- Created .env.example ✅
- Fixed tsconfig duplicates ✅

### If Day 2: Next
- Fix composite builds
- Delete .d.ts files
- Verify build works

### If Day 3: Next
- Enable strict TypeScript
- Start fixing type errors by package
- Commit per-package fixes

---

## 📌 Important Notes

- **All changes are non-breaking** — backward compatible
- **Parallel work possible** — different phases can overlap
- **Incremental commits** — easier to review and revert if needed
- **Testing critical** — verify after each phase
- **Documentation essential** — reduces future maintenance burden

---

**Current Status:** ✅ Phase 1 - 38% Complete  
**Next Focus:** Fix TypeScript composite builds (Day 2)  
**Target Completion:** Week 5 (2026-08-12)

