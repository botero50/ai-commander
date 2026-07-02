# CTO Context — AI Commander

**Document Purpose**: Strategic constitution of AI Commander. Documents long-term vision, principles, and decision-making framework.

**Audience**: CTO, Architecture reviewers, senior engineers, future maintainers

**Last Updated**: July 2, 2026

**Status**: Approved and in effect

---

# Product Vision

## What is AI Commander?

**AI Commander is a framework, not a game.**

It is a production-grade platform for building **autonomous agents that perceive, reason, plan, and execute actions within strategy games**.

The framework provides:

- **Game-Agnostic Foundation**: Domain models, execution engine, and infrastructure that work with any game
- **Swappable Components**: Planners, decision engines, and game adapters are replaceable without modifying the framework
- **Deterministic Execution**: Identical inputs always produce identical outputs (critical for testing and debugging)
- **Complete Observability**: Traces, metrics, and snapshots record every decision and action
- **Production Quality**: Type-safe, fully tested, linted, formatted, documented

## What is AI Commander NOT?

- **Not a game**: It controls games, but it is not a game itself
- **Not a closed platform**: It is not tied to one game, one algorithm, or one approach
- **Not a black box**: Every decision is observable, traceable, and explainable
- **Not a machine learning framework**: Though it can integrate with ML, it is not opinionated about algorithms
- **Not research code**: It is production-grade, with architectural stability for years of development

## Long-Term Vision

AI Commander is the **reference platform for autonomous game-playing agents**.

It demonstrates that:

1. **Determinism is achievable** in complex systems without sacrificing functionality
2. **Observability enables intelligence** — agents that show their reasoning are better understood
3. **Modularity enables specialization** — different problems solved with different algorithms, same framework
4. **Architecture can be frozen** and remain suitable for years of product development

The first production showcase is **OpenRA** (an open-source RTS engine). Future showcases will include other games, proving the framework's generality.

Eventually, AI Commander becomes the platform that researchers, hobbyists, and professionals use to build game-playing agents.

---

# Product Philosophy

## Deterministic Autonomy

Agents must be **fully autonomous AND completely reproducible**.

**What This Means**:
- Agent executes without human intervention
- Identical world state produces identical behavior
- No randomness, no timing dependencies
- Perfect for testing, debugging, benchmarking

**Why It Matters**:
- Enables scientific study of agent behavior
- Makes performance comparisons meaningful
- Allows replay and analysis
- Critical for production reliability

**How It Works**:
- Tick-based execution (discrete time steps)
- Deterministic algorithms (no randomness)
- No external state (clock, network, files)
- Complete world state as input, complete decision as output

## Explainability

Every decision must be **observable and traceable**.

**What This Means**:
- Decisions are recorded with full context
- Reasoning is visible (not hidden in black boxes)
- Execution can be replayed and analyzed
- Developers can answer: "Why did the agent do that?"

**Why It Matters**:
- Builds trust in autonomous systems
- Enables debugging of incorrect behavior
- Allows improvement and optimization
- Critical for game AI and strategy demonstration

**How It Works**:
- Execution traces record 22+ event types
- Runtime metrics provide quantitative visibility
- Runtime inspector captures state snapshots
- All data is serializable (JSON export)

## Observability

The system must be **measurable at every layer**.

**What This Means**:
- Timing metrics for performance
- Event counts for behavior analysis
- Success rates for command execution
- Progress tracking for goals

**Why It Matters**:
- Performance optimization requires measurement
- Debugging requires understanding behavior
- Production systems need monitoring
- Intelligence requires measuring progress

**How It Works**:
- ExecutionTracer records 22+ event types
- RuntimeMetrics computes 26 quantitative measurements
- RuntimeInspector captures state at any point
- All metrics are deterministic and reproducible

## Developer Experience

Developers must be **productive and in control**.

**What This Means**:
- One command (`pnpm demo`) shows complete system working
- Every CLI command has a purpose
- Documentation is accurate and complete
- Errors are clear and actionable

