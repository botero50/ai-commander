# Framework Audit & Cleanup Action Plan

## 📊 Audit Summary

**Comprehensive audit of 36 packages (60,000+ LOC) identified:**
- ✅ 20 material quality issues
- ✅ 3 critical blockers
- ✅ 8 quick wins (<2 hours each)
- ✅ 5-week implementation roadmap

---

## 🔴 CRITICAL BLOCKERS (Fix This Week)

### 1. TypeScript `strict: false` Across 12 Packages
- **Impact:** Silent bugs in streaming, analytics, brain logic
- **Files:** 50+ bare `any` types
- **Fix:** Enable strict mode + fix type errors
- **Effort:** 3-4 days
- **Status:** ⏳ PENDING

### 2. 250+ Orphaned .d.ts Files in src/
- **Impact:** Build confusion, IDE failures, doubled source tree
- **Files:** All packages with src/**/*.d.ts
- **Fix:** Delete .d.ts from src/, regenerate on build
- **Effort:** <2 hours
- **Status:** ⏳ PENDING

### 3. zeroad-adapter Reference in Root tsconfig.json
- **Impact:** Build errors, CI/CD failures
- **File:** /tsconfig.json line 18
- **Fix:** Remove reference, verify `tsc --noEmit` succeeds
- **Effort:** 5 minutes
- **Status:** ⏳ PENDING

---

## 🔴 HIGH PRIORITY (Fix Week 1-2)

### 4. Disabled Brain Manager Component
- **Location:** `packages/brain/src/brain-manager.ts.skip`
- **Issue:** Multi-provider selection disabled (112 lines)
- **Fix:** Rename to .ts, add 10+ tests, update exports
- **Effort:** 1 day
- **Status:** ⏳ PENDING

### 5. 22 Packages Without Tests (61% Untested)
- **Priority Tiers:**
  - **P0:** brain-claude, brain-openai, brain-gemini, spring-rts-adapter
  - **P1:** chess-adapter, checkers-adapter
  - **P2:** analytics, reporters (15+ packages)
- **Effort:** 2-3 weeks across phases
- **Status:** ⏳ PENDING

