# ADR-0003: Module Boundaries

**Status:** Approved and Implemented

**Date:** 2026-06-30

**Author:** Claude Code (Principal Software Engineer)

---

## Context

Each package in AI Commander will expose public APIs (functions, types, classes) that other packages depend on. Without clear rules about what is public vs. private, the system risks:

- Packages depending on implementation details instead of interfaces
- Implementation changes breaking dependent code
- Unstable APIs that change frequently
- Internal refactoring becoming blocked by external dependencies

The team needed to establish clear boundaries between:

- What each package exposes as its public API
- What is internal implementation
- How packages can be modified without breaking dependents

---

## Decision

**Each package has an explicit public API consisting only of exports from index.ts. Everything not exported is internal implementation. Packages depend only on public APIs, never on internal implementation.**

### Public API Definition

A package's public API consists of:

1. **Exported Types** — Interfaces and type aliases in index.ts
2. **Exported Classes** — Classes and constructors in index.ts
3. **Exported Functions** — Functions in index.ts
4. **Exported Constants** — Named constants in index.ts

**Example:**

```typescript
// packages/engine/src/index.ts
export { Engine } from './engine.js'; // Public: class
export type { EngineConfig } from './types/engine-config.js'; // Public: interface

// Anything not exported is internal
// - Coordinator class (not exported)
// - Internal types (not exported)
// - Helper functions (not exported)
```

### Package Structure

```
packages/[name]/
├── src/
│   ├── index.ts              # PUBLIC API (all exports here)
│   ├── [implementation]/      # INTERNAL (never imported from outside)
│   └── types/                 # INTERNAL unless exported from index.ts
└── tests/
    └── [any structure]        # Test internals don't matter
```

### Stability Guarantees

The public API is subject to semantic versioning:

**MAJOR.MINOR.PATCH**

- **MAJOR** — Changes to public API (breaking changes)
- **MINOR** — New exports added (backward compatible)
- **PATCH** — Bug fixes (backward compatible)

**What Can Change Without Version Bump:**

- Internal implementations (anything not exported)
- Internal type definitions
- Internal files and module structure
- Performance improvements
- Bug fixes in internal behavior

**What Requires Version Bumps:**

- Adding required parameter to public function → MAJOR
- Removing public export → MAJOR
- Adding new public export → MINOR
- Renaming public export → MAJOR
- Changing public interface signature → MAJOR

### Cross-Package Imports

**Allowed:**

```typescript
// ✅ Import from index.ts (public API)
import { Engine } from '@ai-commander/engine';
import type { EngineConfig } from '@ai-commander/engine';
```

**Forbidden:**

```typescript
// ❌ Import from internal implementation
import { Coordinator } from '@ai-commander/engine/dist/coordinator';

// ❌ Import from internal file (not in index.ts)
import { someHelper } from '@ai-commander/engine/src/helpers';

// ❌ Depend on internal types
import type { InternalState } from '@ai-commander/engine/src/internal-state';
```

### Interface-Based Contracts

Public APIs should be defined as interfaces, not implementations:

**Preferred:**

```typescript
// Public API defines interface
export interface World {
  createEntity(id: string): void;
  addComponent(entityId: string, component: Component): void;
  getEntity(id: string): Entity | undefined;
}

// Implementation is private
class WorldImpl implements World {
  // Internal details
}

export function createWorld(): World {
  return new WorldImpl();
}
```

**Not Preferred:**

```typescript
// Exposing implementation directly
export class World {
  // Public implementation
}
```

The interface-based approach allows internal refactoring without breaking code that depends on the package.

### Making Changes to Public APIs

**Adding a New Export:**

```typescript
// OLD (version 1.0.0)
export { Engine } from './engine.js';

// NEW (version 1.1.0)
export { Engine } from './engine.js';
export { Coordinator } from './coordinator.js'; // New export
```

- Backward compatible ✅
- MINOR version bump required

**Changing Export Signature:**

