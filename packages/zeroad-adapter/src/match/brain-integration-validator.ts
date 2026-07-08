/**
 * DEPRECATED: BrainIntegrationValidator has been moved to the framework as IntegrationValidator.
 *
 * This adapter maintains backward-compatible BrainIntegrationValidator exports
 * for existing code, but new code should use the framework IntegrationValidator directly.
 *
 * Re-export from framework for backward compatibility.
 */

import { IntegrationValidator } from '@ai-commander/adapter';

export { IntegrationValidator as BrainIntegrationValidator } from '@ai-commander/adapter';
export type {
  IntegrationValidationResult as BrainIntegrationValidationResult,
  ValidationMetrics,
  CycleValidationResult,
} from '@ai-commander/adapter';
