# @ai-commander/domain

Domain models and core entities for AI Commander.

## Overview

This package defines the fundamental data structures and interfaces that represent the core concepts in the AI Commander framework:

- Game entities
- Agent definitions
- State models
- Event structures
- Action schemas

## Purpose

The domain layer provides the foundation for all higher-level components. It defines what the system works with, without defining how work gets done.

## Architecture

The domain layer sits at the bottom of the dependency hierarchy:

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
Domain ← (you are here)
```

Domain models must be:

- **Stable**: Minimal changes over time
- **Pure**: No side effects or external dependencies
- **Reusable**: Imported by all higher layers
- **Well-typed**: Full TypeScript support
- **Documented**: Clear contracts and examples

## Structure

```
src/
├── index.ts           # Public exports
├── types/             # Type definitions
└── interfaces/        # Core interfaces
```

## Usage

```typescript
import { Entity, Agent } from '@ai-commander/domain';
```