**Why It Matters**:
- Fast iteration enables rapid experimentation
- Clear errors reduce debugging time
- Complete documentation reduces onboarding time
- Productive developers build better systems

**How It Works**:
- Browser dashboard for visual debugging
- CLI with 5+ commands for different analysis tasks
- Comprehensive documentation (ARCHITECTURE.md, QUICK_START.md, DEVELOPER_GUIDE.md)
- Clear error messages with actionable remediation

## Demonstrability

Everything the framework enables must be **visibly demonstrated**.

**What This Means**:
- Framework capabilities shown in reference application
- Product features visible in browser dashboard
- Agent intelligence observable in execution traces
- Performance measurable in metrics

**Why It Matters**:
- Proof points convince users and contributors
- Visible capabilities are more valuable than hidden infrastructure
- Demonstration drives adoption
- Showcases justify architecture decisions

**How It Works**:
- Reference application (apps/reference/) uses public framework APIs only
- Browser dashboard shows execution in real-time
- CLI reports (traces, metrics, snapshots) are comprehensive
- Every story includes a demonstration

## Extensibility

New capabilities must be **implementable without modifying the framework**.

**What This Means**:
- New planners don't require framework changes
- New decision engines don't require framework changes
- New games integrate through GameAdapter contract
- Custom observability tools built on public APIs

**Why It Matters**:
- Framework remains stable even as products evolve
- Multiple teams can use same framework
- Innovation happens in applications, not infrastructure
- Long-term maintainability is achievable

**How It Works**:
- Well-defined contracts (Planner, DecisionEngine, GameAdapter)
- Dependency injection for plugging in implementations
- Public APIs for building tools
- Examples for common extension patterns

---

# CTO Directives

These are principles that govern all development. They are not suggestions.

## 1. The Repository is the Source of Truth

- Code in the repository is what exists. Documentation reflects code.
- Chat history, commit messages, and design docs are secondary.
- If there's a conflict, the code wins.
- Synchronize documentation with every significant change.

**Implication**: PROJECT_STATE.md must be accurate. If it's wrong, fix it immediately.

## 2. Protect the Architecture

- The architecture is frozen. No changes without approved ADR.
- Modularity is sacred. Circular dependencies are forbidden.
- Unidirectional dependencies enable reuse and testing.
- When tempted to break the architecture for convenience, refuse.

**Implication**: Product development happens in applications, not frameworks.

## 3. Challenge Unnecessary Complexity

- Simple > complex
- Explicit > implicit
- Visible > hidden

- If something requires more than one explanation, simplify it.
- If code requires more than a few lines of comments, reconsider the design.
- If a feature requires a new abstraction, prove the need first.

**Implication**: YAGNI is a release gate. No speculative code.

## 4. Prefer Visible Capabilities Over Invisible Infrastructure

- Users care about what the agent does, not how the framework works.
- Invest in demonstrable features, not theoretical abstractions.
- Every story should make the agent more impressive to observe.

**Implication**: "It works better" is not a story. "The agent does X" is.

## 5. YAGNI is a Release Gate

- You Aren't Gonna Need It. Code for current problems, not future ones.
- No abstract base classes without concrete implementations.
- No interfaces for hypothetical scenarios.
- No layers until needed.

**Implication**: Every line of code must solve a current problem. Code that doesn't has no home.

## 6. The Framework Evolves Only When Product Proves It Must

- Framework changes require proof that product development is blocked.
- Stories that require framework changes are suspicious.
- If you can solve it in the application layer, you must.

**Implication**: The framework is frozen because it's sufficient. It will remain frozen.

## 7. Test-First is Not Negotiable

- Every feature requires tests.
- Tests must be deterministic (no flakes, no randomness).
- 100% test pass rate is the definition of done.

**Implication**: "Tests pass" is a statement of fact, not an achievement.

## 8. Type Safety is Mandatory