```typescript
// OLD (version 1.0.0)
export class Engine {
  constructor(config: EngineConfig);
}

// NEW (version 2.0.0)
export class Engine {
  constructor(config: EngineConfig, logger: Logger); // Added required param
}
```

- Breaking change ❌
- MAJOR version bump required

**Removing Export:**

```typescript
// OLD (version 1.0.0)
export { Coordinator } from './coordinator.js';

// NEW (version 2.0.0)
// (removed)
```

- Breaking change ❌
- MAJOR version bump required

---

## Consequences

### Positive

1. **Freedom to Refactor** — Internal code can be rewritten without breaking dependents
2. **Clear Contracts** — Index.ts documents what's guaranteed
3. **Composability** — Small, focused APIs are easier to understand
4. **Versioning Clarity** — Changes to public API trigger version bumps
5. **Performance Optimization** — Internal optimizations don't break contracts
6. **Testing Independence** — Internal implementation can be tested in isolation

### Challenges

1. **API Design Discipline** — Must think about public interfaces carefully
2. **Limited Flexibility for Dependents** — Can't reach into internals for shortcuts
3. **Potential for Over-Exporting** — Temptation to export everything for convenience
4. **Documentation Burden** — Must document public APIs clearly

### Mitigations

1. **Index.ts Review** — Always review what's exported and why
2. **Code Review** — Catch internal imports during review
3. **TypeScript Configuration** — Could enforce via module resolution rules (future)
4. **Documentation** — Each export should be documented
5. **Semantic Versioning** — Clear versioning prevents surprise breaks

---

## Enforcing Boundaries

### Via Code Review

1. **Check all imports** — Verify imports come from public APIs
2. **Review index.ts** — Ensure only intentional exports are public
3. **Question implementation imports** — Flag imports like `src/internal`

### Via TypeScript

Currently: Manual enforcement via import statements.

Future options:

- TypeScript path aliases to restrict access
- Custom ESLint rules to catch internal imports
- Barrel file organization to make boundaries clear

### Via Testing

- Public API has integration tests
- Internal implementation has unit tests
- Tests use only public APIs
- Internal testing done within package

---

## Current Implementation

**Status:** Implemented

**Example - Engine Package:**

```typescript
// packages/engine/src/index.ts
export { Engine } from './engine.js';
export type { EngineConfig } from './types/engine-config.js';

// Everything else is internal:
// - Coordinator (not exported)
// - StateManager (not exported)
// - InternalTypes (not exported)
```

**Example - Domain Package:**

```typescript
// packages/domain/src/index.ts
export type { Entity } from './types/entity.js';
export type { Agent } from './types/agent.js';
export type { GameState } from './types/game-state.js';
export type { Action } from './types/action.js';
export type { Event } from './types/event.js';

// All types are exported because Domain is pure types
```

---

## Adding New Packages

When creating a new package:

1. **Start with index.ts** — Decide what's public before implementation
2. **Minimal Exports** — Export only what's necessary
3. **Interface-Based** — Define interfaces for extension points
4. **Document Why** — Comments explain what's public and why
5. **Test Public APIs** — Integration tests use public APIs only

---

## Implementation Evolution

As the framework evolves, public APIs may need to change. Process:

1. **Notice the Need** — A limitation prevents proper implementation
2. **Consider Alternatives** — Can we work within current API?
3. **ADR (if needed)** — Document the breaking change and alternatives
4. **Implement** — Change API and all implementations
5. **Bump Version** — MAJOR version for breaking changes
6. **Document** — Migration guide in release notes
7. **Deprecation** — If possible, deprecate old API in prior version

---

## Related ADRs

- ADR-0001: Repository Architecture — How packages are organized
- ADR-0002: Dependency Direction — How packages depend on each other
- ADR-0004: Package Naming Conventions — How to name public exports

---

## References

- `.foundation/docs/ARCHITECTURE.md` — Full architecture specification
- [Semantic Versioning](https://semver.org/) — Version specification
- [Public API Design](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Maintaining Library Compatibility](https://www.semver-ftw.org/)
