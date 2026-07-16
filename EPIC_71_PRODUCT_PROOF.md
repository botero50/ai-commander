# EPIC 71: Product Proof
## The Ultimate Validation - Everything Must Execute

**Date**: July 16, 2026  
**Purpose**: Prove AI Commander delivers on its promise - no mocks, no simulations, no placeholders  
**Status**: Framework Ready - Awaiting Real Machine Execution  

---

## EPIC 71 OVERVIEW

This EPIC proves AI Commander works in the real world:
- No hidden setup
- No manual intervention
- No test scaffolding
- Just `git clone` → `pnpm install` → `pnpm chess`
- Everything executes as promised

---

## STORY 71.1: Clean Machine Startup

**Goal**: Prove startup works on a truly clean machine

**What Must Happen**:
1. Fresh clone of repository
2. `pnpm install` completes without errors
3. `pnpm chess` launches without any hidden setup
4. Dependency verification prints to console
5. Browser opens to broadcast URL
6. First move appears in less than 5 seconds
7. Winner announced
8. System restarts automatically for next match

**Evidence Required**:
- Screenshot: Fresh clone in new directory
- Console output: All dependencies verified
- Screenshot: Browser showing broadcast
- Screenshot: First move displayed
- Screenshot: Winner announcement
- Log: Automatic restart detected

**Current Status**: ✅ Code ready, awaiting real machine execution

**Why This Matters**: If this doesn't work, nothing else matters. No feature, no optimization, no polish can hide a broken startup.

---

## STORY 71.2: 20 Complete Games - Ollama vs Ollama

**Goal**: Prove continuous operation with real Ollama decisions

**What Must Happen**:
1. Ollama service running with `mistral` and `neural-chat` models
2. Run `pnpm chess --mode tournament --games 20`
3. Play 20 complete games without any failures
4. Collect metrics for each game:
   - Winner (white/black/draw)
   - Duration (seconds)
   - Move count
   - PGN export
   - Average move latency
   - Any errors or restarts

**Evidence Required**:
- CSV: All 20 game results with metrics
- PGN files: All 20 complete games
- Console logs: No errors, no manual interventions
- JSON: Performance metrics for each game
- Video: Time-lapse of all 20 games

**Failure Criteria**:
- Any game ends prematurely = FAIL
- Any game restarts = FAIL
- Any missing PGN = FAIL
- Average latency >500ms = FAIL
- Any memory spike = FAIL

**Current Status**: ✅ Code ready, awaiting Ollama integration

**Why This Matters**: This proves it's not a one-shot demo. It works repeatedly. Real AI. Real decisions. Real results.

---

## STORY 71.3: Spectator Experience Review

**Goal**: Identify every moment that confuses or bores a viewer

**What To Watch**:
1. Start broadcast in fullscreen
2. Watch 3 complete games as if you've never seen it
3. For every moment that feels wrong, pause and note:
   - Timestamp
   - What's happening
   - Why it feels wrong
   - What should happen instead

**Watch For**:
- **Boring**: Long sequences with no events, no commentary
- **Confusing**: UI elements that don't make sense, unclear state
- **Ugly**: Layout issues, clashing colors, poor font choices
- **Technical**: Showing things users don't care about
- **Missing Info**: Key information not visible

**Evidence Required**:
- Annotated video with timestamps
- List of all issues found (severity: critical/major/minor)
- Recommendation for each issue
- Screenshot of each problem area

**Current Status**: ✅ Broadcast systems ready, awaiting visual review

**Why This Matters**: A beautiful system that confuses users is worthless. This forces us to see AI Commander through fresh eyes.

---

## STORY 71.4: External User Test - The Honesty Test

**Goal**: Give AI Commander to someone who's never seen it. Watch them. Learn.

**Process**:
1. Find external user (colleague, friend, stranger - someone who knows nothing about this project)
2. Give them:
   - The README (and ONLY the README)
   - A fresh repository
   - A computer
3. Task: "Get this running"
4. Observe silently. Record:
   - Every question they ask
   - Every time they're stuck
   - Every command they run
   - Every thing they look for in docs
   - Every feature they expect but don't find

**Do NOT**:
- Answer questions
- Point them to files
- Suggest commands
- Explain the README

**Evidence Required**:
- Video recording of entire session
- List of every question asked
- List of every failure/confusion moment
- Terminal transcript
- Their final assessment

**Scoring**:
- 0 questions, 1st try = Excellent
- 1-2 questions = Good
- 3-5 questions = OK
- 6+ questions = README needs work
- Any critical failure = Must fix before release

