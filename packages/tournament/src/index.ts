// EPIC 32: Tournament Engine
export { TournamentScheduler, createScheduler } from './tournament-scheduler.js';
export { TournamentExecutor, createExecutor } from './tournament-executor.js';
export { ResultsAggregator, aggregateResults } from './results-aggregator.js';
export { RatingCalculator, calculateRatings } from './rating-calculator.js';
export { TournamentReporter, generateTournamentReport } from './tournament-reporter.js';
export { TournamentCLI, createMockExecutor } from './tournament-cli.js';

// EPIC 33: Streaming & Broadcast
export { StreamCoordinator, createStreamCoordinator } from './stream-coordinator.js';
export { WebSocketHub, createWebSocketHub } from './websocket-hub.js';
export { SpectatorTracker, createSpectatorTracker } from './spectator-tracker.js';
export { StreamArchiver, createStreamArchiver } from './stream-archiver.js';

export type {
  TournamentFormat,
  TournamentConfig,
  ScheduledMatch,
  CompletedMatch,
  PlayerRating,
  PlayerStandings,
  TournamentResults,
  TournamentSchedule,
  ExecutionConfig,
  ExecutorCallbacks,
  MatchExecutor,
} from './tournament-types.js';

export type {
  TournamentStreamEvent,
  TournamentStreamEventType,
  TournamentStartEvent,
  MatchStartEvent,
  MatchCompleteEvent,
  TournamentEndEvent,
  StreamState,
  EventHandler,
} from './stream-coordinator.js';

export type {
  ClientConnection,
  HubMetrics,
} from './websocket-hub.js';

export type {
  SpectatorSession,
  SpectatorMetrics,
} from './spectator-tracker.js';

export type {
  StreamArchive,
} from './stream-archiver.js';
