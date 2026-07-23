/**
 * EPIC 14: Research Data Store
 *
 * Complete export of Research Data Store components.
 * This is the public API surface.
 *
 * The entire application should only import from this index.
 * All internal details (SQLite, transactions, etc.) are hidden.
 */

// Phase 1: Database layer
export { ResearchDatabase, DatabaseConfig } from './database';

// Phase 1: Type definitions
export type {
  Experiment,
  Run,
  EnvironmentSnapshot,
  ModelConfig,
  Game,
  Move,
  LLMDecision,
  Position,
  OpeningStats,
  ModelPerformance,
  EloProgression,
  GameWithContext,
  MoveWithContext,
  LLMDecisionSummary,
  ExperimentInput,
  RunInput,
  GameInput,
  MoveInput,
  LLMDecisionInput,
} from './types';

// Phase 2: Event bus
export {
  ResearchEventBus,
  getResearchEventBus,
  createResearchEventBus,
} from './event-bus';

// Phase 2: Event types
export type { EnvironmentData, AnyResearchEvent } from './events';
export {
  ResearchEvent,
  ProjectStarted,
  ExperimentStarted,
  ExperimentFinished,
  RunStarted,
  RunFinished,
  GameStarted,
  GameFinished,
  MovePlayed,
  DecisionGenerated,
  PositionRecorded,
  ConfigurationSnapshotCaptured,
  EnvironmentSnapshotCaptured,
  ArenaStarted,
  ArenaFinished,
  ArenaRecovered,
  EventTypes,
} from './events';

// Phase 2: Data access layer
export { ResearchDataAccessLayer } from './data-access';

// Phase 2: Arena integration
export {
  ArenaResearchIntegration,
  createArenaIntegration,
} from './arena-integration';
