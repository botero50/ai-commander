# AI Commander Architecture

**Document Purpose:** Canonical architecture specification for AI Commander framework. Describes design, structure, principles, and policies governing the system.

**Audience:** Senior engineers, architects, and contributors. Assumes familiarity with TypeScript, Node.js, and software architecture patterns.

**Status:** Frozen - Architecture Version 1.0

---

## Architectural Goals

The AI Commander framework pursues the following architectural goals:

### Primary Goals

1. **Modularity** — Decompose the system into independent, replaceable components with clear boundaries
2. **Extensibility** — Support integration with multiple game engines and AI providers without core changes
3. **Determinism** — Ensure reproducible behavior across runs for testing, debugging, and scientific reproducibility
4. **Maintainability** — Design for long-term evolution without architectural drift
5. **Type Safety** — Enforce compile-time contracts through strict TypeScript
6. **Testability** — Ensure every component can be tested in isolation with deterministic tests
7. **Scalability** — Support multi-agent systems with minimal performance degradation
8. **Observable** — Provide visibility into agent reasoning and decision-making

### Secondary Goals

- Support multiple game types (turn-based, real-time, grid-based, continuous)
- Remain compatible with reinforcement learning integrations
- Enable hybrid rule-based and ML approaches
- Provide reproducible agent behavior across environments
- Support distributed agent execution in future versions

---

## Design Principles

### 1. Unidirectional Dependency Flow

Dependencies flow strictly downward through well-defined layers. No layer may depend on layers above it.

```
Applications
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
Shared (utilities only)
```

**Why:** Prevents circular dependencies, enables independent module reuse, and maintains clean separation of concerns.

### 2. Explicit Interfaces

All module boundaries are defined by TypeScript interfaces. Implementation details are hidden.

- Public API surfaces consist only of interfaces and types
- All public exports are explicit in index.ts
- Internal implementations are not exported

**Why:** Enables implementation swapping, maintains versioning flexibility, and forces architectural thinking at boundaries.

### 3. No Hidden Coupling

All dependencies must be explicit and discoverable through:

- TypeScript imports
- Package.json declarations
- Function parameters (no implicit globals)

Global state is forbidden. Services are passed as dependencies.

**Why:** Enables testing, supports multiple concurrent instances, and makes dependencies visible to tooling.

### 4. Single Responsibility

Each module has one reason to change. Modules should be cohesive within their domain.

- Domain layer: defines what we work with
- Engine layer: defines how execution works
- Decision layer: defines how choices are made
- Planner layer: defines how sequences are built
- Strategy layer: defines high-level flows

**Why:** Improves reusability, testability, and makes code changes localized.

### 5. Fail Fast

Errors should be detected as early as possible:

- TypeScript strict mode catches type errors at compile time
- Invalid states should be unrepresentable
- Runtime errors should include full context

**Why:** Reduces debugging time and improves reliability.

### 6. Deterministic by Default

All agent behavior should be reproducible. Randomness must be:

- Explicit in function signatures
- Injected via dependencies, not global
- Seeded for reproducibility

**Why:** Critical for testing, debugging, ML training, and scientific reproducibility.

### 7. Gradual Adoption

The framework should work with incremental integration:

- Agents can be added to existing games gradually
- Framework can be adopted game-by-game
- Old and new code can coexist during migrations

**Why:** Reduces risk and enables teams to adopt incrementally.

---

## Layered Architecture

AI Commander uses a strictly layered architecture. Each layer depends only on layers below it. Layers are:

### Layer: Shared Utilities

**Responsibility:** Provide general-purpose utilities and helpers used across the system.

**Examples:** Logging, error handling, collection utilities, type guards.

**Constraints:**

- Must not depend on any application layer code
- Must not contain domain-specific logic
- Should be generic and reusable

**Characteristics:**

- No side effects
- Pure functions where possible
- Minimal external dependencies

### Layer: Domain

**Responsibility:** Define core domain models and type structures that represent game concepts.

**What it contains:**

- Entity definitions
- Agent properties and capabilities
- Action and event schemas
- Game state representations
- Perception models
- Constants and enumerations

**What it doesn't contain:**

- Implementation logic
- External dependencies
- Side effects
- Decisions or reasoning

**Constraints:**

- Pure data structures and types only
- No mutable global state
- No imports from higher layers

**Characteristics:**

- Highly stable (rarely changes)
- Used by all higher layers
- Game-agnostic where possible
- Defines the vocabulary of the system

### Layer: Core