- TypeScript strict mode, no exceptions.
- No `any` types without explicit approval.
- Interfaces define contracts; implementations satisfy them.

**Implication**: Compiler errors are not suggestions.

## 9. Production Quality Means:

- Code is typed, tested, linted, formatted
- Documentation is accurate and complete
- Architecture is stable and frozen
- No shortcuts, no deferred work, no TODOs
- Deployable as-is without final cleanup

**Implication**: "This is a quick prototype" has no place in this repository.

## 10. Observability Enables Intelligence

- The agent must demonstrate its reasoning.
- Every decision is traceable.
- Every action is measurable.
- Users understand why the agent did what it did.

**Implication**: Features without observability are not valuable features.

---

# Success Metrics

## Do NOT Measure

- **Package count**: Doesn't matter how many packages exist
- **Abstraction depth**: Doesn't matter how many layers
- **Interface count**: Doesn't matter how many interfaces exist
- **Test count**: Doesn't matter if it's 100 tests or 1000 tests
- **Code metrics**: Doesn't matter if functions are long or short
- **Documentation pages**: Doesn't matter if documentation is 10 pages or 100 pages

These are **vanity metrics**. They feel productive but don't measure value.

## Do Measure

- **What developers can run**: Can they execute a mission in one command?
- **What developers can observe**: Can they see why the agent made a decision?
- **Autonomous capabilities**: Can the agent perceive, plan, decide, execute without human intervention?
- **Ease of extension**: Can a new developer add a custom planner in one day?
- **Product quality**: Does the agent feel intelligent and adaptive?

These are **outcome metrics**. They measure real value.

## Current Success Indicators

✅ **One Command Launches Everything**: `pnpm demo` — shows agent in browser, complete observability  
✅ **980 Tests Pass**: Framework is robust, product works  
✅ **Zero Framework Changes in 6 Months**: Architecture is correct, stable  
✅ **6 Stories of Product Intelligence**: Agent perceives, plans, adapts, recovers  
✅ **120+ Production Missions**: OpenRA integration validates framework with real game  
✅ **Determinism Proven**: Identical traces across runs, reproducible behavior  

---

# Development Philosophy

## Product Before Framework

- Product development is the priority
- Framework changes are exceptions
- A story that requires framework changes is suspicious
- Product features prove whether framework capabilities are needed

**Implication**: If something is hard in the current framework, can the product solve it differently?

## Behavior Before Abstractions

- Build what the agent should do first
- Only abstract when multiple implementations exist
- Each abstraction should serve at least two implementations

**Implication**: The first implementation is concrete. Don't generalize prematurely.

## Demonstrations Over Internal Complexity

- The value is in what users see
- Internal elegance is secondary
- Refactor for clarity, not for abstraction
- Complex internals are fine if the external behavior is simple

**Implication**: This is not research code. This is showcase code.

## Every Story Should Make AI Commander More Impressive

- Users should see progress in what the agent can do
- Performance improvements don't count unless they're observable
- Bug fixes don't count unless they fix a visible problem
- A story is valuable if someone watching the demo says "Oh, that's cool"

**Implication**: "We improved the internal architecture" is never a story.

---

# CTO Review Process

Whenever planning new work, follow this process:

## 1. Review Repository State

- Read PROJECT_STATE.md (current situation)
- Check recent commits (what was just completed)
- Review latest story deliverable (what was demonstrated)
- Understand constraints (what's frozen, what's available)

**Time**: 15 minutes

## 2. Review Current Milestone

- What stories are in progress?
- What has been completed?
- What is blocked?
- Are we on track?

**Time**: 10 minutes

## 3. Identify Biggest Product Gap

- What can the agent do today?
- What would make it more impressive?
- What does the agent still struggle with?
- What would developers find most useful?

**Time**: 10 minutes

## 4. Recommend Next Milestone

- Is it achievable in current framework?
- Does it require framework changes? (if yes, why?)
- What stories are needed?
- What's the effort estimate?

**Time**: 20 minutes

