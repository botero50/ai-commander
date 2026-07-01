# @ai-commander/ecs

Entity Component System (ECS) for AI Commander.

## Overview

This package implements a high-performance Entity Component System for efficient game state management and agent reasoning.

## Architecture

ECS is a software architectural pattern useful for game development and data-oriented design. It separates entities (game objects), components (data/properties), and systems (behavior/logic).

## Structure

```
src/
├── index.ts              # Public exports
├── entity/               # Entity management
├── component/            # Component definitions
└── system/               # System implementations
```

## Usage

```typescript
import { World, Entity } from '@ai-commander/ecs';
```
