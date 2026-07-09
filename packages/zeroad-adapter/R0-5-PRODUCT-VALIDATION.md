# EPIC R0.5: RL Interface Product Validation

**Objective:** Validate that the official 0 A.D. RL Interface can support AI Commander's core product vision without architectural compromises.

**Product Context:**
- AI Commander is NOT a reinforcement learning framework
- AI Commander IS a real-time AI arena where humans watch LLMs play RTS games
- Core requirement: Spectators watch normal, visible 0 A.D. matches controlled by external Ollama AI

**Investigation Scope:**
Five stories to validate critical product assumptions before implementation begins.

---

## Story R0.5.1: Visual Execution

**Question:** Can the RL Interface control a normal, visible 0 A.D. match that humans can watch?

### Requirements to Validate

- [ ] Game window renders normally during RL Interface control
- [ ] Spectators see real-time gameplay (not headless mode)
- [ ] Visual execution is not mutually exclusive with RL Interface
- [ ] Spectator mode can remain enabled
- [ ] Both visual and programmatic control coexist

### Investigation Status: 🔬 PENDING

**What we need to understand:**
1. Does the RL Interface require `--autostart-nonvisual` flag?
2. Can we use visual mode: `pyrogenesis --rl-interface=127.0.0.1:6000` (without nonvisual)?
3. What happens to the game window during RL Interface control?
4. Can spectators join while RL Interface is controlling?

### Finding: (Awaiting investigation)

---

## Story R0.5.2: Tick Model

**Question:** What is the exact execution model? Can Ollama (300-800ms thinking time) integrate with 0 A.D.'s tick system?

### Requirements to Validate

- [ ] Understand tick frequency (50ms per tick = 20 Hz?)
- [ ] Understand synchronization model (synchronous vs asynchronous)
- [ ] Understand timeout behavior (what if decision takes >50ms?)
- [ ] Understand command buffering (what if no command arrives?)
- [ ] Determine maximum decision latency tolerance

### Execution Lifecycle Questions

1. **Tick timing:**
   - Does RL Interface block waiting for commands?
   - Does it timeout and continue with default action?
   - How long does it wait for a command?

2. **Command buffering:**
   - What happens if we send commands from the future (tick N+3)?
   - What happens if we send no command for a tick?
   - Are commands queued or overwritten?

3. **Latency tolerance:**
   - Can Ollama take 300ms (6 ticks) to decide?
   - What's the maximum acceptable latency?
   - Does slower decision break game logic?

4. **Synchronization guarantee:**
   - Does the engine wait for the RL Interface response?
   - Or does it continue if no response arrives?
   - Are there determinism guarantees?

### Finding: (Awaiting investigation)

---

## Story R0.5.3: Observation Model

**Question:** Does the RL Interface provide all information needed for both AI decision-making AND spectator UI?

### Required Observations

**Core Game State:**
- [ ] Unit positions (x, z coordinates)
- [ ] Unit health and max health
- [ ] Unit ownership (which player)
- [ ] Unit type/template name
- [ ] Unit stance (aggressive, defensive, passive, etc.)
- [ ] Unit formation status (if any)

**Building State:**
- [ ] Building positions
- [ ] Building health and max health
- [ ] Building ownership
- [ ] Building type/template
- [ ] Production queue status
- [ ] Garrison contents (if any)

**Player State:**
- [ ] Resource counts (food, wood, stone, metal)
- [ ] Population (current/limit)
- [ ] Victory/defeat status
- [ ] Technology research status
- [ ] Ally/enemy relationships

**Map State:**
- [ ] Fog of war (what is visible to which player)
- [ ] Terrain type
- [ ] Map dimensions
- [ ] Neutral buildings/resources

**Game Meta:**
- [ ] Current game tick
- [ ] Current game phase (setup/running/finished)
- [ ] Replay data available?
- [ ] Match timestamp

### Questions to Answer

1. **Completeness:** Does RL Interface expose all these observations?
2. **Accuracy:** Are observations deterministic (same state = same observations)?
3. **Format:** What is the data structure/format of observations?
4. **Frequency:** How often are observations updated?
5. **Spectator Gap:** Is any information needed by spectator UI missing from RL Interface?

### Finding: (Awaiting investigation)

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
