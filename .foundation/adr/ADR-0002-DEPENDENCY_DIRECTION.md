# ADR-0002: Dependency Direction

**Status:** Approved and Implemented

**Date:** 2026-06-30

**Author:** Claude Code (Principal Software Engineer)

---

## Context

AI Commander is structured as a layered system with multiple packages at different layers. Without explicit rules about dependency direction, the system risks:

- Circular dependencies that make builds fragile
- Hidden coupling that makes changes risky
- Lower layers depending on higher-level abstractions
- Testing nightmares where testing one component requires loading the entire system

The team needed to establish clear rules for which packages can depend on which other packages.

---

## Decision

**Enforce strict unidirectional dependency flow through the layer hierarchy. No layer may depend on layers above it. Circular dependencies are absolutely forbidden.**

### Dependency Hierarchy

```
Applications (top)
      ↓
Strategy
      ↓
Planner
      ↓
Decision
      ↓
Engine
      ↓
Core
      ↓
Domain
      ↓
Shared (bottom)
```

### Rules

1. **Downward Only** — Packages may only depend on packages in lower layers
2. **No Cycles** — Two packages may not depend on each other, even indirectly
3. **Explicit** — All dependencies must be explicit in package.json
4. **Enforced** — TypeScript composite project references prevent violations
5. **Immutable** — This rule cannot be violated under any circumstances

### Examples

**Valid Dependencies:**

```
Engine depends on Domain     ✅ (Engine layer ↓ Domain layer)
Engine depends on ECS        ✅ (Engine layer ↓ Core layer)
Strategy depends on Planner  ✅ (Strategy ↓ Planner)
```

**Invalid Dependencies:**

```
Domain depends on Engine     ❌ (lower layer ↑ higher layer)
Decision depends on Strategy ❌ (lower ↑ higher)
Engine depends on Strategy   ❌ (trying to go around layers)
Planner ↔ Decision (cycle)   ❌ (circular dependency)
```

### Enforcement Mechanism

**TypeScript Composite Projects** prevent violations through build system:

1. Each package declares its dependencies
2. TypeScript `references` define the build order
3. Compiler rejects invalid import statements
4. Build fails if circular dependency detected

**Example of enforcement:**

If `domain` tries to import from `engine`:

```typescript
// In domain/src/index.ts
import { Engine } from '@ai-commander/engine'; // ❌ Compile error
//                                               // Cannot import from higher layer
```

Result: `TS2307 - Cannot find module '@ai-commander/engine'`

The package is not visible because domain's tsconfig.json doesn't reference engine, and TypeScript won't resolve the import.

---

## Consequences

### Positive

1. **No Circular Dependencies** — Builds are predictable and fast
2. **Clear Dependencies** — It's obvious what each package depends on
3. **Testability** — Lower layers can be tested without loading higher layers
4. **Reusability** — Lower layers can be reused in different contexts
5. **Parallel Development** — Teams can develop independently within layers
6. **Compile-Time Safety** — Violations caught at build time, not runtime

### Challenges

1. **Reduced Flexibility** — Can't take shortcuts through layers
2. **Design Discipline** — Must think carefully about layer boundaries
3. **Refactoring** — Moving functionality between layers requires planning
4. **Shared Abstractions** — Sometimes tempted to put high-level concepts in lower layers

### Mitigations

1. **Clear Architecture** — ARCHITECTURE.md documents all layers and responsibilities
2. **Code Review** — Reviewers catch attempts to violate rules
3. **ADRs** — Architecture Decision Records document layers and justify structure
4. **Shared Layer** — "Shared" layer at bottom for truly generic utilities
5. **Type Safety** — TypeScript prevents most violations automatically

---

## Layer Responsibilities (Summary)

To avoid circular dependencies, each layer must be self-contained:

**Shared** — Generic utilities, logging, error types. No domain-specific logic.

**Domain** — Data structures and types. No logic, no dependencies on other layers.

**Core** — Foundational abstractions (ECS, Result types). Generic infrastructure.

**Engine** — Execution coordination. Orchestrates but doesn't make decisions.

**Decision** — Individual agent decisions. Evaluates options.

**Planner** — Sequence generation. Plans without executing.

**Strategy** — High-level behavior. Coordinates agents without dictating tactics.

**Applications** — Integration with specific games and AI systems.

---

## Implementation Status

**Status:** Implemented and enforced

**Current State:**

- ✅ Domain (no dependencies)
- ✅ ECS (depends on Domain)
- ✅ Engine (depends on Domain, ECS)
- ✅ TypeScript composite projects enforce rules
- ✅ Build fails on circular dependency attempts

**Build Verification:**

```bash
$ tsc -b --noEmit
# No errors - dependency graph is acyclic
```

---

## Adding New Packages

When adding a new package to AI Commander:

1. **Determine Layer** — Which layer does this belong to?
2. **Declare Dependencies** — List lower-layer packages in package.json
3. **Update References** — Add TypeScript reference in tsconfig.json
4. **Document** — Update ARCHITECTURE.md with new layer/package
5. **ADR (if needed)** — If adding a new layer, document the decision

---

## Violations and Remediation

### If a Circular Dependency is Discovered

1. **Stop** — Do not commit code with circular dependency
2. **Analyze** — Determine why the circular dependency exists
3. **Refactor** — One of the following options:

   **Option A: Extract Shared Abstraction**
   - Move common code to lower layer
   - Both packages depend on extracted code
   - Breaks the cycle

   **Option B: Reverse One Dependency**
   - Move functionality to higher layer
   - Lower package depends on higher package
   - Violates hierarchy (not allowed)

   **Option C: Reorganize Packages**
   - Move code to correct layer
   - Restructure packages to follow hierarchy
   - May require new packages

4. **Review** — Get architect approval before resolving
5. **Document** — If unusual, create ADR explaining decision

---

## Related ADRs

- ADR-0001: Repository Architecture — How packages are organized
- ADR-0003: Module Boundaries — What crosses layer boundaries

---

## References

- `.foundation/docs/ARCHITECTURE.md` — Full architecture specification
- [Layered Architecture Pattern](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html)
- [Preventing Circular Dependencies](https://stackoverflow.com/questions/37937984/circular-dependencies-in-java)
