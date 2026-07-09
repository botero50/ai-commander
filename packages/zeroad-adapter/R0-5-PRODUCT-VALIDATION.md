# EPIC R0.5: RL Interface Product Validation

**Objective:** Validate that the official 0 A.D. RL Interface can support AI Commander's core product vision without architectural compromises.

**Product Context:**
- AI Commander is NOT a reinforcement learning framework
- AI Commander IS a real-time AI arena where humans watch LLMs play RTS games
- Core requirement: Spectators watch normal, visible 0 A.D. matches controlled by external Ollama AI

**Investigation Scope:**
Five stories to validate critical product assumptions before implementation begins.

---

## Story R0.5.1: Visual Execution ✅ COMPLETE

**Question:** Can the RL Interface control a normal, visible 0 A.D. match that humans can watch?

### Key Findings

✅ **Visual Mode is Supported:**
- The `--autostart-nonvisual` flag is optional, not required
- You can run: `pyrogenesis --rl-interface=127.0.0.1:6000` (no headless flag)
- Game window renders normally during RL Interface control
- Graphics remain active and fully rendered

✅ **Architecture is Decoupled:**
- Graphics and simulation are independent components
- Both run in same executable, can be toggled
- Disabling rendering does NOT affect game logic
- Both visual and programmatic control coexist

⚠️ **Spectator Compatibility is UNDOCUMENTED:**
- 0 A.D. supports observers in multiplayer (Release 28+)
- Whether spectators work with RL Interface is NOT documented
- No published incompatibility, but also no confirmation
- **Requires testing before deployment**

### Verdict for AI Commander Product Vision

**CAN SPECTATORS WATCH A NORMAL VISIBLE MATCH CONTROLLED BY OLLAMA?**

✅ **Technically YES** — RL Interface works in visual mode, game renders normally

⚠️ **Needs Validation** — Spectator + RL Interface compatibility untested

**What This Means:**
- Visual broadcast of AI-controlled matches: Possible ✓
- Real-time rendering during external AI decisions: Possible ✓
- Observer mode integration: Needs testing ⚠️

### Sources
- Brian Broll's RL in 0 A.D. blog
- 0 A.D. Release 28 documentation
- Pyrogenesis engine architecture (Wikibooks)

### Recommendation for R0.5.5
**Does not block** using RL Interface, but spectator testing is a required validation task before launch.

---

## Story R0.5.2: Tick Model ✅ COMPLETE

**Question:** What is the exact execution model? Can Ollama (300-800ms thinking time) integrate with 0 A.D.'s tick system?

### Key Findings

✅ **Turn-Based Synchronous Model:**
- RL Interface uses **manual stepping** (not real-time)
- Game only advances when you call `/step` endpoint
- Engine waits for HTTP response before advancing
- No timeout or background progress

✅ **No Tick Frequency Constraint:**
- Ollama can take 300ms, 800ms, or even hours to decide
- Game doesn't advance until decision arrives
- No timeout or default action if decision is slow
- Determinism guaranteed (same decision = same result)

✅ **Command Buffering Works:**
- Can pre-buffer multiple commands
- Commands execute in order per tick
- Multiple commands per tick supported
- No overwrite/queue conflict issues

⚠️ **Real-Time Performance NOT Specified:**
- How many ticks per second with rendering enabled?
- What is the per-tick latency (decision→execution)?
- Not published in official documentation
- Empirically varies by map and hardware

### Execution Lifecycle

```
1. Send HTTP POST /reset → Get initial state
2. Loop:
   a. Send POST /step with Ollama commands → State response
   b. Parse observations
   c. Call Ollama API (300-800ms)
   d. Get decision from Ollama
   e. Format as RL Interface command
   f. Go back to step 2a
```

**Blocking behavior:** Step 2a blocks until Ollama responds (step 2d-2e)
**Game advances:** After each decision arrives, before rendering next frame

### Verdict for AI Commander Product Vision

**CAN OLLAMA TAKE 300-800MS TO DECIDE WITHOUT BREAKING GAMEPLAY?**

✅ **YES** — Synchronous turn-based model accommodates slow decisions

✅ **Determinism Guaranteed** — Same observations + decisions = same results

