/**
 * EPIC 14 Phase 2: Research Events
 *
 * Event definitions for the Research Data Store.
 * These events are published by the Arena and subscribed by:
 * - ResearchDataAccessLayer (persistence)
 * - Future systems (analytics, metrics, reporting, etc.)
 *
 * Events are the contract between:
 * - What the runtime publishes (facts about chess games)
 * - What systems consume (structured research data)
 */

/**
 * Base class for all research events.
 * Ensures consistent structure and metadata.
 */
export abstract class ResearchEvent {
  readonly timestamp: number;
  readonly id: string;

  constructor() {
    this.timestamp = Date.now();
    this.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// PROJECT & EXPERIMENT LIFECYCLE EVENTS
// ============================================================================

/**
 * ProjectStarted: A new research project has been created.
 */
export class ProjectStarted extends ResearchEvent {
  constructor(
    readonly projectId: string,
    readonly name: string,
    readonly description?: string
  ) {
    super();
  }
}

/**
 * ExperimentStarted: A new research experiment has been defined.
 */
export class ExperimentStarted extends ResearchEvent {
  constructor(
    readonly experimentId: string,
    readonly projectId: string,
    readonly name: string,
    readonly hypothesis: string,
    readonly description?: string,
    readonly targetGames?: number,
    readonly successCriteria?: string,
    readonly gitCommit?: string,
    readonly applicationVersion?: string
  ) {
    super();
  }
}

/**
 * ExperimentFinished: An experiment has completed.
 */
export class ExperimentFinished extends ResearchEvent {
  constructor(
    readonly experimentId: string,
    readonly status: 'completed' | 'failed',
    readonly gameCount?: number,
    readonly durationSeconds?: number
  ) {
    super();
  }
}

// ============================================================================
// RUN LIFECYCLE EVENTS
// ============================================================================

/**
 * RunStarted: An execution instance of an experiment has begun.
 */
export class RunStarted extends ResearchEvent {
  constructor(
    readonly runId: string,
    readonly experimentId: string,
    readonly runNumber: number,
    readonly configSnapshot: string, // JSON
    readonly environmentSnapshot: EnvironmentData,
    readonly gitCommit: string,
    readonly applicationVersion: string,
    readonly randomSeed?: string
  ) {
    super();
  }
}

/**
 * RunFinished: A run has completed.
 */
export class RunFinished extends ResearchEvent {
  constructor(
    readonly runId: string,
    readonly experimentId: string,
    readonly status: 'completed' | 'failed',
    readonly gameCount?: number,
    readonly durationSeconds?: number
  ) {
    super();
  }
}

// ============================================================================
// GAME LIFECYCLE EVENTS
// ============================================================================

/**
 * GameStarted: A chess game has begun.
 */
export class GameStarted extends ResearchEvent {
  constructor(
    readonly gameId: string,
    readonly runId: string,
    readonly experimentId: string,
    readonly gameNumber: number,
    readonly whiteModel: string,
    readonly blackModel: string,
    readonly whiteConfigId: string,
    readonly blackConfigId: string,
    readonly executionStart: number
  ) {
    super();
  }
}

/**
 * GameFinished: A chess game has completed.
 * This is the primary event that triggers research data collection.
 */
export class GameFinished extends ResearchEvent {
  constructor(
    readonly gameId: string,
    readonly runId: string,
    readonly experimentId: string,
    readonly gameNumber: number,
    readonly result: '1' | '0.5' | '0', // white win, draw, black win
    readonly termination?: string,
    readonly pgn?: string,
    readonly finalFen?: string,
    readonly openingEco?: string,
    readonly openingName?: string,
    readonly moveCount?: number,
    readonly durationMs?: number,
    readonly executionEnd?: number,
    readonly whiteIllegalMoves?: number,
    readonly blackIllegalMoves?: number,
    readonly avgLatencyMs?: number,
    readonly maxLatencyMs?: number,
    readonly parsingErrors?: number
  ) {
    super();
  }
}

// ============================================================================
// MOVE EVENTS
// ============================================================================

/**
 * MovePlayed: A move has been made in a game.
 * Fired after each move is executed and validated.
 */
export class MovePlayed extends ResearchEvent {
  constructor(
    readonly moveId: string,
    readonly gameId: string,
    readonly runId: string,
    readonly experimentId: string,
    readonly moveNumber: number,
    readonly color: 'white' | 'black',
    readonly san: string,
    readonly fenBefore: string,
    readonly fenAfter: string,
    readonly latencyMs: number,
    readonly confidence: number, // 0-100
    readonly isLegal: boolean,
    readonly illegalRetryCount?: number,
    readonly modelName?: string,
    readonly modelConfigId?: string,
    readonly executionStart?: number,
    readonly executionEnd?: number
  ) {
    super();
  }
}

// ============================================================================
// LLM DECISION EVENTS
// ============================================================================

/**
 * DecisionGenerated: An LLM has made a decision (generated a move).
 * Captures prompt, response, and parsing information.
 */
export class DecisionGenerated extends ResearchEvent {
  constructor(
    readonly decisionId: string,
    readonly moveId: string,
    readonly gameId: string,
    readonly runId: string,
    readonly experimentId: string,
    readonly modelIdentifier: string,
    readonly modelConfigId: string,
    readonly prompt: string,
    readonly response: string,
    readonly parsingStatus: 'success' | 'failed' | 'malformed',
    readonly parsedMove?: string,
    readonly promptVersion?: string,
    readonly promptHash?: string,
    readonly promptTemplateName?: string,
    readonly tokensIn?: number,
    readonly tokensOut?: number,
    readonly parsingNotes?: string,
    readonly retryCount?: number,
    readonly executionStart?: number,
    readonly executionEnd?: number
  ) {
    super();
  }
}

// ============================================================================
// POSITION EVENTS
// ============================================================================

/**
 * PositionRecorded: A chess position has been recorded.
 * Used for deduplication and position-based analysis.
 */
export class PositionRecorded extends ResearchEvent {
  constructor(
    readonly fen: string,
    readonly whitepieces: number,
    readonly blackPieces: number,
    readonly isEndgame?: boolean,
    readonly isCheck?: boolean,
    readonly tacticalmotifTags?: string, // JSON array
    readonly endgameClassification?: string
  ) {
    super();
  }
}

// ============================================================================
// CONFIGURATION & ENVIRONMENT EVENTS
// ============================================================================

/**
 * ConfigurationSnapshotCaptured: Configuration has been recorded.
 */
export class ConfigurationSnapshotCaptured extends ResearchEvent {
  constructor(
    readonly experimentId: string,
    readonly configSnapshot: string, // JSON of all settings
    readonly gitCommit: string,
    readonly applicationVersion: string
  ) {
    super();
  }
}

/**
 * EnvironmentSnapshotCaptured: System environment has been recorded.
 */
export class EnvironmentSnapshotCaptured extends ResearchEvent {
  constructor(
    readonly runId: string,
    readonly experimentId: string,
    readonly environment: EnvironmentData
  ) {
    super();
  }
}

// ============================================================================
// ARENA RUNTIME EVENTS
// ============================================================================

/**
 * ArenaStarted: The chess arena has started.
 */
export class ArenaStarted extends ResearchEvent {
  constructor(
    readonly experimentId: string,
    readonly runId: string,
    readonly environment: EnvironmentData,
    readonly gitCommit: string,
    readonly applicationVersion: string
  ) {
    super();
  }
}

/**
 * ArenaFinished: The chess arena has stopped.
 */
export class ArenaFinished extends ResearchEvent {
  constructor(
    readonly runId: string,
    readonly experimentId: string,
    readonly status: 'success' | 'error' | 'interrupted',
    readonly gamesCompleted?: number,
    readonly durationSeconds?: number,
    readonly errorMessage?: string
  ) {
    super();
  }
}

/**
 * ArenaRecovered: The arena recovered from an error.
 */
export class ArenaRecovered extends ResearchEvent {
  constructor(
    readonly runId: string,
    readonly experimentId: string,
    readonly errorType: string,
    readonly recovery: string,
    readonly successfullRetry: boolean
  ) {
    super();
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * EnvironmentData: Complete system context snapshot.
 */
export interface EnvironmentData {
  os: string;
  osVersion: string;
  osRelease?: string;
  nodeVersion: string;
  npmVersion?: string;
  pnpmVersion?: string;
  cpuModel?: string;
  cpuCores?: number;
  ramGb?: number;
  storageAvailableGb?: number;
  ollamaVersion?: string;
  ollamaLocation?: string;
  ollamaCacheDir?: string;
  chessJsVersion?: string;
  chessAdapterVersion?: string;
  networkLatencyToOllamaMs?: number;
  otherMetadata?: string; // JSON for extensibility
}

/**
 * Event type union: All possible research events.
 */
export type AnyResearchEvent =
  | ProjectStarted
  | ExperimentStarted
  | ExperimentFinished
  | RunStarted
  | RunFinished
  | GameStarted
  | GameFinished
  | MovePlayed
  | DecisionGenerated
  | PositionRecorded
  | ConfigurationSnapshotCaptured
  | EnvironmentSnapshotCaptured
  | ArenaStarted
  | ArenaFinished
  | ArenaRecovered;

/**
 * Event type constants for subscription patterns.
 */
export const EventTypes = {
  PROJECT_STARTED: 'ProjectStarted',
  EXPERIMENT_STARTED: 'ExperimentStarted',
  EXPERIMENT_FINISHED: 'ExperimentFinished',
  RUN_STARTED: 'RunStarted',
  RUN_FINISHED: 'RunFinished',
  GAME_STARTED: 'GameStarted',
  GAME_FINISHED: 'GameFinished',
  MOVE_PLAYED: 'MovePlayed',
  DECISION_GENERATED: 'DecisionGenerated',
  POSITION_RECORDED: 'PositionRecorded',
  CONFIG_SNAPSHOT_CAPTURED: 'ConfigurationSnapshotCaptured',
  ENVIRONMENT_SNAPSHOT_CAPTURED: 'EnvironmentSnapshotCaptured',
  ARENA_STARTED: 'ArenaStarted',
  ARENA_FINISHED: 'ArenaFinished',
  ARENA_RECOVERED: 'ArenaRecovered',
} as const;
