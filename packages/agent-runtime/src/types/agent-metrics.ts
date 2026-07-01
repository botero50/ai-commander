export interface AgentMetrics {
  readonly ticksExecuted: number;
  readonly decisionsExecuted: number;
  readonly commandsExecuted: number;
  readonly averagePlanningTimeMs: number;
  readonly averageDecisionTimeMs: number;
  readonly errorsEncountered: number;
  readonly lastTickTimestamp: number;
}
