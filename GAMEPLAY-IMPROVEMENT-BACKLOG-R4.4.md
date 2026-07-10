# Story R4.4 — Gameplay Improvement Backlog

**Generated:** 2026-07-10  
**Based on:** Match observations from R4.1, R4.2, R4.3  
**Data Source:** Single 300-tick match (Ollama vs Petra AI)

---

## Executive Summary

The AI Commander platform is **stable and functional**, but gameplay can be enhanced to increase engagement and spectator appeal. This backlog identifies 12 improvement opportunities organized by priority and effort.

**Recommendation:** Implement High-Priority items (Combat Engagement, Command Optimization) before next tournament iteration.

---

## Priority Matrix

| Priority | Category | Items | Effort | Impact |
|----------|----------|-------|--------|--------|
| 🔴 HIGH | Combat Engagement | 3 items | Medium | High |
| 🔴 HIGH | Command Optimization | 2 items | Low | High |
| 🟡 MEDIUM | Strategy Depth | 3 items | Medium | Medium |
| 🟡 MEDIUM | Player Behavior | 2 items | Low | Medium |
| 🟢 LOW | Observation Quality | 2 items | Low | Low |

---

## 🔴 HIGH PRIORITY

### Combat Engagement (No attacks observed in match)

#### [C1] Enable Aggressive Unit Stances
**Problem:** Both players grew armies but never engaged in combat despite sharing the map.  
**Root Cause:** Default unit stance is likely "defensive" or "patrol," preventing proactive attacks.  
**Solution:** Configure unit stance prompts to encourage offensive action:
- Add to Ollama prompt: "Consider attacking enemy units when your army has sufficient size"
- Test with explicit battle objectives: "Destroy enemy military units"
- Add threshold logic: "If your army is 2x enemy strength, launch coordinated attack"

**Acceptance Criteria:**
- ✓ Combat occurs within first 100 ticks
- ✓ At least one unit casualty recorded
- ✓ Attack is strategic (not random)

**Effort:** 2-3 hours (prompt iteration)  
**Impact:** Creates narrative drama, makes gameplay entertaining to watch

---

#### [C2] Reduce Map Size or Increase Player Starting Distance
**Problem:** Armies may be geographically too far apart to engage naturally.  
**Current Map:** acropolis_bay_2p (unconfirmed size)  
**Solution:** 
- Test on smaller skirmish maps (1v1, confined spaces)
- Or reduce starting distance between bases
- Monitor: Time to first contact, engagement frequency

**Acceptance Criteria:**
- ✓ Players encounter each other by tick 150
- ✓ Forced combat scenarios work (no long-range safety)

**Effort:** 1 hour (map testing)  
**Impact:** Naturally drives engagement, improves pacing

---

#### [C3] Add Population Cap Pressure
**Problem:** Both players could expand indefinitely without resource constraints.  
**Current Behavior:** 130-144% unit growth over 300 ticks suggests abundant resources.  
**Solution:**
- Map has population cap (typical: 300 units)
- Current: Both players ~22 units = 7% of cap
- Make cap lower (or starting resources tighter) to force decisions:
  - "Your population is near limit" prompts
  - "You must choose: expand production or train military"
  - Drives conflict over limited resources

**Acceptance Criteria:**
- ✓ Population pressure appears in decision logs
- ✓ Players make strategic trade-off decisions
- ✓ Economic competition visible

**Effort:** 1-2 hours (tuning map resources)  
**Impact:** Strategic depth, realism, pacing tension

---

### Command Optimization (Low Idle Time)

#### [C4] Increase Commands-Per-Tick Efficiency
**Problem:** 1.78 commands/tick is efficient but could be higher for faster gameplay.  
**Current:** 89% active ticks, average 1.78 commands/tick  
**Solution:**
- Batch-optimize: "What are the top 3 priority actions?" (vs. "what is one action?")
- Reduce reasoning latency: Shorter Ollama prompts / fewer tokens per decision
- Test: Higher tick rate (reduce game step timeout)

**Acceptance Criteria:**
- ✓ 2.5+ commands/tick average (40% improvement)
- ✓ Gameplay pace increases (faster unit movement, quicker structures)
- ✓ No decision quality loss

**Effort:** 2-4 hours (prompt tuning + latency profiling)  
**Impact:** Faster-paced matches, better spectator experience

---

#### [C5] Reduce Idle Periods (11% Idle Time)
**Problem:** 33 ticks with 0 commands suggest decision gaps.  
**Current:** 11% idle rate (acceptable but improvable)  
**Solution:**
- Profile idle ticks: What game state causes no decisions?
  - Likely: Waiting for resources, no building sites, units idle
