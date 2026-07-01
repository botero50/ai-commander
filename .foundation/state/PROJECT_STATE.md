# AI Commander — Project State

**Location:** `.foundation/state/PROJECT_STATE.md`

---

# PROJECT STATE

> This document is the canonical state of the AI Commander project.
>
> It is the single source of truth for the current architecture, implementation status, engineering decisions, and development workflow.
>
> Any engineer or AI should be able to resume development from this document without reading previous conversations.
>
> This file must always reflect the current repository state.

---

# Project Overview

**Project Name**

AI Commander

**Project Type**

Open-source framework for building AI-controlled strategy game agents.

**Primary Goal**

Provide a modular, extensible, and production-grade framework that allows AI agents to perceive, reason, plan, and execute actions within strategy games while remaining deterministic, testable, maintainable, and scalable.

The framework is intended to support multiple games without requiring architectural changes.

---

# Vision

Build the best open-source framework for AI-controlled strategy games.

The framework should become the reference architecture for:

- AI game automation
- Strategy planning
- Decision systems
- Multi-agent orchestration
- Autonomous gameplay
- AI experimentation
- Reinforcement-learning integrations
- Rule-based hybrid systems

The architecture must remain stable for years.

---

# Mission

Create a long-lived engineering platform rather than a one-off project.

Every component should be:

- Modular
- Replaceable
- Testable
- Documented
- Versioned
- Observable
- Maintainable

---

# Current Release

Current Version:

```
0.1.0-alpha
```

Release Status:

```
Pre-production
```

Production Ready:

```
No
```

---

# Current Sprint

Sprint Objective:

Stabilize the core architecture and establish the engineering foundation before feature expansion.

Primary Goals:

- Finalize repository structure
- Freeze architecture
- Complete foundational documentation
- Establish development workflow
- Enable implementation velocity

---

# Architecture Version

Architecture Version:

```
1.0
```

Status:

```
Frozen
```

Architecture changes require:

- ADR
- Review
- Approval

No architectural modifications are permitted without an approved Architecture Decision Record.

---

# Technology Stack

## Runtime

- Node.js 22+

## Language

- TypeScript

## Package Manager

- npm Workspaces

## Testing

- Vitest

## Linting

- ESLint Flat Config

## Formatting

- Prettier

## IDE

- VS Code

## Source Control

- Git
- GitHub

## CI/CD

Planned:

- GitHub Actions

---

# Repository Structure

```
/
├── .foundation/
│   ├── adr/
│   ├── docs/
│   ├── state/
│   └── templates/
│
├── apps/
│
├── packages/
│
├── tools/
│
├── scripts/
│
├── tests/
│
├── docs/
│
└── .github/
```

The repository follows a workspace-based monorepo architecture.

---

# Completed Decisions

The following decisions have been approved.

## Monorepo

Approved.

---

## npm Workspaces

Approved.

---

## TypeScript

Approved.

---

## Vitest

Approved.

---

## ESLint Flat Config

Approved.

---

## Prettier

Approved.

---

## Node.js 22+

Approved.

---

## Windows Development Environment

Approved.

---

## VS Code as Primary IDE

Approved.

---

## Claude Code as Principal Software Engineer

Approved.

---

## ChatGPT as CTO / Chief Architect

Approved.

---

# Frozen Architecture Decisions

The following are considered frozen.

- Modular architecture
- Workspace-based repository
- Package isolation
- TypeScript-first development
- Test-first mindset
- Lint clean before merge
- Formatting enforced
- No circular dependencies
- No shared mutable global state
- No hidden coupling
- No undocumented modules
- ADR-required architecture changes

---

# Current Milestone

Milestone:

```
Foundation Complete
```

Objective:

Finish the engineering platform that future implementation will build upon.

Deliverables include:

- Repository standards
- Engineering documentation
- Architecture freeze
- Development workflow
- State management documentation

---

# Completed Stories

## Foundation

- Repository initialized
- Engineering workflow defined
- Technology stack selected
- Architecture frozen
- AI roles defined
- Documentation strategy established

---

# Pending Stories

High priority:

1. Complete foundational repository documentation.
2. Define initial module interfaces.
3. Implement core workspace structure.
4. Configure build pipeline.
5. Configure linting.
6. Configure formatting.
7. Configure testing.
8. Configure GitHub Actions.
9. Establish package boundaries.
10. Implement first production modules.

