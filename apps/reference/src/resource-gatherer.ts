/**
 * Resource Gatherer: Autonomous resource collection for RTS gameplay.
 *
 * Story 101: Economy Bootstrapping
 *
 * Detects available resource fields, evaluates targets, and guides
 * worker units to gather resources. Integrates with existing goal
 * evaluation, progress tracking, and observable systems.
 */

import type { WorldState } from '@ai-commander/domain';

export interface ResourceField {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly resourceType: 'ore' | 'gems' | 'wood';
  readonly amount: number;
  readonly distanceFromAgent: number;
}

export interface GatheringProgress {
  readonly targetFieldId: string;
  readonly resourceType: string;
  readonly amountCollected: number;
  readonly amountRemaining: number;
  readonly percentComplete: number;
  readonly status: 'traveling' | 'gathering' | 'returning' | 'complete';
  readonly evidence: Record<string, unknown>;
}

export class ResourceGatherer {
  /**
   * Detect available resource fields from world state.
   * In real OpenRA: scans map for ore patches, gem fields, trees
   * In demo: returns hardcoded resource locations for testing
   */
  detectResourceFields(worldState: WorldState, agentPosition: { x: number; y: number }): ResourceField[] {
    // Demo implementation: return simulated resource fields
    // In real game, this would scan the actual map data

    const simulatedFields: ResourceField[] = [
      {
        id: 'ore-field-1',
        position: { x: 80, y: 50 },
        resourceType: 'ore',
        amount: 5000,
        distanceFromAgent: Math.hypot(80 - agentPosition.x, 50 - agentPosition.y),
      },
      {
        id: 'ore-field-2',
        position: { x: 20, y: 80 },
        resourceType: 'ore',
        amount: 3000,
        distanceFromAgent: Math.hypot(20 - agentPosition.x, 80 - agentPosition.y),
      },
      {
        id: 'gems-field-1',
        position: { x: 70, y: 70 },
        resourceType: 'gems',
        amount: 2000,
        distanceFromAgent: Math.hypot(70 - agentPosition.x, 70 - agentPosition.y),
      },
    ];

    // Filter to only nearby fields (within 100 units)
    return simulatedFields.filter(f => f.distanceFromAgent < 100);
  }

  /**
   * Evaluate a resource field for gathering priority.
   * Factors:
   * - Resource type (ore > gems > wood for economy)
   * - Distance to field (closer is better)
   * - Amount available (more is better)
   */
  evaluateResourceField(field: ResourceField): {
    readonly score: number;
    readonly reasoning: string;
  } {
    // Resource type priority (0.0 to 1.0)
    const typeScore = {
      ore: 0.9,  // Highest priority
      gems: 0.7,
      wood: 0.5,
    }[field.resourceType] || 0.5;

    // Distance factor (closer = higher score)
    const maxDistance = 100;
    const distanceScore = Math.max(0, 1 - field.distanceFromAgent / maxDistance);

    // Amount factor (more = higher score)
    const amountScore = Math.min(1, field.amount / 5000);

    // Weighted composite score
    const score = typeScore * 0.5 + distanceScore * 0.3 + amountScore * 0.2;

    const reasoning = `${field.resourceType} field (${field.amount} units, ${field.distanceFromAgent.toFixed(0)}m away)`;

    return { score, reasoning };
  }

  /**
   * Select the best resource field from available options.
   */
  selectBestField(fields: ResourceField[]): {
    readonly selectedField: ResourceField | null;
    readonly evaluations: readonly {
      readonly field: ResourceField;
      readonly score: number;
      readonly reasoning: string;
    }[];
    readonly reasoning: string;
  } {
    const evaluations = fields.map(field => ({
      field,
      score: this.evaluateResourceField(field).score,
      reasoning: this.evaluateResourceField(field).reasoning,
    }));

    // Sort by score descending
    evaluations.sort((a, b) => b.score - a.score);

    const selectedField = evaluations.length > 0 ? evaluations[0]!.field : null;

    const reasoning = selectedField
      ? `Selected ${selectedField.resourceType} at (${selectedField.position.x}, ${selectedField.position.y}): score ${evaluations[0]!.score.toFixed(3)}`
      : 'No resource fields available';

    return {
      selectedField,
      evaluations,
      reasoning,
    };
  }

  /**
   * Simulate gathering progress.
   * In real game: tracks actual worker unit progress
   * In demo: simulates gathering based on elapsed time
   */
  calculateGatheringProgress(
    targetFieldId: string,
    gatheringStartTick: number,
    currentTick: number,
    resourceFields: Map<string, ResourceField>
  ): GatheringProgress | null {
    const field = resourceFields.get(targetFieldId);
    if (!field) return null;

    // Simulate gathering: 100 ticks to complete
    const ticksElapsed = currentTick - gatheringStartTick;
    const totalTicksNeeded = 100;

    const percentComplete = Math.min(100, (ticksElapsed / totalTicksNeeded) * 100);
    const amountCollected = Math.floor((percentComplete / 100) * field.amount);
    const amountRemaining = field.amount - amountCollected;

    let status: 'traveling' | 'gathering' | 'returning' | 'complete' = 'gathering';
    if (percentComplete >= 100) {
      status = 'complete';
    }

    return {
      targetFieldId,
      resourceType: field.resourceType,
      amountCollected,
      amountRemaining,
      percentComplete: Math.floor(percentComplete),
      status,
      evidence: {
        fieldPosition: field.position,
        ticksElapsed,
        ticksNeeded: totalTicksNeeded,
      },
    };
  }
}
