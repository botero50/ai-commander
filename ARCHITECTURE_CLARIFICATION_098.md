# Story 098 Architecture Clarification: Candidate Goal Count

## Question

Does the "3 candidate goals" implementation represent:

**A)** A demonstration dataset (pipeline supports any count), OR  
**B)** A pipeline limitation (exactly 3 goals required)?

---

## Answer: **(A) Demonstration Dataset — Pipeline is Fully Generic**

The evaluation pipeline supports **ANY number of candidate goals**. The reference implementation uses 3 candidates **for demonstration clarity only**, not as a technical requirement.

---

## Evidence

### 1. Pipeline Layers Are Generic

#### **GoalEvaluator**
```typescript
selectGoal(candidateGoals: readonly Goal[], ...): GoalSelectionResult
```
- Parameter: `candidateGoals` (untyped array length)
- Framework implementation: No count assumptions
- ✅ Evaluates N goals for any N ≥ 1

#### **Trace Recording**
```typescript
recordGoalCandidatesEvaluated(evaluations: any[]): void {
  this.addEvent('goal_candidates_evaluated', {
    candidateCount: evaluations.length,  // ← Stores actual count
    evaluations: evaluations.map(...)     // ← Maps over all
  });
}
```
- No hardcoded limit of 3
- Records actual count from evaluations
- ✅ Works for any count

#### **Dashboard Rendering**
```javascript
state.mission.goalCandidates.map(candidate => {
  // Render each candidate
})
```
- Iterates over array length (dynamic)
- No assumptions about count
- ✅ Scales to 2, 3, 5, 10+ goals

#### **DashboardIntegration.extractGoalCandidates()**
```typescript
const evaluations = candidatesEvent.data.evaluations || [];
return Object.freeze(evaluations.map(...))  // ← Maps all N
```
- Extracts `evaluations` array from trace
- Maps over actual length
- ✅ Works for any count

#### **TimelineInspector.extractGoalCandidates()**
```typescript
const evaluations = candidatesEvent.data.evaluations || [];
return evaluations.map((evaluation) => ({...}))  // ← Maps all N
```
- Same pattern: map over actual array
- ✅ Deterministic for any count

### 2. The "3 Goals" Are Isolated to Demonstration Data

Only **one place** creates candidate goals: `MissionAgent.createCandidateGoals()`

```typescript
private createCandidateGoals(): any[] {
  const primaryGoal = this.currentGoal;
  
  const exploreGoal = createGoal({
    id: createGoalId('explore'),
    intent: 'explore-world',
    status: GoalStatus.Pending,
    priority: createGoalPriority(GoalPriorityLevel.LOW),
    parameters: { radius: 50 },
  });
  
  const defendGoal = createGoal({
    id: createGoalId('defend'),
    intent: 'defend-position',
    status: GoalStatus.Pending,
    priority: createGoalPriority(GoalPriorityLevel.HIGH),
    parameters: { position: { x: this.targetX, y: this.targetY } },
  });

  // Return array - order, count, and content are flexible
  return [primaryGoal, exploreGoal, defendGoal];  // ← Only hardcoded location
}
```

This method:
- ✅ Is cleanly separated
- ✅ Documents its purpose (demonstration)
- ✅ Can be modified without touching other code
- ✅ Is explicitly NOT part of the evaluator

### 3. Test Evidence

```typescript
it('should handle single candidate goal', async () => {
  const result = evaluator.selectGoal([goal], worldState, 1);
  expect(result.allEvaluations.length).toBe(1);  // ✅ Works with 1
});

it('should handle many candidate goals', async () => {
  const goals = Array.from({ length: 10 }, ...);  // 10 goals
  const result = evaluator.selectGoal(goals, worldState, 1);
  expect(result.allEvaluations.length).toBe(10);  // ✅ Works with 10
});
```

Tests verify pipeline works for 1, 3, and 10 candidates. No test assumes exactly 3.

---

## How to Add a 4th Candidate Goal

**No code changes required outside `createCandidateGoals()`:**

```typescript
private createCandidateGoals(): any[] {
  const primaryGoal = this.currentGoal;
  const exploreGoal = createGoal({ ... });
  const defendGoal = createGoal({ ... });
  const rescueGoal = createGoal({  // ← Add new goal
    id: createGoalId('rescue'),
    intent: 'rescue-allies',
    status: GoalStatus.Pending,
    priority: createGoalPriority(GoalPriorityLevel.NORMAL),
    parameters: { location: { x: 100, y: 100 } },
  });

  return [primaryGoal, exploreGoal, defendGoal, rescueGoal];  // ← Updated array
  // ✅ Evaluator handles it
  // ✅ Trace records it
  // ✅ Dashboard renders it
  // ✅ Historical reconstruction works
}
```

That's **the only change needed**. All other layers adapt automatically.

---

## Why 3 Goals in the Demo?

Three is a useful number for demonstration because:
- Shows multiple competing goals (observability goal of Story 098)
- Demonstrates priority conflict (defend goal = HIGH priority but not primary mission)
- Fits on screen clearly
- Illustrates ranking and factor breakdown well

But this is **design for clarity**, not a technical limitation.

---

## Conclusion

✅ **Answer: (A) Demonstration Dataset**

The pipeline is fully generic and supports any number of candidate goals (1, 2, 3, 5, 10, etc.). The reference implementation uses 3 candidates for demonstration purposes. To extend it:

1. Modify `MissionAgent.createCandidateGoals()` (one method only)
2. Add or remove goal creation lines
3. Update the return array
4. **Zero changes** to evaluator, trace, dashboard, or inspection layers

The architecture requires only **one assumption**: that at least one candidate goal exists (which `GoalEvaluator.selectGoal()` enforces via guard clause). All other aspects are completely flexible.

---

## Refactoring Applied

To make this clarity explicit in code:

1. ✅ Extracted `createCandidateGoals()` method
2. ✅ Added documentation explaining it's for demonstration
3. ✅ Updated test file with architectural note
4. ✅ Updated DELIVERABLE.md with "Adding More Goals" section
5. ✅ Verified all pipeline layers handle arbitrary counts

**Status:** Ready for Story 099 with full architectural clarity.
