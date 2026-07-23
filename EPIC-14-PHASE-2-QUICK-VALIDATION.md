# EPIC 14 Phase 2: Quick Validation Test (5 Games)

**Date:** July 22, 2026  
**Task:** Task 6 - Run quick validation with 5 mock games  
**Duration:** ~2 minutes runtime  
**Status:** READY TO RUN

---

## Test Overview

### What This Test Does
1. **Initialize** research integration (creates research.db + schema.sql)
2. **Start experiment** with timestamp metadata
3. **Start run** with arena configuration
4. **Play 5 mock games** via ArenaLoop
5. **Record all data** to SQLite (games, moves, decisions)
6. **Verify persistence** (database queries)
7. **Check integrity** (FK constraints, no orphans)

### Expected Results
- ✅ research.db created in project root
- ✅ 5 games recorded
- ✅ ~125 moves recorded (25 per game average)
- ✅ ~125 decisions recorded (1 per move)
- ✅ Zero orphaned records
- ✅ Foreign key integrity verified
- ✅ Database file created successfully

---

## Running the Test

### Step 1: Start the Arena

```bash
cd /path/to/ai-commander
pnpm chess
```

**Expected Output:**
```
═══════════════════════════════════════════════════
  AI COMMANDER v1.0 — Chess Tournament Platform
═══════════════════════════════════════════════════

🔍 STARTUP DIAGNOSTICS

═══════════════════════════════════════════════════
  Node.js version            v22.x.x
  Ollama connection          ✓ Connected
  Ollama models              2 available
  Stockfish engine           ✓ Available
  Default config             Created: chess-arena-config.json

═══════════════════════════════════════════════════

✅ Arena Ready

🚀 Launching first match...

═══════════════════════════════════════════════════
  Research-Integrated Arena Launching
  Data: research.db
═══════════════════════════════════════════════════
  Press Ctrl+C to stop

[Arena loop runs for ~1-2 minutes with 5 games]

═══════════════════════════════════════════════════
  Arena Loop Complete
═══════════════════════════════════════════════════
  Games played:       5
  Total moves:        ~125
  Avg moves/game:     25
  Elapsed time:       ~60s
  Throughput:         ~300 games/hour
═══════════════════════════════════════════════════

✅ Research data persisted to research.db
   Ready for EPICS 15+ to subscribe to events

⏹️  Shutting down...
✅ Research data flushed and closed
```

**Time:** ~1-2 minutes

### Step 2: Monitor Database Growth (Optional)

In another terminal, watch the database file grow:

```bash
watch -n 1 'ls -lh research.db 2>/dev/null && echo && sqlite3 research.db "SELECT COUNT(*) as games FROM games; SELECT COUNT(*) as moves FROM moves; SELECT COUNT(*) as decisions FROM llm_decisions;"'
```

This shows:
- Database file size growing
- Games table populating
- Moves table populating
- Decisions table populating

### Step 3: Verify Data After Test Completes

After the test finishes, run these queries to verify:

```bash
sqlite3 research.db << 'EOF'

-- Check tables created
.tables

-- Count records
SELECT 'Experiments' as table_name, COUNT(*) as count FROM experiments
UNION ALL
SELECT 'Runs', COUNT(*) FROM runs
UNION ALL
SELECT 'Games', COUNT(*) FROM games
UNION ALL
SELECT 'Moves', COUNT(*) FROM moves
UNION ALL
SELECT 'LLM Decisions', COUNT(*) FROM llm_decisions
UNION ALL
SELECT 'Positions', COUNT(*) FROM positions;

-- Verify FK integrity - games in runs
SELECT COUNT(*) as orphaned_games FROM games WHERE run_id NOT IN (SELECT id FROM runs);

-- Verify FK integrity - moves in games
SELECT COUNT(*) as orphaned_moves FROM moves WHERE game_id NOT IN (SELECT id FROM games);

-- Verify FK integrity - decisions in moves
SELECT COUNT(*) as orphaned_decisions FROM llm_decisions WHERE move_id NOT IN (SELECT id FROM moves);

-- Database integrity check
PRAGMA integrity_check;

-- Show sample game
SELECT * FROM games LIMIT 1;

-- Show sample moves for first game
SELECT * FROM moves LIMIT 3;

-- Show sample decision for first move
SELECT * FROM llm_decisions LIMIT 1;

EOF
```

---

## Success Criteria

