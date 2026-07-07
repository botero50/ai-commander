// Adapter layer (mock)
export { OpenRAProcessManager } from "./process-manager";
export type { OpenRAConfig } from "./process-manager";

export { OpenRAStateReader } from "./state-reader";
export type { OpenRAGameState, OpenRABuilding, OpenRAPlayer, OpenRAUnit } from "./state-reader";

export { WorldMapper } from "./world-mapper";
export { CommandExecutor } from "./command-executor";
export type { OpenRACommand, CommandValidationResult } from "./command-executor";

export { EventSynchronizer } from "./event-synchronizer";
export type { GameEvent } from "./event-synchronizer";

// Real OpenRA-RL integration
export { OpenRAStateReaderRL, createOpenRAStateReaderRL } from "./openra-rl-state-reader";
export { OpenRACommandExecutorRL, createOpenRACommandExecutorRL } from "./openra-rl-command-executor";
export { OpenRARLBridge, createOpenRARLBridge } from "./openra-rl-bridge";
export type { OpenRARLBridgeConfig, OpenRARLBridgeState } from "./openra-rl-bridge";

// Validators
export { WorkerValidator } from "./worker-validator";
export type { WorkerValidationResult, WorkerAction } from "./worker-validator";

export { EconomyValidator } from "./economy-validator";
export type { EconomyValidationResult, EconomyMetrics } from "./economy-validator";

export { MilitaryValidator } from "./military-validator";
export type { MilitaryValidationResult, MilitaryMetrics } from "./military-validator";

export { MatchOrchestrator } from "./match-orchestrator";
export type { MatchResult } from "./match-orchestrator";

export { ProviderValidator } from "./provider-validator";
export type { ProviderValidationResult } from "./provider-validator";

// Gameplay providers
export { OpenAIGameplay, createOpenAIGameplay } from "./openai-gameplay";
export type { OpenAIGameplayConfig } from "./openai-gameplay";

export { ClaudeGameplay, createClaudeGameplay } from "./claude-gameplay";
export type { ClaudeGameplayConfig } from "./claude-gameplay";

export { OllamaGameplay, createOllamaGameplay } from "./ollama-gameplay";
export type { OllamaGameplayConfig } from "./ollama-gameplay";

export { GeminiGameplay, createGeminiGameplay } from "./gemini-gameplay";
export type { GeminiGameplayConfig } from "./gemini-gameplay";

// Tournament runners
export { SingleMatchRunner } from "./single-match-runner";
export type { SingleMatchResult, SingleMatchConfig } from "./single-match-runner";

export { MultiMatchRunner } from "./multi-match-runner";
export type { MultiMatchResult, MultiMatchConfig, MultiMatchAggregateStats } from "./multi-match-runner";

export { TournamentEngine } from "./tournament-engine";
export type { TournamentResult, TournamentStandings, TournamentConfig } from "./tournament-engine";

// Analysis tools
export { RatingEngine } from "./rating-engine";
export type { Rating, RatingUpdate } from "./rating-engine";

export { CostAnalyzer } from "./cost-analyzer";
export type { Provider, ProviderPricing, CostBreakdown, TournamentCostAnalysis, TokenUsage } from "./cost-analyzer";

export { BenchmarkReporter } from "./benchmark-reporter";
export type { BenchmarkReport } from "./benchmark-reporter";

export { StrategyAnalyzer } from "./strategy-analyzer";
export type { Strategy, StrategyMetrics, ProviderStrategy } from "./strategy-analyzer";

export { ReplayEngine } from "./replay-engine";
export type { Replay, ReplayComparison } from "./replay-engine";

// Product
export { DemoOrchestrator } from "./demo-orchestrator";
export type { DemoConfig } from "./demo-orchestrator";

export { DashboardConfig } from "./dashboard-config";
export type { DashboardData, DashboardWidget } from "./dashboard-config";

export { ProductionValidator } from "./production-validator";
export type { ProductionValidationResult } from "./production-validator";