**Current Status**: ⚠️ README complete, awaiting external tester

**Why This Matters**: We're too close to see obvious problems. This is the mirror test.

---

## STORY 71.5: 24-Hour Continuous Run

**Goal**: Prove AI Commander never crashes, never leaks memory, never needs manual restart

**What Must Happen**:
1. Run `pnpm chess --mode continuous --duration 24h` at 9am
2. Let it run until 9am next day
3. No manual intervention allowed (no touching keyboard except to record stats)
4. Collect every 6 hours:
   - Games completed since last check
   - Memory usage (MB)
   - CPU usage (%)
   - Any errors in logs
   - Broadcast status

**Evidence Required**:
- Timestamped log of every completed game
- Memory graph (6 data points over 24h)
- CPU usage graph (6 data points over 24h)
- Error log (empty = perfect)
- Video: Final screen at 24h mark
- System stats: RAM available, process state

**Failure Criteria**:
- Any crash = FAIL
- Any manual restart = FAIL
- Memory growth >500MB = FAIL
- Any unhandled error in logs = FAIL

**Current Status**: ✅ Arena operator ready, awaiting 24-hour run

**Why This Matters**: A system that crashes after 2 hours is not production-ready. This is the endurance test.

---

## STORY 71.6: CEO Demo - The One-Take Test

**Goal**: Deliver the demo that closes the deal

**The Demo** (5 minutes, no setup, no cheating):
```
1. Fresh terminal window
2. $ git clone https://github.com/anthropics/ai-commander.git
3. $ cd ai-commander
4. $ pnpm install
5. $ pnpm chess
6. [Browser opens automatically]
7. [Two AI models start playing]
8. [Broadcast starts, commentary flows]
9. [First game completes]
10. [Winner announced]
11. [Next match begins automatically]
```

**What the Audience Sees**:
- Game board with pieces moving
- Real-time commentary (AI analysis of moves)
- Replay of critical moments
- Winner announcement
- Automatic next match

**What Must NOT Happen**:
- Any manual setup before `git clone`
- Any error messages
- Any "please wait"
- Any missing dependencies
- Any keyboard input except `git clone`, `pnpm install`, `pnpm chess`
- Any hidden configuration

**Evidence Required**:
- Video: Clean terminal, all commands visible
- Audio: Audience reaction/questions
- Screenshot: Broadcast showing game
- Screenshot: Commentary appearing
- Screenshot: Winner announced
- Timestamp: Duration from `git clone` to first move

**Success Criteria**:
- Total time: <3 minutes from fresh clone to first move
- No errors, no warnings
- Browser opens automatically
- Game plays continuously
- Commentary appears automatically
- Replicable: Can repeat without changes

**Current Status**: ⚠️ Waiting for real setup verification

**Why This Matters**: This is the ultimate proof. No hidden setup, no magic. Just code that works.

---

## EXECUTION CHECKLIST

### Before You Start

- [ ] Fresh machine (or fresh VM)
- [ ] Ollama running with `mistral` and `neural-chat` models
- [ ] 24+ GB free disk space
- [ ] No hidden configuration
- [ ] Network access (for YouTube integration test)
- [ ] Video recording capability (smartphone OK)

### Story 71.1: Startup
- [ ] Fresh clone
- [ ] `pnpm install` (no pre-installed dependencies)
- [ ] `pnpm chess` (first command)
- [ ] Browser opens
- [ ] First move visible
- [ ] Winner announced
- [ ] Automatic restart

### Story 71.2: 20 Games
- [ ] Game 1-5 complete
- [ ] Game 6-10 complete
- [ ] Game 11-15 complete
- [ ] Game 16-20 complete
- [ ] All PGNs valid
- [ ] No failures

### Story 71.3: Spectator Review
- [ ] Watch game 1
- [ ] Note all confusing moments
- [ ] Watch game 2
- [ ] Note UI issues
- [ ] Watch game 3
- [ ] Identify improvements

### Story 71.4: External User
- [ ] Find external tester
- [ ] Give them README only
- [ ] Record session
- [ ] Count questions
- [ ] List failures

### Story 71.5: 24-Hour Run
- [ ] Start at specific time
- [ ] Check every 6 hours
- [ ] Record metrics
- [ ] Let run to 24h mark
- [ ] Verify no crashes

### Story 71.6: CEO Demo
- [ ] Fresh terminal
- [ ] Fresh clone
- [ ] `pnpm install`
- [ ] `pnpm chess`
- [ ] Record entire sequence
- [ ] Measure time
- [ ] Verify repeatable

---

## SUCCESS CRITERIA (ALL MUST PASS)

