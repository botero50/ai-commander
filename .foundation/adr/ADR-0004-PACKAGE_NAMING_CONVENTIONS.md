# ADR-0004: Package Naming Conventions

**Status:** Approved and Implemented

**Date:** 2026-06-30

**Author:** Claude Code (Principal Software Engineer)

---

## Context

AI Commander will contain 20+ packages over time. Without consistent naming conventions, packages become:

- Hard to find and remember
- Inconsistent in style (camelCase, kebab-case, PascalCase)
- Confusing about purpose (is it a class? A module? A concept?)
- Unclear about relationships

The team needed to establish consistent naming for:

- Package names in npm
- Export names (classes, functions, types)
- File and directory names
- Internal module organization

---

## Decision

**Adopt consistent naming conventions for packages and exports based on the programming domain and responsibility.**

### Package Naming

**Scope:** All npm packages in the @ai-commander organization use:

```
@ai-commander/[descriptor]
```

**Rules:**

1. **Kebab-Case** — Use lowercase with hyphens separating words

   ```
   @ai-commander/entity-component-system  ✅
   @ai-commander/EntityComponentSystem    ❌
   @ai-commander/entity_component_system  ❌
   ```

2. **Descriptive** — Name describes what the package does, not its layer

   ```
   @ai-commander/ecs              ✅ (Entity Component System)
   @ai-commander/engine           ✅ (clear purpose)
   @ai-commander/domain           ✅ (clear purpose)
   @ai-commander/layer-2-package  ❌ (doesn't describe purpose)
   ```

3. **Singular or Plural** — Use context-appropriate form

   ```
   @ai-commander/domain           ✅ (abstract concept, singular)
   @ai-commander/utils            ✅ (multiple utilities, plural)
   @ai-commander/strategies       ✅ (multiple strategies)
   ```

4. **No Redundancy** — Don't repeat "ai-commander" in the name

   ```
   @ai-commander/decision         ✅
   @ai-commander/ai-commander-decision  ❌
   ```

5. **Short When Possible** — Prefer brevity without sacrificing clarity
   ```
   @ai-commander/ecs              ✅ (known acronym)
   @ai-commander/entitycomponentsystem  ❌ (too long, no hyphens)
   ```

### Export Naming

**Classes and Constructors:**

Use `PascalCase` for class names. Class represents a thing that can be instantiated.

```typescript
// ✅ Good
export class Engine {}
export class World {}
export class Agent {}

// ❌ Bad
export class engine {} // lowercase
export class AIEngine {} // unnecessary prefix
export const Engine = class {}; // confusing pattern
```

**Interfaces and Types:**

Use `PascalCase` with semantic suffixes when needed:

```typescript
// ✅ Good
export interface Engine { }           // describes something
export interface EngineConfig { }     // type ending with Config
export type Entity = string & { /* */ }  // type alias

// ❌ Bad
export interface IEngine { }          // I-prefix (TypeScript convention, avoid)
export type engine { }                // lowercase
export interface EngineInterface { }  // redundant suffix
```

**Functions and Constants:**

Use `camelCase` for functions and constants. Use `UPPER_SNAKE_CASE` for true constants.

```typescript
// ✅ Good
export function createWorld(): World {}
export const DEFAULT_TICK_RATE = 60;
export const MAX_AGENTS = 1000;

// ❌ Bad
export function CreateWorld(): World {} // PascalCase for function
export const defaultTickRate = 60; // camelCase for constant
```

**Utility Functions:**

Use verb-noun or verb-object pattern:

```typescript
// ✅ Good
export function createEntity(id: string): Entity {}
export function validateAction(action: Action): boolean {}
export function mergeStates(a: GameState, b: GameState): GameState {}

// ❌ Bad
export function entity(id: string): Entity {} // noun, not verb-noun
export function isActionValid(action: Action): boolean {} // is-prefix awkward
```

### File and Directory Naming

**Directory Names:**

Use `kebab-case` or `PascalCase` depending on content:

```
src/
├── types/                 # kebab-case for category
├── components/            # kebab-case for category
├── Engine.ts              # PascalCase for main export
└── integration/           # kebab-case for feature
```

**File Names:**

- Match export name: `Engine.ts` exports `Engine`
- Use PascalCase for classes/types: `EngineConfig.ts`
- Use camelCase for utilities: `validateAction.ts`
- Use `.test.ts` suffix for test files

```
packages/engine/src/
├── index.ts              # Public API
├── Engine.ts             # Main export (PascalCase)
├── Coordinator.ts        # Internal class
└── types/
    ├── EngineConfig.ts   # Config type
    └── EngineState.ts    # State type

packages/engine/tests/
├── engine.test.ts        # Test for Engine class
├── integration.test.ts   # Integration tests
└── fixtures/
    └── mockGameState.ts  # Test data
```

### Internal Module Organization

Modules within a package can be organized by:

1. **By Type** (Recommended for small packages)

   ```
   src/
   ├── index.ts
   ├── types/
   │   ├── agent.ts
   │   ├── action.ts
   │   └── event.ts
   └── utils/
       └── validation.ts
   ```

2. **By Feature** (For larger packages)

   ```
   src/
   ├── index.ts
   ├── decision/
   │   ├── DecisionMaker.ts
   │   └── types.ts
   ├── planning/
   │   ├── Planner.ts
   │   └── types.ts
   └── utils/
       └── validation.ts
   ```

3. **By Layer** (For applications)
   ```
   src/
   ├── index.ts
   ├── presentation/
   ├── application/
   ├── domain/
   └── infrastructure/
   ```

### Special Naming Cases

**Private/Internal Members:**

Prefix with underscore to indicate internal scope:

```typescript
class Engine {
  constructor(config: EngineConfig) {
    this._state = initialState; // private field
  }

  private _updateState() {} // private method
}

function _internalHelper() {} // internal function (not exported)
```

**Generic Types:**

Use single uppercase letter for generic parameters:

```typescript
export type Result<T, E> = Success<T> | Failure<E>;
export interface Repository<T> {}
```

**Enums:**

Use `PascalCase` for enum names and members:

```typescript
export enum AgentState {
  Idle = 'idle',
  Planning = 'planning',
  Acting = 'acting',
}

// Not:
export enum agent_state {
  idle = 'idle',
}
```

---

## Consequences

### Positive

1. **Consistency** — All packages follow same pattern, easier to find code
2. **Self-Documenting** — Name indicates what something does
3. **Familiar** — Matches JavaScript/TypeScript conventions
4. **Tooling** — Text search works reliably
5. **Growth** — New packages naturally follow pattern
6. **Communication** — Team references things by standard names

### Challenges

1. **Enforcement** — Requires discipline or automation
2. **Refactoring** — Renaming existing code for convention
3. **Documentation** — Must document abbreviations (ECS, etc.)

### Mitigations

1. **Code Review** — Check naming during review
2. **ESLint Rules** — Could add rules to enforce (future)
3. **Documentation** — List approved abbreviations
4. **Examples** — README shows example exports

---

## Approved Abbreviations

These common abbreviations are approved for package names:

| Abbreviation | Meaning                           |
| ------------ | --------------------------------- |
| ECS          | Entity Component System           |
| AI           | Artificial Intelligence           |
| RL           | Reinforcement Learning            |
| CLI          | Command Line Interface            |
| API          | Application Programming Interface |
| ML           | Machine Learning                  |

**Guidelines:**

- Only use common, widely-understood abbreviations
- Document abbreviations in README
- Prefer full names when abbreviation is uncommon

---

## Examples

### Package Example

```json
{
  "name": "@ai-commander/decision",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

```typescript
// src/index.ts
export type { DecisionMaker } from './DecisionMaker.js';
export type { EvaluationResult } from './types/EvaluationResult.js';
export { createDefaultEvaluator } from './evaluators/defaultEvaluator.js';
```

### File Structure Example

```
packages/decision/
├── src/
│   ├── index.ts                    # Public API
│   ├── DecisionMaker.ts            # Main class
│   ├── Evaluator.ts                # Evaluator interface
│   ├── types/
│   │   ├── EvaluationResult.ts
│   │   └── DecisionOption.ts
│   ├── evaluators/
│   │   ├── utilityEvaluator.ts     # Implementation
│   │   └── defaultEvaluator.ts     # Factory
│   └── utils/
│       └── scoreActions.ts         # Helper function
├── tests/
│   ├── decision-maker.test.ts
│   ├── evaluators.test.ts
│   └── fixtures/
│       └── mockGameState.ts
└── README.md
```

---

## Current Implementation

**Status:** Implemented

**Current Packages:**

- `@ai-commander/domain` ✅ (follows convention)
- `@ai-commander/ecs` ✅ (follows convention, approved abbreviation)
- `@ai-commander/engine` ✅ (follows convention)

**Exports:**

- `Engine` class ✅ (PascalCase)
- `EngineConfig` interface ✅ (PascalCase)
- `World` class ✅ (PascalCase)
- `Entity` interface ✅ (PascalCase)

---

## Applying to Future Packages

When creating new packages, follow:

1. Name uses kebab-case: `@ai-commander/[descriptor]`
2. Exports use PascalCase for classes/types
3. Files match export names
4. Functions use camelCase
5. Constants use UPPER_SNAKE_CASE

---

## Related ADRs

- ADR-0001: Repository Architecture — Package structure
- ADR-0003: Module Boundaries — What gets exported

---

## References

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html#naming-style)
- [Node.js Naming Conventions](https://nodejs.org/en/docs/guides/nodejs-typescriptguide/#packages)
- `.foundation/docs/ARCHITECTURE.md` — Architecture specification