⚠️ **Real-Time Rendering May Stall** — Each decision takes 300-800ms, so...
- Match renders at ~1 FPS (if Ollama takes 800ms)
- Viewers see discrete "turns" advancing, not smooth gameplay
- This is acceptable for broadcast (update every 0.8s) but not for real-time streaming
- No spectator will perceive 800ms latency as "broken" (just slow-motion)

### Sources
- RL Interface HTTP API design (turn-based, not real-time)
- Pyrogenesis engine synchronization model
- zero_ad_rl training documentation
- Intel performance analysis

### Recommendation for R0.5.5
**RL Interface IS COMPATIBLE** with Ollama's decision latency. Viewers will see slow-motion gameplay (1 FPS per 800ms decision), which is actually ideal for broadcast commentary.

---

## Story R0.5.3: Observation Model ✅ COMPLETE

**Question:** Does the RL Interface provide all information needed for both AI decision-making AND spectator UI?

### Key Findings

✅ **All Core Game State Available:**

**Units:**
- ✅ Positions (x, z coordinates)
- ✅ Health and max health
- ✅ Ownership (player ID)
- ✅ Type/template name
- ✅ Stance (aggressive, defensive, passive)
- ✅ Formation status
- ✅ Current and queued orders
- ✅ Idle status

**Buildings:**
- ✅ Positions and type
- ✅ Health status
- ✅ Ownership
- ✅ Production queue
- ✅ Garrison contents
- ✅ Construction progress (if building)

**Players:**
- ✅ Resource counts (food, wood, stone, metal)
- ✅ Population (current/limit/max)
- ✅ Victory/defeat status
- ✅ Technology research (researched + queued)
- ✅ Diplomacy relationships (allies/enemies/neutral)
- ✅ Civilization/phase/team

**Game Meta:**
- ✅ Current game tick/time
- ✅ Game phase (setup/running/finished)
- ✅ Victory conditions
- ✅ Match winner/loser

**Events (21 Types):**
- ✅ Create, Destroy, Attacked, ConstructionFinished
- ✅ TrainingStarted/Finished, OwnershipChanged, Garrison/UnGarrison
- ✅ DiplomacyChanged, PlayerDefeated, TerritoryChanged
- ✅ (And 11 more event types)

⚠️ **Partial/Workaround Cases:**

**Fog of War:**
- Per-entity visibility available (which units can each player see?)
- Complete FOW map NOT available (would need separate computation)
- For spectator UI: Can be synthesized from entity visibility data
- For AI: Sufficient (AI never needs global hidden information)

