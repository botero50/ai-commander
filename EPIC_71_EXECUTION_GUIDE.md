# EPIC 71: Product Proof - Execution Guide

**For Running on Your Local Machine with Ollama**

---

## PREREQUISITES

Before you start, verify you have:

```bash
# Check Node.js version (need 22.0.0+)
node --version

# Check Ollama is running
curl http://localhost:11434/api/tags

# Check for required models
ollama list
```

You need these Ollama models:
- `mistral` (for White player)
- `neural-chat` (for Black player)

If missing, install them:
```bash
ollama pull mistral
ollama pull neural-chat
```

---

## STORY 71.1: Clean Machine Startup (30 minutes)

**Objective**: Verify `npm run chess` works from scratch

### Step 1: Prepare Clean Environment
```bash
# Create a fresh directory
mkdir -p ~/test-ai-commander
cd ~/test-ai-commander

# Fresh clone
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
```

### Step 2: Install Dependencies
```bash
npm install
```

**Record**: Screenshot of successful install

### Step 3: Run the Startup
```bash
npm run chess
```

**What Should Happen**:
- ✅ Clear screen with banner
- ✅ Node.js version check
- ✅ Ollama connection check
- ✅ Ollama models check (mistral, neural-chat)
- ✅ Stockfish check (optional, can skip)
- ✅ Config creation
- ✅ "Arena ready to start" message
- ✅ Browser opens to broadcast
- ✅ First game starts automatically

**Evidence to Collect**:
1. Screenshot: Fresh clone directory
2. Screenshot: `npm install` output
3. Screenshot: Startup checks all passing
4. Screenshot: Browser opening with broadcast
5. Screenshot: First move displayed
6. Screenshot: Winner announced
7. Console output: Complete startup log

**Success Criteria**:
- ✅ Zero errors
- ✅ Zero manual interventions
- ✅ Browser opens automatically
- ✅ First move appears within 5 seconds
- ✅ Winner announced
- ✅ System automatically starts next match

---

## STORY 71.2: 20 Complete Games (2 hours)

**Objective**: Prove Ollama integration works for 20 games without failures

### Step 1: Run Tournament Mode
```bash
npm run chess -- --mode tournament --games 20
```

Or if that doesn't work, create a tournament script:

```bash
# Create tournament-runner.js
cat > tournament-runner.js << 'EOF'
import { ChessArena } from './arena.js';

const arena = new ChessArena();
await arena.runTournament({
  mode: 'tournament',
  games: 20,
  whiteModel: 'mistral',
  blackModel: 'neural-chat',
  collectMetrics: true,
  exportPGN: true,
});
EOF

node tournament-runner.js
```

### Step 2: Collect Metrics

**During the run**, record every 5 games:
```
Game #5:  Winner: [WHITE/BLACK/DRAW], Duration: [sec], Moves: [count], Latency: [ms]
Game #10: Winner: [WHITE/BLACK/DRAW], Duration: [sec], Moves: [count], Latency: [ms]
Game #15: Winner: [WHITE/BLACK/DRAW], Duration: [sec], Moves: [count], Latency: [ms]
Game #20: Winner: [WHITE/BLACK/DRAW], Duration: [sec], Moves: [count], Latency: [ms]
```

### Step 3: Collect Evidence

**After all 20 games complete**, collect:

```bash
# Export all PGNs
ls -la *.pgn | wc -l  # Should be 20

# Check for any errors in logs
grep -i error logs/* 2>/dev/null | wc -l  # Should be 0

# Get memory usage stats
# On Windows: wmic OS get TotalVisibleMemorySize,FreePhysicalMemory
# On Mac/Linux: free -h

# Verify all 20 PGNs are valid
for f in *.pgn; do echo $f; head -20 $f; done
```

**Evidence to Collect**:
1. CSV file: All 20 game results with winner, duration, moves, latency
2. PGN files: All 20 complete games (verify each has valid PGN format)
3. Console log: Complete output from all 20 games
4. Memory graph: Show memory didn't spike or leak
5. Error log: Empty (zero errors)
6. Video: Time-lapse of all 20 games playing