**Responsibility:** Provide foundational utilities and abstractions that lower layers build upon.

**Planned modules:**

- ECS (Entity Component System)
- Result/Error types
- Observable patterns
- Collection abstractions

**Constraints:**

- Cannot depend on Domain concepts (should be generic)
- Cannot depend on higher layers
- Should provide reusable infrastructure

### Layer: Engine

**Responsibility:** Execute game ticks, coordinate agent actions, manage state transitions.

**Responsibilities:**

- Manage game loop execution
- Coordinate multi-agent action execution
- Handle state transitions
- Manage deterministic execution context
- Provide timing and scheduling

**Constraints:**

- Cannot make strategic decisions
- Cannot implement planning algorithms
- Must remain strategy-agnostic

**Characteristics:**

- Central coordination point
- Stateful (maintains execution context)
- Time-aware
- Deterministic

### Layer: Decision

**Responsibility:** Implement decision-making logic for individual agents.

**Planned modules:**

- Decision trees
- Utility-based decision makers
- State machine evaluators
- Heuristic evaluators

**Constraints:**

- Cannot make strategic plans
- Cannot coordinate multiple agents
- Cannot execute actions directly

### Layer: Planner

**Responsibility:** Implement planning algorithms and sequence generation.

**Planned modules:**

- Search algorithms (A*, BFS, DFS)
- Plan generation
- Goal decomposition
- Action sequencing

**Constraints:**

- Cannot directly execute plans
- Cannot make individual decisions (delegates to Decision layer)
- Operates on abstract game states

### Layer: Strategy

**Responsibility:** Implement high-level strategic behavior and multi-agent coordination.

**Planned modules:**

- Strategic policies
- Multi-agent coordination
- Behavior trees
- State machines
- Meta-level planning

**Constraints:**

- Cannot modify engine behavior
- Cannot violate game rules
- Must decompose to plannable subgoals

### Layer: Applications

**Responsibility:** Integrate the framework with specific games and AI systems.

**Contains:**

- Game-specific agents
- Game-specific strategies
- Integration code with game engines
- Example implementations

---

## Package Responsibilities

### @ai-commander/shared

**Purpose:** Utilities and helpers used across all packages.

**Planned exports:**

- Error types and handling
- Logger interface
- Collection utilities
- Type guards
- Constants

**Stability:** Public API (semver)

### @ai-commander/domain

**Purpose:** Core domain models for games and agents.

**Current exports:**

- Entity interface
- Agent interface
- GameState interface
- Action interface
- Event interface

**Future exports:**

- Game-specific types
- State representations
- Action schemas
- Event schemas
- Capability models

**Stability:** Public API (semver) - changes will be breaking

### @ai-commander/ecs

**Purpose:** Entity Component System for efficient state management.

**Current exports:**

- World class
- Component interface
- Entity interface

**Future exports:**

- System runner
- Query builder
- Change tracking
- Performance optimization

**Stability:** Public API (semver) - internal implementation may change

### @ai-commander/engine

**Purpose:** Core execution engine for game loops and agent coordination.

**Current exports:**

- Engine class
- EngineConfig interface

**Future exports:**

- Action executor
- State transition manager
- Timing coordinator
- Event dispatcher

**Stability:** Public API (semver) - may grow new methods

### @ai-commander/decision

**Purpose:** Decision-making algorithms for agents.

**Planned exports:**

- Decision interfaces
- Evaluators
- Decision trees
- Policy implementations

**Stability:** Public API (semver)

### @ai-commander/planner

**Purpose:** Planning and search algorithms.

**Planned exports:**

- Planner interface
- Search algorithms
- Plan representation
- Goal structures

**Stability:** Public API (semver)

### @ai-commander/strategy

**Purpose:** Strategic behavior and multi-agent coordination.

**Planned exports:**

- Strategy interfaces
- Behavior trees
- Coordination patterns
- Meta-policies

**Stability:** Public API (semver)

---

## Module Boundaries

### Boundary Principles

1. **No Leakage** — Implementation details are never leaked across boundaries
2. **Type Contracts** — Boundaries are defined by TypeScript interfaces, not implementations
3. **Substitutability** — Any implementation of an interface can replace any other
4. **Stable Interfaces** — Public interfaces change only with major version bumps

### Internal vs Public

**Public API:**

- Exported from index.ts
- Documented
- Subject to semver
- Intended for external use

**Internal Implementation:**

- Not exported from index.ts
- May change without notice
- For use within package only
- Prefixed with underscore if exposed (discouraged)