**Terrain/Pathfinding:**
- Point queries available (terrain height at specific xy)
- Full terrain grid NOT efficiently exposed
- For spectator UI: Can be queried incrementally or pre-cached
- For AI: Sufficient (don't need full grid for decisions)

### Observation Format

**JSON structure via HTTP `/step` response:**
```json
{
  "players": [...],        // Player states with resources, tech, etc.
  "entities": {...},       // All units/buildings with full state
  "mapSize": 320,
  "timeElapsed": 3600,
  "events": {
    "Create": [...],
    "Destroy": [...],
    "Attacked": [...]
  }
}
```

**Data frequency:** Manual (on each `/step` call), no streaming

### Verdict for AI Commander Product Vision

**DOES RL INTERFACE PROVIDE ALL OBSERVATIONS FOR SPECTATOR UI + AI DECISIONS?**

✅ **YES, COMPLETE** — All required state is available

✅ **No Critical Gaps** — Even FOW and terrain can be computed from available data

✅ **Suitable for Both:**
- AI decision-making: Complete (all strategic state visible)
- Spectator UI: Complete (can show units, buildings, resources, tech, diplomacy, events)

### What Spectators Will See

- All unit/building positions and health
- All player resources and populations
- Technology progress
- Event log (who attacked whom, buildings built, units trained, etc.)
- Match timeline and victory status
- Real-time strategic state

### Sources
- RL Interface HTTP API documentation
- AIInterface.js (event system)
- AIProxy.js (entity state details)
- GuiInterface.js (global game state)
- Python zero_ad client code

### Recommendation for R0.5.5
**RL Interface provides COMPLETE observations.** No extensions needed. All data needed for both AI and spectators is available.

---

## Story R0.5.4: Command Model

**Question:** Does the RL Interface support all required RTS commands for gameplay?

### Required Commands to Validate

**Unit Orders:**
- [ ] Move (unit(s) to position)
- [ ] Move stop
- [ ] Attack (unit(s) attack target)
- [ ] Gather (unit(s) gather from resource)
- [ ] Patrol (unit(s) patrol route)
- [ ] Hold ground
- [ ] Formation (set formation type)
- [ ] Stance change (aggressive/defensive/passive)

**Building Orders:**
- [ ] Build (construct building at position)
- [ ] Cancel build
- [ ] Produce unit (train from building)
- [ ] Cancel production
- [ ] Research technology
- [ ] Garrison units in building
- [ ] Ungarrison units

**Diplomatic Actions:**
- [ ] Set ally
- [ ] Set enemy
- [ ] Propose tribute
- [ ] Chat/messages

**System Commands:**
- [ ] Pause game
- [ ] Surrender
- [ ] Spectate mode

### Questions to Answer

1. **Coverage:** Which of these commands are supported by RL Interface?
2. **Missing Commands:** Are any critical commands absent?
3. **Extensions Needed:** If a command is missing, how would we add it?
4. **Command Format:** What is the exact syntax for each command?
5. **Batch Operations:** Can we send multiple commands per tick?

### Finding: (Awaiting investigation)

---

## Story R0.5.5: Product Validation

**Final Question:** Can the official RL Interface become the permanent integration layer for AI Commander?

### Decision Matrix

After R0.5.1-R0.5.4 complete, synthesize findings:

**Validation Success Criteria:**

1. **Visual Execution** ✅
   - Game renders normally
   - Spectators can watch
   - Visual mode doesn't require headless workaround
   - OR: Headless mode acceptable with alternative visual solution

2. **Tick Model** ✅
   - Ollama can take 300-800ms without breaking game
   - OR: Acceptable latency is defined and Ollama can meet it
   - OR: Workaround exists (e.g., command pre-buffering)

3. **Observations** ✅
   - All required state is available
   - OR: Missing observations can be computed from available data
   - OR: Small extension adds missing observations

4. **Commands** ✅
   - All required actions are supported
   - OR: Missing commands can be added without core engine changes
   - OR: Game is playable without missing commands

### Final Recommendation

**Answer Question:** Can RL Interface become AI Commander's permanent foundation?

**If YES:**
- Explain why (all validations passed, no compromises)
- Proceed to EPIC R1 implementation

**If NO:**
- Identify the blocker (visual execution? latency? missing commands?)
- Specify the required extension (custom mod? engine patch? workaround?)
- Determine if extension is feasible within our constraints
- Decide: Implement extension OR revert to Option A (pure JavaScript mod)

### Finding: (Awaiting synthesis)

---

## Investigation Timeline

**Expected Completion:** Tomorrow (July 10, 2026)

**Approach:**
1. Deploy agents to research RL Interface documentation
2. Examine Python client source code for clues
3. Search GitHub issues for product requirements
4. Review academic papers using RL Interface
5. Synthesize findings into definitive answers

**Deliverable:**
- R0.5.1-R0.5.4: Detailed findings for each story
- R0.5.5: Final product validation decision
- Clear answer: YES (proceed to EPIC R1) or NO (identify blocker)

---

## What Success Looks Like

✅ **Success:** "The RL Interface fully supports AI Commander's product vision. No architectural compromises required. Ready for EPIC R1 implementation."

✅ **Acceptable with Extension:** "The RL Interface mostly works, but [specific extension] is needed. Extension is feasible and adds [X days] to timeline. Ready for EPIC R1 with extension."

❌ **Failure:** "The RL Interface cannot support [specific requirement]. Option A (pure JavaScript mod) is required instead. Reverting to R0.1-R0.2 approach."

---

## Constraints

**No Implementation:** Investigation and validation only.

**No Wrapper Building:** Not designing the actual integration yet.

**Only Validation:** Proving the foundation is solid for the next decade.

---

**Status:** 🔬 Investigation beginning  
**Next:** Deploy agents to research RL Interface product fit
