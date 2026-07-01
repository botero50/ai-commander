# ADR-0005: Public API Policy

**Status:** Approved and Implemented

**Date:** 2026-06-30

**Author:** Claude Code (Principal Software Engineer)

---

## Context

As AI Commander grows, packages will provide APIs for other packages and applications to use. Without clear policies about what is API and what is implementation:

- Applications build dependencies on internal details
- Internal changes require version bumps
- Refactoring becomes impossible
- Package evolution stalls

The team needed policies about:

- What constitutes the public API
- What stability guarantees apply to different API types
- How APIs evolve over time
- What happens when requirements change

---

## Decision

**Adopt a multi-tier API policy that clearly distinguishes between stable public APIs, new features under development, and internal implementation details.**

### API Tiers

#### Tier 1: Stable Public API

**Definition:** Core APIs guaranteed to remain compatible across minor versions.

**Characteristics:**

- Defined in TypeScript interfaces
- Exported from index.ts
- Documented with examples
- Used by multiple packages internally
- Tested with integration tests

**Stability Guarantees:**

- May add optional parameters → MINOR version
- May add new methods to classes → MINOR version
- Signature cannot change → would be MAJOR
- Cannot remove → would be MAJOR

**Example:**

```typescript
// Stable API - guaranteed compatible
export interface World {
  createEntity(id: string): void;
  addComponent(entityId: string, component: Component): void;
  getEntity(id: string): Entity | undefined;
}
```

If requirements change, evolve carefully:

```typescript
// Adding new method - MINOR version ✅
export interface World {
  createEntity(id: string): void;
  addComponent(entityId: string, component: Component): void;
  getEntity(id: string): Entity | undefined;
  getAllEntities(): readonly Entity[]; // New - backward compatible
}

// Changing signature - MAJOR version ❌
export interface World {
  createEntity(id: string, priority: number): void; // Breaking change!
}
```

#### Tier 2: New Experimental APIs

**Definition:** New APIs being tested before stability commitment.

**Characteristics:**

- Not widely used
- May change based on feedback
- Marked with `@experimental` JSDoc tag
- Clear upgrade path documented
- Used by 0-2 packages

**Stability Guarantees:**

- May change signature → MINOR version (with migration guide)
- May be removed → MINOR version (with deprecation period)
- Feedback welcome in issues

**Example:**

```typescript
/**
 * @experimental This API is under development and may change in minor versions.
 * Feedback welcome: see issue #123
 */
export interface AdvancedPlanner extends Planner {
  planWithConstraints(goal: Goal, constraints: PlanningConstraint[]): Plan;
}
```

#### Tier 3: Internal Implementation

**Definition:** Code not exported from index.ts.

**Characteristics:**

- Implementation details
- Internal helpers and utilities
- May change without notice
- Not documented in release notes
- Not part of versioning contract

**Stability Guarantees:**

- Can be completely rewritten → PATCH version
- Can change signatures → PATCH version
- Can be removed → PATCH version
- Internal changes never break external code

**Example:**

```typescript
// Not exported - completely internal
class _StateManager {
  // Can change completely - internal only
  private _updateState(delta: GameStateDelta) {
    // ...
  }
}
```

### Evolution Process

When an API needs to change:

**For Stable APIs (breaking change required):**

1. **Assess** — Is the change truly necessary? Consider alternatives.
2. **ADR** — Document the decision and rationale
3. **Deprecate** — Mark old API with `@deprecated` tag
4. **Guide** — Provide migration example in docs
5. **Communicate** — Release notes explain change
6. **Bump** — MAJOR version bump
7. **Support** — Help users migrate

```typescript
/**
 * @deprecated Use `planWithContext()` instead
 * @example
 * // Old way
 * const plan = planner.plan(goal);
 *
 * // New way
 * const plan = planner.planWithContext(goal, context);
 */
export function plan(goal: Goal): Plan {
  // Still works, but marked deprecated
}

export function planWithContext(goal: Goal, context: PlanningContext): Plan {
  // New API
}
```

**For Experimental APIs:**

1. **Gather Feedback** — Collect real usage feedback
2. **Iterate** — Based on feedback, refine design
3. **Stabilize** — When satisfied, remove `@experimental` tag
4. **Commit** — Now subject to semantic versioning

**For Internal APIs:**

1. **No Announcement** — Change quietly, internal concern only
2. **No Deprecation** — No need to warn about internal changes
3. **Update Docs** — If any, update internal documentation

### API Categories

#### Configuration APIs

APIs for providing configuration to components:

```typescript
export interface EngineConfig {
  tickRate: number;
  maxTicks?: number;
  debug?: boolean;
}
```

**Policy:**

- May add optional fields → MINOR
- Cannot remove fields → would be MAJOR
- Cannot make optional field required → would be MAJOR
- Can change defaults → PATCH

#### Factory Functions

Functions that create instances:

```typescript
export function createWorld(): World {
  return new WorldImpl();
}
```

**Policy:**

- Return type is public contract
- Parameter changes → MAJOR
- May add optional parameters → MINOR
- Cannot remove parameters → would be MAJOR

#### Type Definitions

Interfaces and type aliases:

```typescript
export interface Entity {
  readonly id: string;
  readonly type: string;
}
```

**Policy:**

- May add optional properties → MINOR
- Cannot remove properties → would be MAJOR
- Cannot make optional required → would be MAJOR
- Can change property types → depends (might be MAJOR)

#### Methods on Classes

Methods are part of the public contract:

```typescript
export class Engine {
  tick(): void {}
  getState(): GameState {}
}
```

**Policy:**

- Cannot remove methods → would be MAJOR
- May add methods → MINOR
- Cannot change parameter count → would be MAJOR
- May add optional parameters → MINOR
- Cannot change return type (usually) → MAJOR

### Marking APIs

Use JSDoc tags to indicate API tier:

```typescript
/**
 * Core execution engine for AI Commander.
 *
 * @public - Stable public API
 */
export class Engine {
  /**
   * Execute one game tick.
   *
   * @public
   */
  tick(): void {}

  /**
   * Enable debug mode (experimental).
   *
   * @experimental This API may change in minor versions.
   */
  enableDebug(): void {}
}

/**
 * Internal state manager.
 *
 * @internal Not part of public API
 */
class StateManager {}
```

### Documentation Policy

**Public APIs Must Have:**

- Clear description of purpose
- Parameter descriptions
- Return value description
- Example usage
- Edge cases documented
- Preconditions/postconditions

**Example:**

````typescript
/**
 * Execute one game tick, advancing agents and game state.
 *
 * Calls each agent's perception and decision logic, collects actions,
 * validates them against game rules, and updates game state.
 *
 * All agent decisions are made with the same game state snapshot,
 * ensuring deterministic behavior regardless of execution order.
 *
 * @public Stable API
 *
 * @throws {InvalidStateError} If game state is invalid
 * @throws {ConfigError} If engine not properly configured
 *
 * @example
 * ```typescript
 * const engine = new Engine(config);
 * engine.start();
 * for (let i = 0; i < 100; i++) {
 *   engine.tick();
 * }
 * ```
 *
 * @see Engine#start
 * @see Engine#stop
 */
tick(): void { }
````

### Testing Policy

**Public APIs:**

- Must have integration tests
- Must test happy path
- Must test error cases
- Tests use only public API

**Experimental APIs:**

- Have unit and integration tests
- May be fragile as API evolves
- Tests updated with API changes

**Internal APIs:**

- Have unit tests within package
- Tests access internals directly
- Can be refactored freely

---

## Consequences

### Positive

1. **Clear Expectations** — Users know which APIs are stable
2. **Freedom to Evolve** — Internal code can change freely
3. **Feedback Loop** — Experimental APIs gather real feedback
4. **Graceful Evolution** — Deprecation period for breaking changes
5. **Documentation** — Clear API tiers guide documentation effort

### Challenges

1. **Decision Making** — Must choose correct tier for new APIs
2. **Discipline** — Requires restraint not to expose internals
3. **Documentation Burden** — More documentation for public APIs
4. **Versioning Complexity** — Tracking what tier each API belongs to

### Mitigations

1. **Code Review** — Verify APIs are in correct tier
2. **Checklists** — Review checklist includes API policy
3. **Documentation Templates** — Encourage proper documentation
4. **Semantic Versioning** — Strict enforcement of version policy

---

## Current Implementation

**Status:** Implemented

**Engine Package:**

```typescript
// Stable Public API
export { Engine } from './engine.js'; // ✅ Public
export type { EngineConfig } from './types/engine-config.js'; // ✅ Public

// Will add experimental:
// export { AdvancedCoordinator } from './coordinator.js';  // @experimental
```

**Domain Package:**

All exports are type definitions (pure data). All considered stable public API:

```typescript
export type { Entity } from './types/entity.js'; // ✅ Stable
export type { Agent } from './types/agent.js'; // ✅ Stable
export type { GameState } from './types/game-state.js'; // ✅ Stable
```

**ECS Package:**

Stable public API with implementation details hidden:

```typescript
export { World } from './world.js'; // ✅ Public implementation
export type { Component } from './types/component.js'; // ✅ Public interface
export type { Entity as ECSEntity } from './types/entity.js'; // ✅ Public interface

// Internal (not exported):
// - WorldImpl details
// - Internal data structures
```

---

## Using This Policy

**When Adding New API:**

1. Decide: Stable or Experimental?
2. Mark with JSDoc: `@public` or `@experimental`
3. Document according to tier
4. Test according to tier
5. Document in README

**When Changing API:**

1. Is it public API? If yes, consider impact
2. Is it a breaking change? If yes, requires MAJOR version
3. Can you deprecate instead? Do it.
4. Update release notes explaining change

**When Using External APIs:**

1. Check JSDoc for `@experimental`
2. If experimental, expect changes
3. Check release notes before upgrading
4. Follow documented examples

---

## Related ADRs

- ADR-0003: Module Boundaries — What is public vs. private
- ADR-0001: Repository Architecture — How packages are organized

---

## References

- [Semantic Versioning](https://semver.org/)
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [TypeScript Library Stability](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- `.foundation/docs/ARCHITECTURE.md` — Architecture specification