### Cross-Package Communication

**Allowed:**

- Using exported types from packages below
- Implementing interfaces defined in packages below
- Calling exported functions from packages below

**Forbidden:**

- Importing internal implementations (anything not in index.ts)
- Creating circular dependencies
- Accessing private/internal properties
- Monkey-patching or extending external types

---

## Dependency Rules

### The Rule

> Dependencies flow strictly downward through the layer architecture. No layer may depend on layers above it. No circular dependencies are permitted under any circumstances.

### Enforcement

Dependencies are enforced through:

1. **TypeScript Compiler** — import statements are checked at compile time
2. **npm Workspaces** — packages declare explicit dependencies
3. **Build Orchestration** — composite projects ensure proper build order
4. **Code Review** — architectural violations are caught during review

### Rationale

Strict unidirectional dependencies:

- Enable independent reuse of lower layers
- Prevent circular dependencies that cause maintenance nightmares
- Allow testing lower layers without loading higher layers
- Make dependencies visible and explicit
- Enable parallel development

### Adding New Packages

When adding a new package:

1. Determine which layer it belongs to
2. It may only depend on packages in lower layers
3. Higher layers may depend on it
4. Document all dependencies in architecture review

---

## Public API Policy

### What is Public

A public API consists of:

1. **Exported Types** — All interfaces and type aliases in index.ts
2. **Exported Classes** — All classes in index.ts (constructor, public methods)
3. **Exported Functions** — All functions in index.ts
4. **Constants** — All exported constants

### What is Private

Not part of the public API:

1. Anything not exported from index.ts
2. Anything starting with underscore (internal)
3. Implementation details behind interfaces
4. Function parameters that might change

### Stability Guarantees

**Major Version (X.0.0)** — Permitted changes:

- Add new exports
- Remove exports (with deprecation period in prior version)
- Change internal implementations (not exposed)
- Restructure internal modules

**Minor Version (0.X.0)** — Permitted changes:

- Add new exported functions
- Add new methods to exported classes
- Add optional parameters to exported functions
- Add new type exports

**Patch Version (0.0.X)** — Permitted changes:

- Bug fixes
- Performance improvements
- Documentation improvements
- Internal refactoring

### API Design Rules

1. **Interfaces over Implementations** — Public API exports interfaces, not implementations
2. **Stable Contracts** — Public APIs should rarely change
3. **Explicit Parameters** — Use explicit parameters, not options bags (when < 3 parameters)
4. **Fail Fast** — Invalid inputs should throw immediately
5. **Document Assumptions** — Document preconditions and postconditions

---

## Extension Points

The framework is designed to be extended through:

### 1. Plugin Architecture (Future)

Strategy implementations can be provided as plugins. Plugins will:

- Implement well-defined interfaces
- Declare dependencies explicitly
- Be loaded at runtime
- Not modify engine behavior

### 2. Game Adapters

Games integrate via adapters that:

- Implement perception interfaces
- Implement action execution
- Translate game state to domain models
- Translate domain actions to game commands

### 3. AI Provider Integration

AI models and ML systems integrate via:

- Strategy interfaces
- Decision interfaces
- Custom planning implementations

### 4. Custom Evaluators

Strategic and decision evaluation can be customized via:

- Pluggable evaluator interfaces
- Custom scoring functions
- Domain-specific heuristics

---

## Configuration Philosophy

The framework follows these configuration principles:

### Configuration Sources (in order of precedence)

1. **Explicit Parameters** — Function/class constructor arguments (highest)
2. **Environment Variables** — For deployment-specific settings
3. **Configuration Files** — For default settings
4. **Code Defaults** — Sensible defaults in code (lowest)

### Configuration Types

**Build-Time Configuration:**

- TypeScript compiler options
- ESLint rules
- Prettier formatting
- Vitest settings

**Runtime Configuration:**

- Engine tick rate
- Agent capabilities
- Planning parameters
- Strategy parameters

### No Magic Globals

- No global configuration singletons
- Configuration is passed as dependencies
- Configuration is explicit and traceable
- Tests use dependency injection for configuration

---

## Error Handling Strategy

### Error Categories

1. **Programming Errors** — Bugs in the framework or agent code
   - Response: Throw with context, fail fast
   - Example: Invalid state reached

2. **Game Errors** — Invalid game states or rule violations
   - Response: Return error result, don't throw
   - Example: Agent tries illegal action

3. **External Errors** — Issues with external systems
   - Response: Return error result with retry information
   - Example: Network timeout, file not found

