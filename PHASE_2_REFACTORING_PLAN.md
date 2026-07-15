# Phase 2 Refactoring Plan

## Large Files Requiring Refactoring (>450 LOC)

### 1. packages/core/src/brain/ollama-brain.ts (741 LOC)
**Current Structure:**
- Ollama API integration
- Request building
- Response parsing
- Throttling logic
- Error handling

**Refactoring Plan:**
- Extract: `ollama-api-client.ts` (API communication, 200 LOC)
- Extract: `ollama-request-builder.ts` (request construction, 150 LOC)
- Extract: `ollama-response-parser.ts` (response parsing, 150 LOC)
- Keep: `ollama-brain.ts` (orchestration, 241 LOC)
- **Lines saved:** 541 → 241 (67% reduction)

### 2. packages/fake-game-adapter/src/world/fake-world-state.ts (531 LOC)
**Current Structure:**
- World state management
- Player tracking
- Unit management
- Building state
- Technology tree

**Refactoring Plan:**
- Extract: `player-state.ts` (player data, 100 LOC)
- Extract: `unit-manager.ts` (unit tracking, 150 LOC)
- Extract: `building-state.ts` (building data, 150 LOC)
- Keep: `fake-world-state.ts` (coordination, 131 LOC)
- **Lines saved:** 531 → 131 (75% reduction)

### 3. packages/core/src/commentary/match-export.ts (511 LOC)
**Current Structure:**
- Match data export
- JSON serialization
- Metadata handling
- File I/O operations

**Refactoring Plan:**
- Extract: `export-formatter.ts` (JSON formatting, 150 LOC)
- Extract: `export-metadata.ts` (metadata handling, 120 LOC)
- Extract: `export-io.ts` (file operations, 100 LOC)
- Keep: `match-export.ts` (orchestration, 141 LOC)
- **Lines saved:** 511 → 141 (72% reduction)

### 4. packages/core/src/analytics/meta-gaming-trends.ts (503 LOC)
**Current Structure:**
- Trend analysis
- Statistics calculation
- Pattern detection
- Aggregation logic

**Refactoring Plan:**
- Extract: `trend-analyzer.ts` (trend calculations, 150 LOC)
- Extract: `pattern-detector.ts` (pattern logic, 150 LOC)
- Extract: `stats-aggregator.ts` (statistics, 120 LOC)
- Keep: `meta-gaming-trends.ts` (coordination, 83 LOC)
- **Lines saved:** 503 → 83 (84% reduction)

### 5. packages/core/src/analytics/match-comparison.ts (496 LOC)
**Current Structure:**
- Match comparison logic
- Delta calculation
- Report generation
- Statistical analysis

**Refactoring Plan:**
- Extract: `comparison-engine.ts` (comparison logic, 150 LOC)
- Extract: `delta-calculator.ts` (delta math, 150 LOC)
- Extract: `comparison-report.ts` (report formatting, 100 LOC)
- Keep: `match-comparison.ts` (orchestration, 96 LOC)
- **Lines saved:** 496 → 96 (81% reduction)

### 6. packages/core/src/analytics/statistics-analyzer.ts (565 LOC)
**Current Structure:**
- Statistical calculations
- Distribution analysis
- Correlation analysis
- Aggregation

**Refactoring Plan:**
- Extract: `distribution-analyzer.ts` (distributions, 150 LOC)
- Extract: `correlation-analyzer.ts` (correlation math, 150 LOC)
- Extract: `aggregation-engine.ts` (aggregation, 140 LOC)
- Keep: `statistics-analyzer.ts` (coordination, 125 LOC)
- **Lines saved:** 565 → 125 (78% reduction)

---

## Summary

| File | Current | After | Reduction |
|------|---------|-------|-----------|
| ollama-brain.ts | 741 | 241 | 67% |
| fake-world-state.ts | 531 | 131 | 75% |
| match-export.ts | 511 | 141 | 72% |
| meta-gaming-trends.ts | 503 | 83 | 84% |
| match-comparison.ts | 496 | 96 | 81% |
| statistics-analyzer.ts | 565 | 125 | 78% |

**Total Reduction: 3,347 → 817 LOC (76% improvement)**

---

## Refactoring Priority

1. **High Impact:** ollama-brain.ts, statistics-analyzer.ts
2. **Medium Impact:** fake-world-state.ts, match-export.ts
3. **Lower Impact:** meta-gaming-trends.ts, match-comparison.ts

---

## Testing Strategy

1. **Before Refactoring:** Run full test suite (618 tests)
2. **After Each Extraction:** Run related tests to verify no regressions
3. **Final Verification:** Full test suite again (expect 618 passing)
4. **Performance Check:** Ensure no performance degradation

---

## Timeline

- Phase 2A: Refactoring (2-3 days)
- Phase 2B: CI/CD gates (1 day)
- Phase 2C: Final testing (2 hours)
- **Total Phase 2: 4-5 days**
