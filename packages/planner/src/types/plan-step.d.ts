import type { Command } from '@ai-commander/domain';
/**
 * Status of a single step in a plan.
 */
export declare enum PlanStepStatus {
    /** Step is pending execution */
    Pending = "pending",
    /** Step is currently executing or has been issued */
    Active = "active",
    /** Step has completed successfully */
    Completed = "completed",
    /** Step failed and cannot be recovered */
    Failed = "failed",
    /** Step was skipped */
    Skipped = "skipped"
}
/**
 * A single step in a plan.
 *
 * Represents an action to be executed as part of pursuing a goal.
 */
export interface PlanStep {
    /**
     * Unique identifier for this step within the plan.
     */
    readonly id: string;
    /**
     * Sequential order in the plan (0-based).
     *
     * Steps are expected to execute in order.
     */
    readonly sequenceNumber: number;
    /**
     * The command to execute.
     *
     * This is what the decision engine will select and issue.
     */
    readonly command: Command;
    /**
     * Current status of this step.
     */
    readonly status: PlanStepStatus;
    /**
     * Optional precondition description.
     *
     * Describes what must be true before this step can execute.
     * Game-agnostic: interpreted by strategy/execution layers.
     */
    readonly precondition?: string;
    /**
     * Optional postcondition description.
     *
     * Describes what should be true after successful execution.
     * Game-agnostic: interpreted by strategy/execution layers.
     */
    readonly postcondition?: string;
    /**
     * Optional estimated cost or effort for this step.
     *
     * Used to evaluate plan efficiency.
     * Type and semantics are game-agnostic.
     */
    readonly estimatedCost?: unknown;
    /**
     * Optional metadata about the step.
     */
    readonly metadata?: Record<string, unknown>;
}
/**
 * Check if a step status is terminal.
 */
export declare function isTerminalStepStatus(status: PlanStepStatus): boolean;
/**
 * Check if a step is awaiting execution.
 */
export declare function isPendingStepStatus(status: PlanStepStatus): boolean;
//# sourceMappingURL=plan-step.d.ts.map