### Error Handling Principles

1. **Fail Fast** — Invalid states detected immediately
2. **Error Context** — Every error includes enough information to debug
3. **No Silent Failures** — Errors are never ignored
4. **Typed Errors** — Use Result<T, E> types for expected errors
5. **Exceptions** — Only for truly exceptional conditions

### Error Propagation

```
Framework Layer    Handling
────────────────────────────
Shared            Throw + context
Domain            Throw on invalid states
Engine            Return Result<T, E>
Decision          Return Result<T, E>
Planner           Return Result<T, E>
Strategy          Return Result<T, E>
Application       Handle or propagate
```

---

## Logging and Observability

### Logging Strategy

1. **Structured Logging** — Log messages with structured data
2. **Log Levels** — Use appropriate levels (error, warn, info, debug, trace)
3. **Context** — Include relevant context in every log entry
4. **No Side Effects** — Logging doesn't affect agent behavior

### Observability Goals

1. **Traceability** — Follow an agent's decision from perception to action
2. **Reproducibility** — Enable replaying a sequence of decisions
3. **Debugging** — Provide sufficient detail to debug issues
4. **Performance** — Track timing and performance metrics

### Observable Events

Framework emits events for:

- Agent creation/destruction
- Agent perception
- Agent decision
- Action execution
- State transitions
- Errors and warnings

---

## Testing Strategy

### Test Levels

1. **Unit Tests** — Test individual modules in isolation
   - Mock dependencies
   - Test interface contracts
   - Cover edge cases

2. **Integration Tests** — Test multiple modules together
   - Use real implementations where practical
   - Test realistic scenarios
   - Validate data flow

3. **Acceptance Tests** — Test complete agent behavior
   - Use realistic game scenarios
   - Validate agent accomplishes goals
   - Test multiple agents together

### Determinism Requirement

All tests must be deterministic:

- No time-based assertions (use fake timers)
- No random values (seed randomness)
- No external dependencies (mock APIs)
- No flaky timeouts (use deterministic waits)

### Test Organization

```
packages/[name]/
├── src/            # Implementation
├── tests/          # Test files
│   ├── unit/       # Unit tests
│   ├── integration/# Integration tests
│   └── fixtures/   # Test data
└── vitest.config.ts
```

### Coverage Goals

- Minimum 80% line coverage
- 100% coverage for public APIs
- 100% coverage for error paths
- All edge cases covered

---

## Build Architecture

### Build Phases

1. **TypeScript Compilation** — Compile all packages to JavaScript
2. **Type Declaration** — Generate .d.ts files for type checking
3. **Bundling** — Bundle for different environments (future)
4. **Testing** — Run full test suite
5. **Linting** — Verify code quality
6. **Formatting** — Enforce consistent style

### Build Guarantees

- All code must compile without errors
- No TypeScript errors at strict settings
- All linting rules must pass
- All tests must pass
- All code must be properly formatted

### Development Workflow

```
Edit code → Run tests → Lint → Format → Commit
```

Each commit must pass all checks via `npm run doctor`.

### Production Builds

Production builds verify:

- TypeScript builds without errors
- All tests pass
- ESLint checks pass
- Prettier formatting passes
- Type declarations are correct
- No circular dependencies

---

## Versioning Strategy

### Semantic Versioning

The framework follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** — Breaking changes to public APIs
- **MINOR** — New features, backward compatible
- **PATCH** — Bug fixes, backward compatible

### Breaking Changes

A breaking change is:

- Removing a public export
- Changing the signature of a public function
- Changing the required fields of a public type
- Removing a public method
- Changing error behavior

Breaking changes require:

- MAJOR version bump
- Migration guide in release notes
- Deprecation period in prior version (if possible)

### Pre-release Versions

During pre-release (0.x.x):

- MINOR bumps may include breaking changes
- PATCH bumps should not include breaking changes
- Release notes highlight breaking changes

### Release Process

1. Update version in package.json
2. Update CHANGELOG
3. Tag release in git
4. Publish to npm
5. Announce release

---

## Performance Considerations

### Design for Performance

1. **Lazy Evaluation** — Don't compute results until needed
2. **Caching** — Cache expensive computations
3. **Batching** — Batch operations where possible
4. **Async Support** — Plan for async operations (future)

### Performance Targets (Future)

- Single agent decision: < 100ms
- Multi-agent tick: < 500ms
- Support 100+ agents in real-time games

### Performance Monitoring

- Measure decision time
- Profile agent execution
- Track memory usage
- Identify bottlenecks

