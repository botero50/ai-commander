# EPIC R2.6 Validation Gate — Ruleset

**Locked On**: All feature development stops.

**Unlocked By**: Measured runtime evidence, nothing else.

---

## The Single Source of Truth

No code walkthroughs.  
No unit tests.  
No architecture reviews.  
No design documents.  

**Only**:
- Logs from running systems
- Screenshots of visual state
- HTTP traffic captures
- Latency measurements
- Command payloads
- Responses received

---

## What We're Proving

Not: "The code is well-written"  
Not: "The design is sound"  
Not: "All edge cases are handled"  

**Only**: "Real 0 A.D. units move because Ollama decided they should move"

---

## The Five Stories of R2.6

### R2.6.1: RL Interface Startup

**Measured**:
- Seconds from pyrogenesis.exe launch to game window visible
- HTTP response time from server (milliseconds)
- HTTP status code (200 or not)
- First tick number received

**Verdict Options**:
- PASS: Server responds, game launches, tick 0 received, < 30 sec startup
- FAIL: Any of above do not occur

---

### R2.6.2: Observation Synchronization

**Measured**:
- Raw JSON from /step endpoint (5+ consecutive ticks)
- WorldState JSON after mapping (same 5 ticks)
- Screenshots of 0 A.D. game window (same 5 ticks)

**Verification**: Do the three agree?
- Unit IDs match across all three
- Positions match (within grid square)
- Resource counts match
- Tick numbers match
- Player states match

**Verdict Options**:
- PASS: All three sources perfectly aligned across 5+ ticks
- FAIL: Any mismatch detected

---

### R2.6.3: Command Execution

**Measured** (for each of 5 commands):
1. Command JSON sent to /step
2. HTTP response received
3. Game state BEFORE execution (screenshot at tick N)
4. Game state AFTER execution (screenshot at tick N+1)
5. Latency (milliseconds from request to response)

**Commands to test**:
- Move unit 5 units east
- Gather from resource pile
- Attack visible enemy
- Build structure at location
- Train unit at building

**Verification**: Does observable change match command intent?
- Unit moved: Y/N
- Resource gathered: Y/N
- Enemy health decreased: Y/N
- Structure appears: Y/N
- Unit trained: Y/N

**Verdict Options**:
- PASS: All 5 commands show observable changes, < 2 second latency each
- FAIL: Any command produces no visible change, or > 5 second latency

---

### R2.6.4: Complete AI Loop (5 Minutes)

**Measured**:
- Start timestamp: HH:MM:SS
- End timestamp: HH:MM:SS (must be ≥ 5 minutes later)
- Observations processed: N
- Commands executed: M
- Failed ticks: 0
- Skipped observations: 0
- Average latency per tick (milliseconds)
- Max latency per tick (milliseconds)
- Ollama decision count: X
- Ollama average inference time (milliseconds)
- Video recording (entire 5 minutes)

**Verification**: Did the loop run uninterrupted?
- Every tick processed: Y/N
- Every command executed: Y/N
- No errors in logs: Y/N
- Game visible advancing on screen: Y/N
- Ollama actually inferring (not skipped): Y/N

**Verdict Options**:
- PASS: 5+ minutes continuous, 100% tick completion, all Ollama inferences executed, no errors, video proof
- FAIL: Any tick missed, any inference skipped, any error, < 5 minutes, no video

---

### R2.6.5: CTO Product Gate

**Seven Questions. Measured Answers Only.**

#### 1. Did Ollama successfully control the game?

ANSWER FORMAT:
```
YES / NO / PARTIAL

Evidence:
- Commands issued by Ollama: [number from logs]
- Commands executed successfully: [number]
- Commands failed: [number]
- Success rate: [percentage]

Example:
Ollama issued 127 commands in 5 minutes.
125 executed successfully (98.4%).
2 failed (timeout/invalid target).
Result: YES, Ollama controlled the game with 98% success rate.
```

#### 2. Was every command executed correctly?

ANSWER FORMAT:
```
YES / NO / PARTIAL

Evidence:
- Before/after screenshots showing visual changes
- Before state at tick N, after state at tick N+1
- Command latency: min/max/avg (milliseconds)
- Visual confirmation for each command type

Example:
Tested 5 command types:
- Move: visible position change ✓
- Gather: resource count decreased ✓
- Build: structure appeared on map ✓
- Attack: enemy health decreased ✓
- Train: unit count increased ✓
Result: YES, all command types executed with visible effects.
```

#### 3. Did observations remain synchronized?

ANSWER FORMAT:
```
YES / NO / PARTIAL

Evidence:
- Raw observation JSON samples (5 ticks)
- WorldState JSON samples (5 ticks)
- Game screenshots (5 ticks)
- Alignment verification (unit positions, counts, states)

Example:
Tick 47:
- Raw: unit_id=234, pos=(125,456)
- WorldState: unit_id=234, pos=(125,456)
- Screenshot: unit visible at (125,456) on map ✓
Tick 48-51: [same verification]
Result: YES, all three sources remain perfectly synchronized.
```