## 5. Challenge Assumptions

- Can it be done in the application layer?
- Can it be simplified?
- Does it require new abstractions? (probably not)
- Is it YAGNI? (would you build it if nobody asked for it?)

**Time**: 15 minutes

**Total**: ~70 minutes per major review

---

# Long-Term Vision: Beyond OpenRA

AI Commander is not just for OpenRA.

## Phase 1: Proven with OpenRA ✅

- Framework works with a real game
- Autonomous agents execute missions
- Framework is production-validated
- **Status**: COMPLETE

## Phase 2: General Platform (Next 6-12 months)

- Documentation for building custom game adapters
- Examples for multiple game types
- Community contributions of game adapters
- Ecosystem of planners and decision engines

## Phase 3: AI Research Platform (1-2 years)

- Integration with reinforcement learning frameworks
- Benchmarking infrastructure
- Research papers citing AI Commander
- Academic adoption

## Phase 4: Production Systems (2-5 years)

- Game AI for indie and commercial games
- Autonomous system control in non-game domains
- Multi-agent coordination
- Distributed agent execution

## Vision Statement (5+ years)

**AI Commander is the reference platform for building, testing, and deploying autonomous agents that control deterministic systems.**

The framework is:
- **Production-proven** (used in real systems)
- **Academically-validated** (published research)
- **Community-supported** (open source, active contributors)
- **Industry-standard** (adopted by companies building game AI)

This is the long-term goal. Everything builds toward it.

---

# The Why Behind Architecture Decisions

## Why Monorepo?

- **Single source of truth** for all code
- **Coordinated changes** across packages
- **Simplified dependency management** (npm Workspaces)
- **Easier refactoring** across boundaries
- **Shared release cycle** (version alignment)

## Why TypeScript?

- **Compile-time safety** catches errors early
- **Self-documenting** (types document intent)
- **Refactoring-friendly** (compiler verifies safety)
- **IDE support** (great developer experience)
- **Industry-standard** (many projects use it)

## Why Frozen Architecture?

- **Stability** for long-term development
- **Clarity** (no architectural surprises)
- **Predictability** (components don't change unexpectedly)
- **Proof** that design was sufficient
- **Focus** on product value, not infrastructure churn

## Why Deterministic Execution?

- **Testability** (reproducible behavior)
- **Debugging** (trace and replay)
- **Benchmarking** (consistent measurements)
- **Trust** (no surprises in production)
- **Science** (reproducible results)

## Why Observable?

- **Explainability** (understand decisions)
- **Debugging** (find problems quickly)
- **Trust** (see what's happening)
- **Optimization** (measure what matters)
- **Learning** (analyze behavior patterns)

---

# The Hardest Part: Knowing When to Say No

The hardest architectural decision is **not building things**.

Every feature request, every optimization idea, every enhancement is tempting. But building things has a cost:

- **Complexity**: More code to maintain
- **Coupling**: New dependencies, harder to refactor
- **Confusion**: More to understand, longer onboarding
- **Debt**: Shortcuts taken create future liabilities

The discipline to say "Not now" or "That's not a framework concern" is what keeps the architecture stable.

**Example**: Stories 091-096 added significant agent intelligence without touching the framework. They could have demanded framework changes. They didn't. That's the discipline.

---

# The Constitution

This document is the constitution of AI Commander.

It defines:
- What AI Commander is and why it exists
- Principles that govern all development
- Metrics that determine success
- Process for making decisions
- Long-term vision and milestones

When in doubt, refer to this document.

When tempted to deviate, ask: "Is this consistent with the vision?"

When confused about direction, read the directives.

This is the foundation of all decision-making.

---

# Closing Statement

AI Commander is not a clever piece of code. It is a **platform for building clever agents**.

The framework's job is to be stable, correct, and invisible.

The product's job is to be impressive, intelligent, and observable.

Our job is to maintain the boundary between them.

**Protect the framework. Evolve the product. Make the vision real.**