**Success Criteria**:
- ✅ All 20 games complete without crashing
- ✅ All 20 PGN files valid and exportable
- ✅ Zero errors in logs
- ✅ Average latency <500ms per move
- ✅ Memory stable (no growth >1GB)
- ✅ No manual restarts needed

---

## STORY 71.3: Spectator Experience Review (1 hour)

**Objective**: Watch from user perspective, identify confusing/boring moments

### Step 1: Run 3 Games
```bash
npm run chess
```

Keep it running for 3 complete games.

### Step 2: Watch Like a Spectator

**Do NOT** look at code or technical details. Just watch the broadcast as a user would.

**For Each Game**, note:
- **Boring moments**: Any sequence where nothing interesting happens for >30 seconds
- **Confusing UI**: Any part of the interface that doesn't make sense
- **Missing info**: Something you want to know but can't see
- **Technical jargon**: Things showing that shouldn't (e.g., raw JSON, internal IDs)
- **Visual issues**: Layout problems, color clashes, unreadable text

### Step 3: Document Issues

**Create SPECTATOR_REVIEW.txt**:
```
GAME 1
======
[Timestamp 1:23] - BORING: King endgame, no moves for 1 minute, just waiting
  Suggestion: Show endgame analysis or evaluation bar instead

[Timestamp 3:45] - CONFUSING: Move notation shown but not explained (e1g1)
  Suggestion: Show what's happening in plain English

[Timestamp 5:12] - MISSING: Don't know whose turn it is
  Suggestion: Add "White to move" indicator

GAME 2
======
[Timestamp 0:30] - UGLY: Player names cut off on small screen
  Suggestion: Abbreviate names or add line wrapping

GAME 3
======
[Timestamp 2:10] - TECHNICAL: Showing raw event JSON in console
  Suggestion: Hide debug output in production mode

SUMMARY
=======
Total issues found: 5
Critical (blocks enjoyment): 2
Major (should fix): 2
Minor (nice to have): 1
```

**Evidence to Collect**:
1. Annotated video with timestamps and notes for each issue
2. SPECTATOR_REVIEW.txt documenting every issue
3. Screenshots: Each problem area highlighted
4. Recommendations: What should be improved

**Success Criteria**:
- ✅ Watched 3 complete games
- ✅ Documented all confusing moments
- ✅ Provided specific suggestions for each issue
- ✅ Issues organized by severity

---

## STORY 71.4: External User Test (1 hour)

**Objective**: Let someone unfamiliar with the project install and run it

### Step 1: Prepare External Tester

Find someone who:
- Has never seen AI Commander
- Can use a terminal/command line
- Has 1 hour available
- Is willing to be observed

### Step 2: Give Them ONLY the README

```bash
# Copy just the README and repository
# Give them NO other instructions
# No hints, no help, no pointing them to files
```

### Step 3: Observe Silently

**Task**: "Get this running"

**Record**:
- Every question they ask (write it down)
- Every time they're stuck (how long they pause)
- Every command they try
- Every file they look at
- Every error they encounter
- Their final verdict

**Do NOT**:
- Answer questions
- Point to files
- Suggest commands
- Explain anything

### Step 4: Document Results

**Create EXTERNAL_USER_TEST.txt**:
```
PARTICIPANT: [Name/Identity]
TIME: [Date/Time]
ENVIRONMENT: [OS, Node version, etc]

QUESTIONS ASKED:
1. "How do I run this?" - ANSWERED IN README? YES/NO
2. "What's Ollama?" - ANSWERED IN README? YES/NO
3. "Do I need to install anything else?" - ANSWERED IN README? YES/NO

FAILURES/STUCK MOMENTS:
- At 2:30: Couldn't figure out npm install (README didn't mention it)
  Time stuck: 3 minutes
  Resolution: They eventually figured it out themselves

COMMANDS RUN (in order):
$ git clone ...
$ npm install
$ npm run chess
[etc]

ERRORS ENCOUNTERED:
- "Ollama not available" - They fixed it by starting Ollama service

FINAL VERDICT:
"It works, but it took me longer than it should have because [reasons]"

RECOMMENDATIONS:
- Add 'npm install' to README's "Getting Started"
- Explain what Ollama is in first paragraph
- Add troubleshooting section
```