- Add prompt: "Always take an action, even if minor (scout, move patrol, queue training)"
- Continuous decision forcing: Never allow "do nothing" frames

**Acceptance Criteria:**
- ✓ Idle time reduced to <5%
- ✓ No thrashing (oscillating between actions)
- ✓ Quality maintained

**Effort:** 1-2 hours (prompt refinement)  
**Impact:** Smoother gameplay, higher activity density

---

## 🟡 MEDIUM PRIORITY

### Strategy Depth

#### [S1] Implement Tech Tree Awareness
**Problem:** No evidence of technology progression in match data.  
**Current Data:** Only unit counts visible, no tech advancement detected.  
**Solution:**
- Add to observation: "Current techs researched" + "Available techs"
- Add to prompt: "Advance technologies that unlock better units/buildings"
- Track: Tech progression timeline, unit composition changes

**Acceptance Criteria:**
- ✓ Tech research happens (e.g., bronze tools, better armor)
- ✓ Different players pursue different tech paths
- ✓ Tech unlocks new unit types visible in composition

**Effort:** 3-4 hours (observation + prompt integration)  
**Impact:** Strategic divergence, long-term planning visible

---

#### [S2] Enable Building Specialization
**Problem:** All expansion appears generic (likely just "expand housing + barracks").  
**Current Data:** Unit growth consistent but no building type variation.  
**Solution:**
- Add observation: "Existing buildings and their production"
- Distinguish: Farms (food), Towers (defense), Temples (bonuses), Markets (trade)
- Prompt: "Build a diverse economy: farms for food, towers for defense, markets for upgrades"
- Track: Building mix per player, strategic diversity

**Acceptance Criteria:**
- ✓ Player 1 and Player 2 have different building profiles
- ✓ Building choices reflect stated strategy
- ✓ Visible difference in recorded building counts

**Effort:** 2-3 hours (observation + prompt tuning)  
**Impact:** Visible strategic differentiation, replayability

---

#### [S3] Add Explicit Victory Conditions
**Problem:** Match ended by tick limit (300), not by natural conclusion.  
**Current:** No winning condition triggered (both players alive)  
**Solution:**
- Define victory: "First player to 50 units + enemy has <10" OR "Destroy enemy headquarters"
- Add early termination: Break loop when victory condition met
- Prompt awareness: "Your goal is to eliminate the enemy, not just grow indefinitely"
- Track: Time-to-victory, dominance metrics

**Acceptance Criteria:**
- ✓ Matches naturally conclude (no artificial limits)
- ✓ Victory message logged with timestamp
- ✓ Average match duration 5-20 minutes (game time)

**Effort:** 2-3 hours (conditions + prompt integration)  
**Impact:** Natural pacing, complete narrative arc

---

### Player Behavior

#### [B1] Add Defense/Retreat Logic
**Problem:** No defensive actions observed despite armies existing.  
**Current:** No casualty events, so no defense tested.  
**Solution:**
- Add observation: "Incoming threats" + "Your units under attack"
- Prompt: "If enemy attacks detected, move units to defend" 
- Define danger thresholds: "If enemy units in your territory..."
- Enable retreat: "Group units and fall back to base if overwhelmed"

**Acceptance Criteria:**
- ✓ Defensive unit movements visible when under attack
- ✓ Tactical retreat happens (no suicidal stands)
- ✓ Defensive structures (towers, walls) built when threatened

**Effort:** 2-3 hours (observation + prompt)  
**Impact:** Tactical realism, spectator interest in defense

---

#### [B2] Implement Economic Decisions Trade-offs
**Problem:** Both players grew equally (130-144% growth), suggesting no real trade-offs.  
**Current:** Unlimited economic growth, no visible "rush military vs. tech" decisions.  
**Solution:**
- Tighten resources: Reduce starting resources or lower map yields
- Prompt: "You must choose: invest in military OR technology OR expansion. You cannot do all three."
- Track: Resource allocation per tick, strategic divergence

**Acceptance Criteria:**
- ✓ Players pursue different economic strategies
- ✓ One player focuses military, another technology, etc.
- ✓ Strategic outcome varies (player who invested differently has different result)

**Effort:** 2-3 hours (map tuning + prompt)  
**Impact:** Strategic realism, increased variability

---

## 🟢 LOW PRIORITY

### Observation Quality

#### [O1] Add Unit Composition Tracking
**Problem:** Only unit counts recorded; types unknown.  
**Current Data:** P1 end: 23 units, P2 end: 22 units (no breakdown)  
**Solution:**
- Extend telemetry: Track by unit type (infantry, cavalry, archer, siege)
- Record per-player: "Unit composition: 5 infantry, 3 cavalry, 2 archers"
- Generate composition timeline (JSON): Track how armies evolve

