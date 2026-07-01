# ADR-0001: Repository Architecture

**Status:** Approved and Implemented

**Date:** 2026-06-30

**Author:** Claude Code (Principal Software Engineer)

---

## Context

AI Commander is a new open-source framework for building AI-controlled strategy game agents. The initial repository structure needed to support:

- Multiple independent packages (domain, engine, decision, planner, strategy)
- Shared utilities and types
- Growth from 3 packages to 20+ packages over time
- TypeScript strict mode and compile-time type checking
- Comprehensive testing infrastructure
- Code quality enforcement (linting, formatting)
- Package versioning and releasing

The team needed to decide on:

1. How to organize packages (monorepo vs. multi-repo)
2. How to manage dependencies between packages
3. How to share TypeScript configuration
4. How to run tests across packages
5. How to enforce code quality standards

---

## Decision

**Adopt an npm Workspaces monorepo architecture with TypeScript composite projects.**

### Structure

```
ai-commander/
├── .foundation/              # Documentation and state
├── packages/                 # Feature packages
│   ├── domain/              # Domain models (layer 1)
│   ├── ecs/                 # ECS implementation (layer 1)
│   ├── engine/              # Execution engine (layer 2)
│   ├── decision/            # Decision algorithms (future)
│   ├── planner/             # Planning algorithms (future)
│   └── strategy/            # Strategic behavior (future)
├── apps/                    # Applications using the framework
│   ├── dashboard/           # Web dashboard (future)
│   └── playground/          # Interactive sandbox (future)
├── tools/                   # Development tools (future)
├── scripts/                 # Build and utility scripts
├── tests/                   # Integration tests (future)
├── docs/                    # User-facing documentation
├── package.json             # Root workspace definition
├── tsconfig.json            # Root TypeScript config
└── tsconfig.base.json       # Shared compiler settings
```

### npm Workspaces

- Root `package.json` defines workspaces: `packages/*` and `apps/*`
- Each package is an independent npm package
- Packages declare explicit dependencies on other packages via `file:` protocol
- Dependencies are resolved at install time, enabling local development
- All packages share the same node_modules directory

**Example:**

```json
{
  "name": "@ai-commander/engine",
  "dependencies": {
    "@ai-commander/domain": "file:../domain",
    "@ai-commander/ecs": "file:../ecs"
  }
}
```

### TypeScript Composite Projects

- Root `tsconfig.json` references all packages
- Each package has its own `tsconfig.json` with `"composite": true`
- TypeScript compiler uses references to build packages in proper order
- Build order is automatically determined by dependencies
- Source maps and declaration files are generated

**Example Build Command:**
```bash
tsc -b                    # Build all packages in dependency order
tsc -b --noEmit          # Type check without compilation
tsc -b packages/engine   # Build only engine and dependencies
```

### Shared Configuration

**TypeScript Base Configuration** (`tsconfig.base.json`):
- Shared compiler options (strict mode, module resolution, etc.)
- Path aliases for module resolution
- All packages extend this configuration

**ESLint Configuration** (`eslint.config.js`):
- Single Flat Config covering all packages
- Shared TypeScript rules and settings
- Exclusions for generated files and configs

**Prettier Configuration** (`prettier.config.js`):
- Enforces consistent formatting across all packages
- `.prettierignore` excludes generated files

**Vitest Configuration** (`vitest.workspace.ts`):
- Aggregates tests from all packages
- Parallel test execution
- Unified coverage reporting

### Package Organization

Each package contains:

```
packages/[name]/
├── src/                  # TypeScript source code
├── dist/                 # Compiled output (generated)
├── tests/                # Test files
├── package.json          # Package metadata
├── tsconfig.json         # Package-specific config
├── vitest.config.ts      # Package test config
├── README.md             # Package documentation
└── tsconfig.test.json    # TypeScript config for tests
```

### Root-Level Scripts

```bash
npm run build             # Build all packages
npm run typecheck         # Type check all packages
npm run lint              # Lint all code
npm run format            # Format all code
npm run format:check      # Check formatting
npm run test              # Run all tests
npm run doctor            # Full validation (build + lint + format + test)
```

---

## Consequences

### Positive

1. **Single Repository** — All code in one place, easier to view full system
2. **Atomic Changes** — Related changes across packages in single commit
3. **Shared Dependencies** — One node_modules directory reduces disk usage
4. **Unified Tooling** — ESLint, Prettier, TypeScript configured once
5. **Dependency Management** — Explicit package dependencies, easy to audit
6. **Local Development** — Developers build and test locally without publishing
7. **Incremental Builds** — TypeScript composite projects skip unchanged packages
8. **Clear Package Boundaries** — Separate package.json enforces explicit APIs

### Challenges

1. **Build Complexity** — Developers must understand composite projects
2. **Dependency Management** — Breaking changes affect multiple packages
3. **Repository Size** — Monorepo grows over time
4. **Publishing Coordination** — All packages must be published together
5. **CI/CD Complexity** — Must handle multiple packages in CI pipeline

### Mitigations

1. **Clear Documentation** — Architecture docs explain structure and boundaries
2. **Enforced Constraints** — TypeScript composite projects prevent invalid dependencies
3. **Automated Tooling** — Scripts automate common tasks
4. **Code Review** — Human review catches architectural violations
5. **CI Pipeline** — Automated checks validate structure on every commit

---

## Implementation Status

**Status:** Implemented and operational

**Current Implementation:**
- ✅ Root `package.json` with npm Workspaces
- ✅ TypeScript composite projects with references
- ✅ Three initial packages: domain, ecs, engine
- ✅ Shared tsconfig.base.json
- ✅ ESLint Flat Config
- ✅ Prettier configuration
- ✅ Vitest workspace configuration
- ✅ Root-level build scripts

**Build Verification:**
```
npm run doctor: PASS
├── typecheck: PASS
├── lint: PASS
├── format:check: PASS
└── test: 10/10 PASS
```

---

## Related ADRs

- ADR-0002: Dependency Direction — How packages depend on each other
- ADR-0003: Module Boundaries — What constitutes public API

---

## References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo.tools](https://monorepo.tools/)
- `.foundation/docs/ARCHITECTURE.md` — Architecture specification
