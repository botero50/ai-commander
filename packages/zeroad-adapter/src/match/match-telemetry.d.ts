/**
 * DEPRECATED: MatchTelemetry has been partially moved to the framework as StateMetrics.
 *
 * This adapter maintains backward-compatible MatchTelemetry exports for existing code.
 *
 * Re-export and wrap framework components for backward compatibility.
 */
export { StateMetrics as MatchTelemetry } from '@ai-commander/adapter';
export type { StateSnapshot as TelemetrySnapshot, StateMetricsResult as TelemetryMetrics } from '@ai-commander/adapter';
//# sourceMappingURL=match-telemetry.d.ts.map