### Story 71.1: Startup ✅
- [x] Code implements startup logic
- [ ] Executes on real machine
- [ ] No manual setup needed
- [ ] Browser opens automatically
- [ ] First move within 5 seconds

### Story 71.2: 20 Games ✅
- [x] Code implements tournament mode
- [ ] Ollama actually executes
- [ ] All 20 games complete
- [ ] All metrics collected
- [ ] Zero failures

### Story 71.3: Spectator Review ✅
- [x] Broadcast systems implemented
- [ ] Visual review completed
- [ ] Issues documented
- [ ] Improvements identified
- [ ] Issues fixed

### Story 71.4: External User ✅
- [x] Code and README complete
- [ ] External user tests
- [ ] All questions answered in README
- [ ] Zero unexpected failures
- [ ] User completes successfully

### Story 71.5: 24-Hour Run ✅
- [x] Arena operator implemented
- [ ] System runs 24 hours
- [ ] Zero crashes
- [ ] Zero memory leaks
- [ ] Metrics prove stability

### Story 71.6: CEO Demo ✅
- [x] All components ready
- [ ] Demo executes cleanly
- [ ] <3 minutes start-to-play
- [ ] No errors or warnings
- [ ] Repeatable without changes

---

## WHAT COULD GO WRONG

### Story 71.1 Failures:
- Dependency not in package.json
- Environment variable not documented
- Browser launch fails
- First move takes >10 seconds
- Startup hangs on some check

### Story 71.2 Failures:
- Ollama not installed/running
- Models not available
- Game logic hangs
- Memory leak during games
- PGN export broken

### Story 71.3 Failures:
- Commentary doesn't appear
- Replay doesn't work
- UI is confusing
- Layout breaks on some screen
- Too much dead time between events

### Story 71.4 Failures:
- User can't clone repository
- Installation fails
- Documentation is unclear
- User asks how to run it
- User gets stuck

### Story 71.5 Failures:
- System crashes after 2 hours
- Memory grows unbounded
- CPU maxes out
- Disk fills up
- Logs show errors

### Story 71.6 Failures:
- Demo takes >5 minutes
- Browser doesn't open
- Games don't start
- Commentary missing
- Next match doesn't auto-start

---

## REALITY CHECK

**What We Know Works** (from EPIC 66-70):
- ✅ Real chess.js execution (10,000+ moves)
- ✅ Event detection (183+ events)
- ✅ Broadcast pipeline (100% completion)
- ✅ OBS/YouTube integration (code structure)
- ✅ Startup sequence (system checks)
- ✅ Logging system (multiple levels)
- ✅ Configuration management (8/8 items)

**What We DON'T Know** (EPIC 71 will prove):
- ❓ Does it work on a truly clean machine?
- ❓ Does `pnpm chess` actually work end-to-end?
- ❓ Does Ollama integration actually execute?
- ❓ Can a stranger install it from README?
- ❓ Does it really run 24 hours without issues?
- ❓ Can we demo it in <5 minutes with no setup?

**EPIC 71 is the proof. Everything else was preparation.**

---

## TIMELINE

Assuming real machine execution:
- Story 71.1: 30 minutes
- Story 71.2: 2 hours (20 games at ~6min each)
- Story 71.3: 1 hour (3 games + analysis)
- Story 71.4: 1 hour (external user session)
- Story 71.5: 24+ hours (continuous run)
- Story 71.6: 15 minutes (CEO demo)

**Total**: 28-29 hours across the week

---

## THE MOMENT OF TRUTH

If all of EPIC 71 passes:
- ✅ AI Commander is **truly** production-ready
- ✅ No hidden setup, no magic, no cheating
- ✅ Real Ollama, real games, real broadcast
- ✅ Works for total strangers
- ✅ Runs continuously without intervention
- ✅ Showable to CEO/investors/users

If EPIC 71 fails on any story:
- ❌ AI Commander is **not** ready for v1.0
- ❌ That story becomes a blocker
- ❌ Fix it, then re-run that story

---

## FINAL VERDICT CRITERIA

**EPIC 71 PASS** (All 6 stories must pass):
- Story 71.1: Startup on clean machine ✅
- Story 71.2: 20 complete games ✅
- Story 71.3: Spectator review ✅
- Story 71.4: External user success ✅
- Story 71.5: 24-hour continuous run ✅
- Story 71.6: CEO demo <5 minutes ✅

**Result**: v1.0.0 SHIPPED 🚀

---

**EPIC 71 is not about building. It's about proving everything works in reality.**

**No hiding. No excuses. No simulations.**

**Just: Does it work?**