### 6. Bare `any` Types in 40+ Files
- **Locations:** streaming/*.ts, analytics/*.ts, ollama-brain.ts
- **Issue:** Type safety defeated in real-time pipeline
- **Fix:** Create typed interfaces for all streaming messages
- **Effort:** 2-3 days
- **Status:** ⏳ PENDING

### 7. Missing README Files (28/36 Packages)
- **Impact:** Unclear purpose, integration friction, onboarding difficulty
- **Fix:** Create 3-line README per package
- **Effort:** 3-4 days
- **Status:** ⏳ PENDING

---

## 📋 QUICK WINS (Do Today)

### Quick Win #1: Remove zeroad-adapter Reference
```bash
# Remove line 18 from /tsconfig.json
# Verify: tsc --noEmit
```
- **Effort:** 5 minutes
- **Status:** ⏳ PENDING

### Quick Win #2: Delete Orphaned .d.ts Files
```bash
find packages -path "*/src/*.d.ts" -delete
npm run build
```
- **Effort:** <2 hours
- **Status:** ⏳ PENDING

### Quick Win #3: Create .env.example
```bash
cp .env .env.example
# Replace secrets with placeholders
# Add .env to .gitignore
```
- **Effort:** 10 minutes
- **Status:** ⏳ PENDING

### Quick Win #4: Fix Duplicated tsconfig Rule
- **File:** tsconfig.base.json
- **Fix:** Remove duplicate `noImplicitAny: false` on line 16
- **Effort:** 1 minute
- **Status:** ⏳ PENDING

### Quick Win #5: Enable brain-manager.ts
```bash
# Rename packages/brain/src/brain-manager.ts.skip → brain-manager.ts
# Add to packages/brain/src/index.ts exports
```
- **Effort:** 30 minutes (+ test writing)
- **Status:** ⏳ PENDING

### Quick Win #6: Align ESLint & TypeScript Enforcement
- **Files:** eslint.config.js, tsconfig.base.json
- **Fix:** Set both to `error` and `strict: true`
- **Effort:** 1 hour
- **Status:** ⏳ PENDING

### Quick Win #7: Consistency Check Scripts
```bash
# Add to package.json scripts:
npm run depcheck    # Check for unused dependencies
npm run madge       # Detect circular dependencies
npm run type-check  # Verify type safety with strict mode
```
- **Effort:** 1-2 hours
- **Status:** ⏳ PENDING

### Quick Win #8: Create @ai-commander/contracts Package
- **Defines:** Brain, GameAdapter, Observer, TournamentMatch interfaces
- **Enables:** Type-safe dependency contracts across packages
- **Effort:** 1-2 days
- **Status:** ⏳ PENDING

---

## 📅 Implementation Roadmap

### Phase 1: Critical Fixes (Week 1) ⚡
**Goal:** Type safety + build integrity
- [ ] Fix /tsconfig.json reference
- [ ] Enable strict TypeScript (100-200 type fixes)
- [ ] Delete orphaned .d.ts files
- [ ] Create .env.example
- [ ] Create @ai-commander/contracts package
- **Estimated Effort:** 3-4 days
- **Blockers for Phase 2:** None

### Phase 2: Quality Gates (Week 2-3) 🏗️
**Goal:** Test coverage + architecture clarity
- [ ] Re-enable brain-manager.ts + tests
- [ ] P0 test coverage (brain providers, adapters)
- [ ] Integration test suite (50+ tests)
- [ ] Split large files (6 → 15+ files)
- [ ] Add depcheck + madge to CI
- **Estimated Effort:** 2-3 weeks
- **Blockers for Phase 3:** None

### Phase 3: Documentation & Polish (Week 4) 📚
**Goal:** Complete documentation, standardize configs
- [ ] Document all 36 packages
- [ ] Create ARCHITECTURE.md
- [ ] Standardize tsconfig.json (all extend base)
- [ ] Standardize vitest setup per package
- [ ] Fix remaining type issues
- **Estimated Effort:** 1-2 weeks
- **Blockers for Production:** None

---

## 📊 Metrics Before & After

| Metric | Before | Target | Timeline |
|--------|--------|--------|----------|
| TypeScript strict | Disabled | 100% enabled | Week 1 |
| Bare `any` types | 50+ | 0 | Week 1-2 |
| Test coverage | 14/36 (39%) | 36/36 (100%) | Week 2-3 |
| Integration tests | 0 | 50+ | Week 2-3 |
| Documentation | 8/36 (22%) | 36/36 (100%) | Week 4 |
| Circular deps | Unknown | 0 detected | Week 2 |
| Build time | ~60s | <30s (post-cleanup) | Week 1-2 |

---

## 🎯 Success Criteria

### Phase 1 Complete (Day 5-7)
- ✅ `tsc --noEmit` succeeds with no errors
- ✅ All .d.ts files deleted from src/
- ✅ .env.example exists, .env in .gitignore
- ✅ @ai-commander/contracts defines all interfaces
- ✅ Brain + GameAdapter types imported across packages

### Phase 2 Complete (Day 21-28)
- ✅ 36/36 packages have test files
- ✅ 50+ integration tests passing
- ✅ brain-manager.ts re-enabled + tested
- ✅ depcheck + madge detect 0 unused deps, 0 circular refs
- ✅ All large files split into focused modules

### Phase 3 Complete (Day 35-42)
- ✅ All 36 packages have README
- ✅ Root ARCHITECTURE.md documents system
- ✅ All tsconfig.json standardized
- ✅ Remaining type issues fixed
- ✅ vitest runs per-package in isolation

---

## 📂 Detailed Findings by Category

### Dead Code
| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| Disabled brain-manager | packages/brain/src/brain-manager.ts.skip | HIGH | Rename to .ts, add tests |
| Orphaned .d.ts | 250+ files across src/ | CRITICAL | Delete all, regenerate on build |

### Type Safety (40+ Issues)
| Category | Count | Severity | Fix Effort |
|----------|-------|----------|-----------|
| `strict: false` in tsconfig | 12 packages | CRITICAL | 3-4 days |
| Bare `any` types | 50+ instances | HIGH | 2-3 days |
| Missing type imports | 5+ files | MEDIUM | 1-2 days |

### Architecture (6 Issues)
| Issue | Impact | Fix Effort |
|-------|--------|-----------|
| Large mixed-concern files | Hard to test/modify | 2-3 days |
| Unclear Brain/Adapter contracts | Coupling risk | 1-2 days |
| No circular dependency detection | Risk undetected cycles | 1 day |
| Centralized vitest config | Slow feedback loop | 1 day |
| Missing integration tests | Bugs surface at runtime | 1 week |

### Configuration (5 Issues)
| Issue | Location | Fix |
|-------|----------|-----|
| zeroad-adapter reference | /tsconfig.json:18 | Delete line |
| Inconsistent tsconfig | 12 packages | Standardize to extend base |
| Duplicated noImplicitAny | tsconfig.base.json:12,16 | Remove line 16 |
| ESLint/TS mismatch | eslint.config.js + tsconfig | Align to error + strict:true |
| .env/.env.example drift | /.env | Create .env.example |

### Test Coverage (22 Packages)
| Category | Count | Priority | Timeline |
|----------|-------|----------|----------|
| Brain providers | 4 | P0 | 3 days |
| Game adapters | 3 | P1 | 3 days |
| Analytics/reporters | 15 | P2 | 2 weeks |

### Documentation (28 Issues)
| Category | Count | Fix |
|----------|-------|-----|
| Missing README | 28/36 packages | Create 3-line minimal README |
| Missing ARCHITECTURE.md | 1 | Create system overview + diagram |
| Missing JSDoc | 5+ functions | Update to match implementation |

---

## 🚀 Getting Started Today

### Step 1: Quick Wins (30 minutes)
```bash
# 1. Fix tsconfig reference (5 min)
# Edit /tsconfig.json, remove line 18

# 2. Verify build (2 min)
npm run build
tsc --noEmit

# 3. Create .env.example (10 min)
cp .env .env.example
# Replace secrets with placeholders
echo ".env" >> .gitignore

# 4. Fix duplicated rule (1 min)
# Edit tsconfig.base.json, remove line 16 (duplicate noImplicitAny)

# 5. Add scripts to package.json (10 min)
# Add: "depcheck", "madge", "type-check" scripts
```

### Step 2: Enable Strict TypeScript (Day 1-3)
```bash
# Edit tsconfig.base.json
"strict": true
"noImplicitAny": true

# Fix type errors (progressive per package)
npm run type-check

# Update ESLint
# Change no-explicit-any from "warn" to "error"
```

### Step 3: Delete Orphaned Files (Hour 2)
```bash
find packages -path "*/src/*.d.ts" -delete
npm run build
npm run test
```

### Step 4: Create Contracts Package (Day 2-3)
```bash
mkdir packages/contracts/src
# Create: brain.ts, game-adapter.ts, observer.ts, match.ts
# Create package.json, tsconfig.json
# Create index.ts exporting all interfaces
# Import in all packages needing type safety
```

---

## 📈 Expected Outcomes

### After Phase 1 (Week 1)
- ✅ No build errors
- ✅ No reference to deleted packages
- ✅ Type-safe codebase (strict mode)
- ✅ Clear architectural contracts
- ✅ Cleaner git state (no orphaned files)

### After Phase 2 (Week 3)
- ✅ 36/36 packages tested
- ✅ Integration tests catch composition bugs
- ✅ Large files refactored into focused modules
- ✅ CI detects circular dependencies
- ✅ Fast per-package test feedback

### After Phase 3 (Week 4)
- ✅ Every package documented
- ✅ System architecture visible
- ✅ Configuration standardized
- ✅ Framework production-ready
- ✅ Easy to add new games/features

---

## 📝 Notes

- **No breaking changes:** All fixes are additive or refactoring only
- **Backward compatible:** Re-exports maintain current API surface
- **Parallel work:** Phases can overlap (e.g., start P1 test coverage while finishing P0 type fixes)
- **CI gates:** Add type-check, depcheck, madge to CI/CD after Phase 1

---

## 🎯 Next Steps

1. **Today:** Quick wins (30 min - 2 hours)
2. **This week:** Phase 1 critical fixes (3-4 days)
3. **Next 2 weeks:** Phase 2 quality gates (2-3 weeks)
4. **Week 4:** Phase 3 documentation (1-2 weeks)

---

**Audit completed:** Framework is well-structured but needs type safety + test coverage + documentation to be production-ready.

**Estimated total effort:** 4-5 weeks for complete cleanup to production-grade quality.

**Expected result:** Clean, maintainable, testable, documented, multi-game AI tournament framework ready for community contribution.