### Optimization Constraints

- Never sacrifice determinism for performance
- Never sacrifice correctness for performance
- Profile before optimizing
- Measure improvements

---

## Security Considerations

### Threat Model

AI Commander is designed for:

- Academic and research use
- Game development
- AI experimentation

Not designed for:

- Untrusted code execution
- Network security
- Cryptographic applications
- Production banking systems

### Security Practices

1. **Input Validation** — Validate all inputs at boundaries
2. **No Arbitrary Code Execution** — Never evaluate untrusted strings as code
3. **Resource Limits** — Enforce limits on computation and memory
4. **Dependency Management** — Regular updates and audits
5. **Secure Defaults** — Safe by default, explicit to opt-in to risky operations

---

## Future Evolution

### Planned Expansions

#### Phase 2: Planning and Decision Engines

- Implement core Decision layer
- Implement core Planner layer
- Add search algorithms
- Add decision tree evaluators

#### Phase 3: Strategy and Coordination

- Implement Strategy layer
- Add multi-agent coordination
- Add behavior trees
- Add state machines

#### Phase 4: Game Integrations

- Unity integration
- Unreal Engine integration
- Custom game engine adapters
- Example implementations

#### Phase 5: Advanced Features

- Reinforcement learning integration
- Distributed agent execution
- Real-time performance optimization
- Advanced observability

#### Phase 6: Production Hardening

- Production deployment patterns
- Performance optimization
- Advanced error handling
- Monitoring and alerting

### Evolution Without Architectural Changes

The architecture is designed to accommodate future additions without changes:

- New layers can be added between existing layers
- New packages can be added within layers
- New interfaces can be added to existing packages
- Implementations can be completely rewritten

The architectural boundaries remain stable.

### Architecture Constraints

The following are immutable:

- Unidirectional dependency flow
- No circular dependencies
- Explicit interfaces at boundaries
- Type safety through TypeScript strict mode
- Deterministic execution by default

---

## Architecture Constraints

### Hard Constraints (Cannot Be Violated)

1. **Unidirectional Dependencies** — No layer may depend on layers above it
2. **No Circular Dependencies** — Never allowed, enforced by build
3. **Explicit Exports** — All public APIs explicitly exported from index.ts
4. **No Shared Mutable State** — Global mutable state is forbidden
5. **Type Safety** — Strict TypeScript mode is mandatory

### Soft Constraints (Strongly Discouraged)

1. **Cross-Layer Access** — Prefer proper layering over shortcuts
2. **Internal API Usage** — Use public APIs only
3. **Implementation-Specific Types** — Reference interfaces, not implementations
4. **Side Effects** — Minimize side effects, dependency inject I/O

### Build Constraints

1. **No Uncompiled Files** — All code must compile to JavaScript
2. **No CommonJS** — Module-only, no CJS compatibility
3. **No Direct Imports of node_modules** — Use workspace packages instead
4. **Declaration Files Required** — All packages must emit .d.ts files

---

## Architecture Review

Changes to the architecture require:

1. **Architecture Decision Record (ADR)** — Document the decision
2. **Review** — Approval from CTO/Chief Architect
3. **Implementation** — Complete implementation with tests
4. **Documentation Update** — Update this document
5. **Release Notes** — Announce changes to community

### When ADRs Are Required

- Changing layer responsibilities
- Adding new layers
- Changing dependency direction
- Modifying package boundaries
- Changing public API policies
- Any architectural decision

### Architecture Review Checklist

- [ ] ADR written and approved
- [ ] New code implements decision as documented
- [ ] All tests pass
- [ ] No circular dependencies introduced
- [ ] Documentation updated
- [ ] Build passes without warnings

---

## Related Documents

- `.foundation/state/PROJECT_STATE.md` — Current project status
- `.foundation/adr/` — Architecture Decision Records
- `.foundation/docs/` — Additional documentation
- `packages/*/README.md` — Package-specific documentation
- Root `README.md` — Quick start guide

---

## Summary

AI Commander is a long-lived, modular, type-safe framework for building AI agents for strategy games. The architecture emphasizes:

- **Clear Boundaries** through strict layering and explicit interfaces
- **Type Safety** through strict TypeScript
- **Testability** through deterministic design and dependency injection
- **Maintainability** through unidirectional dependencies and single responsibilities
- **Extensibility** through plugin interfaces and game adapters
- **Stability** through version guarantees and careful change management

The frozen architecture provides a foundation for years of evolution without requiring architectural redesign.