**Evidence to Collect**:
1. Video: Complete recording of entire session
2. Terminal transcript: All commands and outputs
3. EXTERNAL_USER_TEST.txt: Detailed analysis
4. List of every question they asked
5. List of every place they got stuck

**Scoring**:
- **Excellent** (0 questions, runs first try): Ready to ship
- **Good** (1-2 questions): Minor README improvements needed
- **OK** (3-5 questions): Moderate documentation gaps
- **Poor** (6+ questions): Major issues before release

**Success Criteria**:
- ✅ External user can install from README alone
- ✅ External user can run `npm run chess`
- ✅ System launches without manual setup
- ✅ Zero critical failures
- ✅ <3 questions asked (or all answered in README)

---

## STORY 71.5: 24-Hour Continuous Run (24+ hours)

**Objective**: Prove the system never crashes and handles continuous operation

### Step 1: Prepare Monitoring

```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash

echo "=== 24-Hour Continuous Monitor ===" > monitor.log
echo "Start time: $(date)" >> monitor.log

while true; do
  echo "" >> monitor.log
  echo "=== Check at $(date) ===" >> monitor.log
  
  # Memory usage
  free -h >> monitor.log 2>&1 || ps aux | grep node >> monitor.log
  
  # Process status
  pgrep -f "node chess" >> monitor.log 2>&1 && echo "✓ Chess process running" >> monitor.log || echo "✗ Chess process DOWN" >> monitor.log
  
  # Error check
  grep -i error logs/* 2>/dev/null >> monitor.log || echo "No errors in logs" >> monitor.log
  
  # Sleep 6 hours
  sleep 21600
done
EOF

chmod +x monitor.sh
```

### Step 2: Start 24-Hour Run

```bash
# In one terminal:
npm run chess -- --mode continuous --duration 24h

# In another terminal:
./monitor.sh

# Note the exact start time
Start Time: [date/time]
```

### Step 3: Check Every 6 Hours

**At 6h mark**:
```bash
# Check process is still running
ps aux | grep node

# Check memory usage
# Windows: wmic OS get TotalVisibleMemorySize,FreePhysicalMemory
# Mac/Linux: free -h

# Check error logs
tail -100 logs/*

# Count games completed
grep "Game completed" logs/* | wc -l
```

Record:
- Games completed: [N]
- Memory used: [MB]
- Errors: [count]
- Process running: [YES/NO]

**At 12h mark**: Repeat checks

**At 18h mark**: Repeat checks

**At 24h mark**: Final check + stop

### Step 4: Collect Evidence

**After 24 hours**, collect:

```bash
# Get final stats
echo "=== Final Statistics ===" > 24h-results.txt
echo "Games completed: $(grep 'Winner:' logs/* | wc -l)" >> 24h-results.txt
echo "Total moves: $(grep 'Move:' logs/* | wc -l)" >> 24h-results.txt
echo "Errors: $(grep -i error logs/* | wc -l)" >> 24h-results.txt
echo "Crashes: $(grep -i 'fatal\|crash\|segfault' logs/* | wc -l)" >> 24h-results.txt

# Memory at start, 6h, 12h, 18h, 24h (from monitor.log)
grep "Memory" monitor.log > memory-graph.txt

# Create summary
cat 24h-results.txt
```

**Evidence to Collect**:
1. Monitor log: Timestamped checks every 6 hours
2. Memory graph: Show memory over 24 hours (should be flat)
3. Error log: Empty (zero errors)
4. Crash count: 0
5. Game count: How many completed in 24 hours
6. CPU graph: Should be stable
7. Screenshot: Final process status (still running)

**Success Criteria**:
- ✅ System runs full 24 hours without crashing
- ✅ Zero errors in logs
- ✅ Memory stable (no growth >500MB)
- ✅ CPU stable (no spikes)
- ✅ All games complete successfully
- ✅ No manual restarts needed
- ✅ Process alive at 24h mark

---

## STORY 71.6: CEO Demo - The One-Take Test (15 minutes)

**Objective**: Demonstrate fresh clone → running game in <5 minutes, no setup

### Setup (Before Demo)