### Database Creation
- [ ] research.db file exists in project root
- [ ] File size > 1MB (indicates data written)

### Record Counts
- [ ] experiments table: 1 record
- [ ] runs table: 1 record
- [ ] games table: 5 records
- [ ] moves table: 100-150 records (avg 25/game)
- [ ] llm_decisions table: 100-150 records
- [ ] positions table: some records (deduped FENs)

### Data Integrity
- [ ] Zero orphaned games (all have valid run_id)
- [ ] Zero orphaned moves (all have valid game_id)
- [ ] Zero orphaned decisions (all have valid move_id)
- [ ] All foreign key constraints satisfied
- [ ] Database passes `PRAGMA integrity_check`

### Content Verification
Sample queries should show:
```
Game record: 5 games with white/black models, results
Move records: 100-150 moves with SAN notation, FEN positions
Decision records: 100-150 decisions with prompts/responses
```

---

## Troubleshooting

### Issue: "research.db not found"
**Cause:** Schema file (schema.sql) not in project root  
**Fix:** 
- Copy schema.sql to project root, OR
- Update initialization to point to correct schema path

### Issue: "Ollama connection failed"
**Cause:** Ollama not running  
**Fix:** `ollama serve` in separate terminal

### Issue: "Stockfish not found"
**Cause:** Stockfish not installed  
**Fix:** 
- macOS: `brew install stockfish`
- Linux: `apt-get install stockfish`
- Windows: Download from https://stockfishchess.org

### Issue: Database file created but empty
**Cause:** Stop() called before data flushed  
**Fix:** Ensure graceful shutdown (Ctrl+C) completes properly

### Issue: Orphaned records found
**Cause:** Data wrote in wrong order  
**Fix:** Check wrapper implementation for correct event publishing order

---

## Performance Baseline

For 5-game test:

| Metric | Expected | Acceptable |
|--------|----------|-----------|
| Execution time | 30-90 seconds | < 3 minutes |
| Games recorded | 5 | 5 |
| Moves recorded | 100-150 | 80-200 |
| Decisions recorded | 100-150 | 80-200 |
| Throughput | 200-600 games/hour | > 50 games/hour |
| Database size | 2-10 MB | < 50 MB |

---

## Next Steps After Validation

If all checks pass:
1. ✅ Task 6 complete
2. ⏳ Task 7: Document integration results
3. ⏳ Week 2: Run full validation (100+ games)

If any checks fail:
1. Investigate root cause using database queries
2. Check logs for error messages
3. Verify schema.sql is in correct location
4. Review wrapper implementation
5. Retry test

---

## Expected Output Sample

### Games
```
id                  | run_id | white_model | black_model | result | moves | duration_ms
game-1              | run-1  | mistral     | stockfish   | white  | 25    | 45000
game-2              | run-1  | mistral     | stockfish   | draw   | 28    | 52000
...
```

### Moves
```
id                  | game_id | move_number | color | san  | latency_ms | model_name
move-1-1            | game-1  | 1           | white | e2e4| 125        | mistral
move-1-2            | game-1  | 1           | black | c7c6| 245        | stockfish
...
```

### Decisions
```
id                      | move_id    | model_identifier | tokens_in | tokens_out | status
decision-1-1            | move-1-1   | ollama:mistral   | 150       | 45         | success
decision-1-2            | move-1-2   | ollama:stockfish | 180       | 52         | success
...
```

---

## What This Validates

✅ **Research wrapper** works correctly  
✅ **Event publishing** succeeds  
✅ **Data persistence** to SQLite  
✅ **Batch writing** transparent to caller  
✅ **Foreign key integrity** maintained  
✅ **Schema creation** from template  
✅ **Database operations** under load  
✅ **Graceful shutdown** with data flush  

---

## Time to Next Task

After this test completes successfully:
- ✅ Task 6 complete
- ⏳ Task 7: Document results (30 min)

Then:
- ⏳ Week 2: Full validation (100+ games)
- ⏳ All tests passing verification
- ⏳ Ready for EPICS 15+

---

## File Locations

- **Database:** `./research.db` (created automatically)
- **Schema:** Need to place schema.sql in project root
- **Config:** `./chess-arena-config.json` (created automatically)
- **Logs:** Console output from pnpm chess

---

## Success = Phase 2 Integration Ready

When this test passes, Phase 2 integration is validated and ready for full testing (Week 2).

