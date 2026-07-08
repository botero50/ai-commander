/**
 * DEPRECATED: BrainLifecycle has been moved to the framework as ExternalSystemLifecycle.
 *
 * This adapter still maintains backward-compatible BrainLifecycle exports
 * for existing code, but new code should use the framework ExternalSystemLifecycle directly.
 *
 * Re-export from framework for backward compatibility.
 */

import { ExternalSystemLifecycle } from '@ai-commander/adapter';

export { ExternalSystemHealthStatus as BrainHealthStatus } from '@ai-commander/adapter';
export type {
  ExternalSystemHealthCheckResult as HealthCheckResult,
  ExternalSystemLifecycleEvent as LifecycleEvent,
  ExternalSystemLifecycleConfig as BrainLifecycleConfig,
} from '@ai-commander/adapter';

/**
 * Backward-compatible wrapper around ExternalSystemLifecycle from the framework.
 * All implementation has been moved to the framework.
 */
export class BrainLifecycle extends ExternalSystemLifecycle {
  constructor(config: Partial<any>, logger: any) {
    super(config, logger);
  }
}