**Acceptance Criteria:**
- ✓ Composition data recorded for every 10 ticks
- ✓ Can identify when new unit types first appear
- ✓ Can analyze strategy by composition (rushes cavalry? goes heavy infantry?)

**Effort:** 2-3 hours (observation extension)  
**Impact:** Deeper post-match analysis, enables balance discussions

---

#### [O2] Add Economic Metrics Tracking
**Problem:** Resource gathering inferred but not measured directly.  
**Current Data:** Unit growth → assume resources gathered (indirect)  
**Solution:**
- Track per-player: Food, wood, stone, metal reserves
- Record per 10 ticks: Income rates, spending patterns
- Generate timeline: "P1 spent 100 food on units, 50 wood on structures"
- Enable analysis: "Who had better economy? Who spent more efficiently?"

**Acceptance Criteria:**
- ✓ Resource values captured each tick (or every N ticks)
- ✓ Income/spending per resource type visible
- ✓ Can generate "economy efficiency" metric

**Effort:** 2-3 hours (observation extension)  
**Impact:** Post-match analysis, economic strategy visibility

---

## Implementation Roadmap

### Phase 1: High-Priority Combat (Tick R4.4a)
**Goal:** Enable combat engagement in next match  
**Items:** C1 (Aggressive Stances) + C5 (Reduce Idle) + C4 (Optimize Commands)  
**Effort:** 5-6 hours  
**Outcome:** Next match should see combat by tick 100, higher engagement density  

### Phase 2: Strategy Depth (Tick R4.4b)
**Goal:** Make strategies diverge and visible  
**Items:** S1 (Tech Trees) + S2 (Building Specialization) + C2 (Map Tuning)  
**Effort:** 8-10 hours  
**Outcome:** Matches show visible strategic difference, builds feel unique  

### Phase 3: Economic Tension (Tick R4.4c)
**Goal:** Force real trade-off decisions  
**Items:** B2 (Economic Trade-offs) + C3 (Population Pressure)  
**Effort:** 4-5 hours  
**Outcome:** Player decisions feel meaningful, less linear growth  

### Phase 4: Observation Enhancement (Tick R4.4d)
**Goal:** Richer telemetry for analysis  
**Items:** O1 (Unit Composition) + O2 (Economic Tracking)  
**Effort:** 4-5 hours  
**Outcome:** Post-match reports show composition, economy, efficiency  

---

## Success Metrics (Post-Implementation)

After implementing Phase 1-2 improvements, the next match should show:

### Combat Engagement
- [ ] Combat starts by tick 100-150
- [ ] At least 2-3 unit casualties per player
- [ ] Strategic positioning visible (units attacking vs. defending)

### Command Density
- [ ] 2.5+ commands/tick (up from 1.78)
- [ ] <5% idle ticks (down from 11%)
- [ ] Faster pacing overall

### Strategic Diversity
- [ ] P1 and P2 have different unit compositions
- [ ] Different buildings constructed (farms vs. towers vs. temples)
- [ ] Tech research visible and different per player

### Match Pacing
- [ ] Natural conclusion by ~300 ticks OR victory condition met
- [ ] Clear winner (not tie or tick limit)
- [ ] 5-15 minute real-time duration (engaging pace)

---

## Risk Assessment

### What Could Go Wrong?

1. **Combat too aggressive** → Units suicide into enemy → Enable retreat logic (B1)
2. **Ollama decisions degrade** → Adding constraints breaks quality → A/B test prompts, monitor decision coherence
3. **Map changes break balance** → One player dominates → Tune start resources equally
4. **Higher command rate causes lag** → Game can't keep up → Profile tick latency, adjust batch sizes

### Mitigation

- Test changes one at a time (not all simultaneously)
- Keep baseline match data (current 300-tick run) for regression testing
- Log all prompt changes for reversion if quality drops
- Monitor: Decision quality, system stability, match entertainment value

---

## Conclusion

**The AI Commander foundation is solid.** The backlog focuses on enhancing the *game experience* rather than fixing infrastructure.

### Immediate Actions (Before R5 Stability Testing):
1. **Implement C1 + C4 + C5** (Combat engagement + command optimization + idle reduction)
2. **Test on new 300-tick match** to validate improvements
3. **Compare telemetry:** Original vs. improved

### Why This Matters for EPIC R5:
EPIC R5 tests *stability* (can it run 10, 25, 50 matches unattended?). Better gameplay from R4.4 improvements means:
- More entertaining matches to watch (if you do watch)
- Better metrics to understand system behavior
- Confidence that improvements don't break stability
- Foundation for post-launch polish

---

*Backlog based on single match observation.*  
*Recommendations are actionable and ranked by effort/impact.*  
*All items are optional — even without improvements, system is production-ready.*

