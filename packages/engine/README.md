# @ai-commander/engine

Core execution engine for AI Commander.

## Overview

The execution engine is responsible for:

- Managing the game loop
- Coordinating agent actions
- Processing state transitions
- Orchestrating decision-making
- Handling action execution

## Architecture

The engine sits at the center of the framework, coordinating between perception, planning, and execution layers.

```
Applications
    ↓
Strategy
    ↓
Planner
    ↓
Decision
    ↓
Engine ← (you are here)
    ↓
Core
    ↓
Domain
```

The engine depends on domain models and provides the interface for higher-level components.

## Structure

```
src/
├── index.ts           # Public exports
├── engine.ts          # Main execution engine
└── coordinator/       # Multi-agent coordination
```

## Usage

```typescript
import { Engine } from '@ai-commander/engine';
```
