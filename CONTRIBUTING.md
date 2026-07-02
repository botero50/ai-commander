# Contributing to AI Commander

Thank you for your interest in contributing to AI Commander! This document provides guidelines and instructions for development, testing, and submitting contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Building the Project](#building-the-project)
- [Running Tests](#running-tests)
- [Coding Standards](#coding-standards)
- [Pull Request Workflow](#pull-request-workflow)
- [ADR Process](#adr-process)
- [Release Process](#release-process-maintainers-only)

---

## Getting Started

### Prerequisites

- **Node.js:** >=22.0.0
- **npm:** 10.x or later
- **Git:** For version control

### Clone the Repository

```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
```

### Install Dependencies

```bash
npm install
```

This installs dependencies for the root workspace and all packages.

---

## Development Environment

### Recommended Setup

1. **Editor:** Visual Studio Code or JetBrains IDE
2. **TypeScript Extension:** Ensure TypeScript support is enabled
3. **ESLint Extension:** For real-time linting feedback
4. **Prettier Extension:** For code formatting

### Repository Structure

```
ai-commander/
├── packages/              # 12 framework packages
│   ├── adapter/          # Game adapter contracts
│   ├── core/             # Core runtime infrastructure
│   ├── domain/           # Game-agnostic domain model
│   ├── ecs/              # Entity component system
│   ├── engine/           # Execution pipeline
│   ├── goals/            # Goal model
│   ├── planner/          # Planning layer
│   ├── decision/         # Decision engine
│   ├── behavior-tree/    # Behavior tree framework
│   ├── agent-runtime/    # Agent runtime orchestrator
│   ├── fake-game-adapter/# Reference game adapter
│   └── openra-adapter/   # OpenRA game integration
├── apps/                 # Applications
│   ├── reference/        # Reference application
│   └── openra/          # OpenRA integration examples
├── .foundation/          # Architecture documentation
│   ├── adr/             # Architecture Decision Records
│   ├── architecture/    # Architecture documentation
│   └── docs/            # Additional documentation
└── .github/workflows/    # CI/CD configuration
```

### Understanding the Architecture

Before contributing, familiarize yourself with the framework architecture:

1. **Read:** `/README.md` - High-level overview
2. **Study:** `.foundation/architecture/` - Detailed architecture documentation
3. **Review:** `.foundation/adr/` - Architecture decisions and patterns
4. **Explore:** Package READMEs in `packages/*/README.md`

---

## Building the Project

### Full Build

Build all packages with TypeScript compilation:

```bash
npm run build
```

This runs `tsc -b` with composite project references. All packages compile to `dist/` directories.

### Build Single Package

```bash
cd packages/core
npm run build
```

### Verify Build

```bash
npm run typecheck
```

This checks TypeScript without emitting files. Use for quick verification.

---

## Running Tests

### Full Test Suite

Run all tests across all packages:

```bash
npm run test
```

Expected result: 246+ tests passing

### Run Tests in Watch Mode

Useful during development:

```bash
npm run test:watch
```

### Run Tests for Single Package

```bash
cd packages/core
npm run test
```

### Run Specific Test File

```bash
npm run test -- src/tests/agent-runtime.test.ts
```

### Test Coverage

The test suite includes:

- **Framework tests:** 189 tests across 12 packages
- **OpenRA integration tests:** 24 tests
- **Production validation tests:** 26 tests
- **Reference app tests:** 7 test files

### Test Organization

Tests are co-located with source code:

```
packages/core/
├── src/
│   ├── core.ts
│   └── tests/
│       └── core.test.ts
```

---

## Coding Standards

### TypeScript

- **Strict mode:** Always enabled (`strict: true` in tsconfig.json)
- **No `any` type:** Use explicit types
- **Prefer interfaces:** For object contracts
- **Comments:** Only for non-obvious intent (avoid obvious comments)

### Naming Conventions

- **Files:** kebab-case (e.g., `agent-runtime.ts`)
- **Classes:** PascalCase (e.g., `AgentRuntime`)
- **Functions/variables:** camelCase (e.g., `getMetrics()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces:** PascalCase prefixed with `I` only if necessary (prefer plain PascalCase)

### Code Style

The project uses **Prettier** for formatting and **ESLint** for linting.

#### Format Code

```bash
npm run format
```

#### Check Format (without modifying)

```bash
npm run format:check
```

#### Lint Code

```bash
npm run lint
```

#### Fix Lint Issues (where possible)

```bash
npm run lint -- --fix
```

### Architectural Principles

When contributing, follow these principles:

1. **Adapter Pattern:** Adapters are infrastructure-agnostic. Game-specific logic belongs in applications, not adapters.
2. **Composition over Inheritance:** Use composition patterns for contract assembly.
3. **Determinism:** Ensure components are deterministic (same input → same output).
4. **Graceful Degradation:** Handle errors gracefully; recover where possible.
5. **No New Abstractions:** Reuse existing contracts; don't add framework abstractions.
6. **Application Owns Strategy:** Planners, AI decisions, and domain logic belong to applications, not the framework.

### Documentation

- **README.md:** Each package should have a README explaining purpose and usage
- **Inline Comments:** Explain non-obvious intent or workarounds
- **Commit Messages:** Clear, descriptive messages (see PR workflow below)

---

## Pull Request Workflow

### Before Starting Work

1. **Check for existing issues:** Search GitHub Issues for related work
2. **Create or claim an issue:** Describe what you're working on
3. **Create a feature branch:** `git checkout -b feature/your-feature-name`

### During Development

1. **Write tests first** (or alongside code)
2. **Keep commits atomic:** One logical change per commit
3. **Format regularly:** `npm run format` before committing
4. **Pass local tests:** `npm run test` must pass

### Before Submitting a Pull Request

```bash
# Format code
npm run format

# Run full validation
npm run doctor
```

This runs: typecheck, lint, format check, and tests. All must pass.

### Commit Message Conventions

Follow conventional commit format:

```
type(scope): description

Optional body explaining the change.

Optional footer with issue references.
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `test:` Test addition or improvement
- `docs:` Documentation
- `chore:` Build, CI/CD, dependencies
- `perf:` Performance improvement

**Examples:**

```
feat(agent-runtime): implement pause/resume lifecycle

Add pause() and resume() methods to AgentRuntime for graceful
execution control. Validates state transitions and maintains
metrics consistency.

Fixes #123
```

```
test(openra-adapter): add integration tests for command executor

Add 5 new tests covering command execution paths and error
recovery scenarios.
```

### Creating a Pull Request

1. **Push your branch:** `git push origin feature/your-feature-name`
2. **Create PR on GitHub:** Include description of changes
3. **Link issues:** Reference related issues in PR description
4. **Wait for CI:** GitHub Actions runs all checks (typecheck, lint, test)
5. **Address feedback:** Update code based on review comments
6. **Merge:** Once approved and all checks pass

### PR Description Template

```markdown
## Description

Brief explanation of what this PR does.

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring

## Changes

- Bullet point of changes
- Another change

## Testing

Describe how you tested these changes.

## Issues

Fixes #123, Related to #456
```

---

## ADR Process

Architecture Decision Records (ADRs) document significant design decisions.

### When to Create an ADR

- Adding new framework abstractions
- Changing core patterns or contracts
- Making tradeoff decisions (performance vs. simplicity, etc.)
- Documenting framework limitations

### ADR Format

ADRs are stored in `.foundation/adr/` and follow this structure:

```markdown
# ADR-NNN: Title

## Status

Proposed | Accepted | Deprecated

## Context

Problem statement and background.

## Decision

What was decided and why.

## Consequences

Positive and negative outcomes.

## Alternatives Considered

Other options and why they were rejected.
```

### Creating an ADR

1. Create file: `.foundation/adr/ADR-NNN-title.md`
2. Use next sequential number
3. Follow the format above
4. Include in pull request
5. Request architecture review

---

## Release Process (Maintainers Only)

### Version Numbering

AI Commander follows Semantic Versioning (MAJOR.MINOR.PATCH):

- **MAJOR:** Breaking changes to framework API
- **MINOR:** New features or significant enhancements
- **PATCH:** Bug fixes and documentation

Current: v1.0.0

### Release Steps

1. **Update CHANGELOG.md** with version and changes
2. **Update all package.json versions** to match release version
3. **Verify all tests pass:** `npm run test`
4. **Create release tag:** `git tag v1.0.0`
5. **Push tag:** `git push origin v1.0.0`
6. **Publish to npm:** `npm publish --workspaces --access public`
7. **Create GitHub Release:** Include release notes from CHANGELOG.md

### Changelog Format

```markdown
## [1.0.0] - 2026-07-01

### Added

- New features here

### Changed

- Modified features here

### Fixed

- Bug fixes here

### Deprecated

- Deprecated features here

### Removed

- Removed features here

### Security

- Security updates here
```

---

## Getting Help

### Resources

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions and discuss ideas
- **Architecture Docs:** `.foundation/architecture/` for design context
- **ADRs:** `.foundation/adr/` for decision rationale
- **Package READMEs:** `packages/*/README.md` for API documentation

### Community Guidelines

- Be respectful and constructive
- Follow the Code of Conduct (CODE_OF_CONDUCT.md)
- Search existing issues before creating duplicates
- Provide clear reproduction steps for bugs

---

## Development Checklist

Before submitting a pull request, verify:

- [ ] Code follows naming and style conventions
- [ ] TypeScript: No errors (`npm run typecheck`)
- [ ] Linting: No violations (`npm run lint`)
- [ ] Formatting: Consistent (`npm run format`)
- [ ] Tests: All passing (`npm run test`)
- [ ] New features have tests
- [ ] Documentation updated (README, inline comments)
- [ ] Commit messages are clear and descriptive
- [ ] No debug code or console.logs left behind
- [ ] No unrelated changes in PR

---

## Thank You

Thank you for contributing to AI Commander! Your efforts help make the framework better for everyone.

---

**Last Updated:** July 1, 2026  
**Framework Version:** v1.0.0+