#### 4. Was the RL Interface stable?

ANSWER FORMAT:
```
YES / NO / PARTIAL

Evidence:
- Total HTTP requests: N
- Successful responses (status 200): M
- Failed responses (status >= 400): L
- Uptime: X minutes Y seconds
- Unexpected disconnects: 0/N
- Max response latency: Z milliseconds

Example:
- Total requests: 500
- Successful: 500 (100%)
- Failed: 0 (0%)
- Uptime: 5 minutes 0 seconds (continuous)
- Disconnects: 0
- Max latency: 850ms
Result: YES, 100% stable for entire 5-minute run.
```

#### 5. Was latency acceptable?

ANSWER FORMAT:
```
YES / NO / PARTIAL

Evidence - Per Phase Breakdown (milliseconds):
- Observation fetch: avg=X, max=Y
- WorldState mapping: avg=A, max=B
- Ollama inference: avg=C, max=D
- Command execution: avg=E, max=F
- Total per tick: avg=G, max=H

Acceptance Criteria:
- Per-phase latency < 2000ms each
- Total per tick < 5000ms
- Ollama inference < 2000ms

Example:
- Observation: avg=120ms, max=350ms ✓
- Mapping: avg=25ms, max=75ms ✓
- Ollama: avg=1200ms, max=1850ms ✓
- Execution: avg=180ms, max=600ms ✓
- Total: avg=1525ms, max=2875ms ✓
Result: YES, all latencies well within acceptable bounds.
```

#### 6. Would you confidently demonstrate this live?

ANSWER FORMAT:
```
YES / NO / PARTIAL

Evidence:
- Video showing 5 minute run
- Metrics showing 100% success
- Visual proof: units moving, gathering, building
- No errors or failures
- Reproducibility: could run again now with same results

Example:
✓ Video available: r2-6-4-5-minute-run.mp4 (10 minutes)
✓ No errors in logs
✓ All metrics within spec
✓ Units visibly responding to Ollama decisions
✓ Reproducible: command to run again provided
Result: YES, confident to demonstrate live right now.
```

#### 7. Is there any remaining blocker before Ollama vs Ollama?

ANSWER FORMAT:
```
NONE / [LIST BLOCKERS]

Evidence:
- System stability: ✓ Proven for 5+ minutes
- Command execution: ✓ All types working
- Observation sync: ✓ All sources aligned
- Ollama integration: ✓ Decisions being made
- Latency: ✓ Acceptable
- Reproducibility: ✓ Can run again

Any issues found:
[List specific technical blockers with measurements]

Example:
NONE. All subsystems operational:
- RL Interface: stable, responsive
- Observation pipeline: synchronized
- Command pipeline: 100% success
- Ollama integration: making decisions
- Latency: acceptable
- Video proof: available

No blockers identified. Ready for Ollama vs Ollama tournament.
```

---

## The Gate Decision

**IF all seven answers are YES with measured evidence**:
```
EPIC R2 VALIDATION: PASSED ✅

EPIC R3 BEGINS IMMEDIATELY

Objective: Run two independent Ollama model instances in a complete match.
```

**IF any answer is NO or UNKNOWN**:
```
EPIC R2 VALIDATION: FAILED ❌

Do not proceed to EPIC R3.

Identify the specific failure.

Measure root cause.

Fix only the proven failure.

Re-test.

Repeat until all answers are YES.
```

---

## What Happens After Gate Opens

The first actual product milestone:

**EPIC R3: Ollama vs Ollama**

Two independent Ollama model instances playing a complete 0 A.D. match from start to finish.

From real observations.

Making real decisions.

Executing real commands.

With a measurable winner.

That is the success criterion.

Not "Ollama integration works."  
Not "Tournament framework runs."  

**"Two LLMs played a complete game and one won."**

---

## Documentation Required

After completing all of R2.6.1-R2.6.4:

**Single Document**: `R2-6-VALIDATION-REPORT.md`

Contains:
- R2.6.1 evidence: startup logs, screenshots, timing
- R2.6.2 evidence: JSON samples, alignments, screenshots
- R2.6.3 evidence: 5 command tests with before/after
- R2.6.4 evidence: 5-minute run metrics, video
- R2.6.5 answers: all 7 questions with measured data

---

## The Immovable Rule

> **Everything in this report must be directly observed at runtime.**
> 
> No inference.  
> No speculation.  
> No "it should work because."  
> 
> Only: "I measured this. Here is the data."

---

**This is the gate.**

**All feature work stops.**

**Only measurement happens.**

**Move when you have proof.**