```bash
# Prepare a clean demo directory
mkdir -p ~/demo-clean
cd ~/demo-clean

# Make sure Ollama is running
# Have browser ready to display
# Have camera/screen recording ready
```

### The Demo (One Take, No Pauses)

**Exactly this, nothing more**:

```bash
# Terminal 1: Clean clone
$ git clone https://github.com/anthropics/ai-commander.git
$ cd ai-commander

# Terminal 1: Install
$ npm install

# Terminal 1: Run
$ npm run chess
```

**Audience sees**:
1. ✅ Startup checks running
2. ✅ "Arena ready" message
3. ✅ Browser opens showing broadcast
4. ✅ Two AI models appear as players
5. ✅ Game starts immediately
6. ✅ Moves appear on board
7. ✅ Commentary appears
8. ✅ Events highlighted (captures, checks, etc.)
9. ✅ First game completes
10. ✅ Winner announced
11. ✅ Next match starts automatically

### Record Everything

```bash
# Start recording BEFORE you type git clone
# Record: terminal, browser, audio
# Record timing: note exact time from "git clone" to "first move"
```

**Timing Breakdown** (target: <3 minutes):
- `git clone`: 10-30 seconds
- `npm install`: 30-60 seconds
- `npm run chess` startup: 20-30 seconds
- Browser open: <5 seconds
- First move: <10 seconds
- **Total**: <3 minutes from fresh clone to first move

### Evidence to Collect

1. **Video**: Complete demo from `git clone` to game running
   - Include terminal showing all commands
   - Include browser showing game
   - Include timestamp overlay (shows it's <5 min total)

2. **Screenshots**:
   - Fresh directory before clone
   - Git clone running
   - npm install output
   - Startup checks passing
   - Browser with broadcast
   - First move on board
   - Winner announced
   - Second game starting

3. **Metrics**:
   - Total time from `git clone` to first move: [N] seconds
   - Total time from `npm run chess` to game visible: [N] seconds
   - Zero errors in output: YES/NO
   - Browser opened automatically: YES/NO
   - Next match auto-started: YES/NO

### Success Criteria

- ✅ Fresh clone (no hidden setup)
- ✅ Only 3 commands: git clone, npm install, npm run chess
- ✅ No error messages
- ✅ Browser opens automatically
- ✅ Game visible and playing within 3 minutes
- ✅ Winner announced
- ✅ Next match starts automatically
- ✅ Demo is repeatable (works every time)

---

## FINAL ASSESSMENT

### Create Final Report: EPIC_71_RESULTS.md

```markdown
# EPIC 71 Results - Product Proof

## Story 71.1: Clean Machine Startup
- Status: ✅ PASS / ❌ FAIL
- Issues found: [list]
- Time to first move: [seconds]

## Story 71.2: 20 Complete Games
- Status: ✅ PASS / ❌ FAIL
- Games completed: 20/20
- Failures: 0
- Average game duration: [seconds]
- Average move latency: [ms]
- Memory stable: YES/NO

## Story 71.3: Spectator Review
- Status: ✅ PASS / ❌ FAIL
- Issues found: [N]
- Critical issues: [N]
- Fixes needed: [list]

## Story 71.4: External User Test
- Status: ✅ PASS / ❌ FAIL
- Questions asked: [N]
- Stuck moments: [N]
- README gaps: [list]

## Story 71.5: 24-Hour Run
- Status: ✅ PASS / ❌ FAIL
- Uptime: 24h 0m 0s
- Games completed: [N]
- Crashes: 0
- Errors: 0
- Memory growth: [MB]

## Story 71.6: CEO Demo
- Status: ✅ PASS / ❌ FAIL
- Time to first move: [seconds]
- All automated: YES/NO
- Repeatable: YES/NO

## OVERALL: EPIC 71 ✅ PASS / ❌ FAIL

**Verdict**: Ready for v1.0.0 release: YES/NO
```

---

## NEXT STEPS

Once you've completed all 6 stories:

1. **All Passing?** → v1.0.0 is SHIPPED 🚀
2. **Any Failing?** → Fix that story and re-run

---

**This is the real proof. Everything else was preparation.**

**No hiding. No excuses. Everything executes.**