---

# Backlog

Potential future work.

## Engine

- Strategy Engine
- Planning Engine
- Decision Engine
- Action Engine

---

## AI

- LLM integrations
- Local models
- Multi-agent coordination
- Memory systems

---

## Tooling

- CLI
- Inspector
- Replay viewer
- Debug tooling

---

## Plugins

- Game adapters
- Strategy packs
- Community plugins

---

## Developer Experience

- Documentation site
- Examples
- Templates
- Starter projects

---

# Risks

## Scope Creep

The project must avoid uncontrolled feature expansion.

---

## Architectural Drift

Changes outside approved ADRs are prohibited.

---

## Technical Debt

Shortcuts that reduce maintainability are unacceptable.

---

## Over-Engineering

Avoid abstraction without demonstrated need.

---

## AI Hallucination

All AI-generated code must be reviewed before merge.

---

# Constraints

Development environment:

- Windows

Primary IDE:

- VS Code

Runtime:

- Node.js 22+

Language:

- TypeScript

Architecture:

- Frozen

All code must be:

- Typed
- Tested
- Linted
- Formatted
- Reviewed

---

# Coding Standards

## General

- Small modules
- High cohesion
- Low coupling
- Explicit interfaces
- Predictable APIs

---

## TypeScript

- Strict mode
- No implicit any
- Prefer readonly
- Prefer interfaces for contracts
- Avoid unnecessary inheritance

---

## Naming

- Clear
- Consistent
- Domain-driven

---

## Testing

Every feature requires:

- Unit tests
- Edge case coverage
- Deterministic behavior

---

## Documentation

Public APIs require documentation.

Complex modules require architectural documentation.

---

# Development Workflow

Feature development follows:

1. Story selected
2. Specification approved
3. Architecture validated
4. Claude Code implementation
5. Tests added
6. Lint passes
7. Review
8. Merge
9. Release verification

No direct implementation without an approved story.

---

# AI Team Roles

## CTO

ChatGPT

Responsibilities:

- Architecture
- Specifications
- Reviews
- ADRs
- Technical direction
- Release approval

Does not produce placeholder implementations.

---

## Principal Software Engineer

Claude Code

Responsibilities:

- Implementation
- Refactoring
- Tests
- Build fixes
- Repository artifacts
- Pull requests

---

## Human Maintainer

Responsibilities:

- Final approval
- Merge
- Product direction
- Repository ownership

---

# Module Overview

The architecture is intentionally modular.

Planned modules include:

## Core

Framework primitives.

---

## Engine

Execution engine.

---

## Planner

Planning algorithms.

---

## Decision

Decision making.

---

## Memory

Agent memory.

---

## Perception

Game state interpretation.

---

## Actions

Game command execution.

---

## Strategy

High-level planning.

---

## Integrations

External AI providers.

---

## CLI

Developer tooling.

---

## Shared

Reusable utilities.

---

# Dependency Graph

The intended dependency direction is strictly hierarchical.

```
Applications
      │
      ▼
Strategy
      │
      ▼
Planner
      │
      ▼
Decision
      │
      ▼
Engine
      │
      ▼
Core
      │
      ▼
Shared
```

Rules:

- Dependencies flow downward only.
- Reverse dependencies are forbidden.
- Circular dependencies are forbidden.
- Cross-layer access is prohibited unless explicitly approved.

---

# Next Story

Establish the complete repository foundation by implementing the approved monorepo structure, workspace configuration, baseline tooling (TypeScript, npm Workspaces, Vitest, ESLint Flat Config, and Prettier), and initial package boundaries in accordance with Architecture Version 1.0.

---

# Definition of Done

A story is complete only when:

- Implementation complete
- Tests written
- Tests passing
- Lint passing
- Formatting passing
- Documentation updated
- PROJECT_STATE.md updated if applicable
- Architecture preserved
- Code reviewed
- Ready for merge

---

# Release Checklist

Before any release:

- All tests pass
- Lint passes
- Formatting passes
- No TODOs blocking release
- No failing CI jobs
- Documentation updated
- Changelog updated
- Version bumped
- Architecture unchanged or supported by approved ADR
- Release notes prepared
- Repository state updated
- PROJECT_STATE.md synchronized with the repository
