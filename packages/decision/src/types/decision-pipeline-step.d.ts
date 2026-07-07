import type { PipelineStep } from '@ai-commander/engine';
import type { DecisionEngine } from './decision-engine.js';
import type { DecisionPolicy } from './decision-policy.js';
/**
 * Decision pipeline step.
 *
 * Bridges the Engine runtime with the Decision layer.
 * Implements PipelineStep but contains no AI logic itself.
 */
export declare function createDecisionPipelineStep(engine: DecisionEngine, policy: DecisionPolicy): PipelineStep;
//# sourceMappingURL=decision-pipeline-step.d.ts.map