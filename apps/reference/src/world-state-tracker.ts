/**
 * World State Tracker: Detects meaningful changes in world state.
 *
 * Used to trigger goal adaptation re-evaluation.
 * Tracks changes between ticks and identifies when re-evaluation is warranted.
 */

import type { WorldState } from '@ai-commander/domain';

export interface WorldStateSnapshot {
  readonly tick: number;
  readonly agentCount: number;
  readonly agentPositions: readonly { readonly x: number; readonly y: number }[];
  readonly enemyCount: number;
  readonly resources: string;
  readonly timestamp: number;
}

export interface WorldStateChange {
  readonly fromTick: number;
  readonly toTick: number;
  readonly agentCountChanged: boolean;
  readonly agentPositionChanged: boolean;
  readonly enemyCountChanged: boolean;
  readonly resourcesChanged: boolean;
  readonly anyChange: boolean;
  readonly changeDescription: string;
}

export class WorldStateTracker {
  private lastSnapshot: WorldStateSnapshot | null = null;
  private snapshots: WorldStateSnapshot[] = [];

  /**
   * Capture current world state.
   */
  captureSnapshot(worldState: WorldState, tick: number): WorldStateSnapshot {
    const agentPositions = (worldState.agents || []).map(agent => {
      const pos = agent.customData?.position;
      if (typeof pos === 'string') {
        const match = pos.match(/^(\d+),(\d+)$/);
        if (match && match[1] && match[2]) {
          return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
        }
      }
      return { x: 0, y: 0 };
    });

    const snapshot: WorldStateSnapshot = {
      tick,
      agentCount: (worldState.agents || []).length,
      agentPositions,
      enemyCount: ((worldState as any).enemies || []).length,
      resources: String((worldState as any).resources || 'unknown'),
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Detect meaningful changes since last snapshot.
   */
  detectChanges(currentSnapshot: WorldStateSnapshot): WorldStateChange | null {
    if (!this.lastSnapshot) {
      this.lastSnapshot = currentSnapshot;
      return null; // First snapshot, no change to detect
    }

    const agentCountChanged = this.lastSnapshot.agentCount !== currentSnapshot.agentCount;
    const agentPositionChanged = this.positionsChanged(
      this.lastSnapshot.agentPositions,
      currentSnapshot.agentPositions
    );
    const enemyCountChanged = this.lastSnapshot.enemyCount !== currentSnapshot.enemyCount;
    const resourcesChanged = this.lastSnapshot.resources !== currentSnapshot.resources;

    const anyChange =
      agentCountChanged || agentPositionChanged || enemyCountChanged || resourcesChanged;

    // Generate description
    const descriptions: string[] = [];
    if (agentCountChanged) {
      descriptions.push(`agent count ${this.lastSnapshot.agentCount} → ${currentSnapshot.agentCount}`);
    }
    if (agentPositionChanged) {
      descriptions.push(`agent position changed`);
    }
    if (enemyCountChanged) {
      descriptions.push(`enemy count ${this.lastSnapshot.enemyCount} → ${currentSnapshot.enemyCount}`);
    }
    if (resourcesChanged) {
      descriptions.push(`resources changed`);
    }

    const changeDescription = descriptions.join(', ');

    const changes: WorldStateChange = {
      fromTick: this.lastSnapshot.tick,
      toTick: currentSnapshot.tick,
      agentCountChanged,
      agentPositionChanged,
      enemyCountChanged,
      resourcesChanged,
      anyChange,
      changeDescription,
    };

    // Update last snapshot
    this.lastSnapshot = currentSnapshot;

    return anyChange ? changes : null;
  }

  /**
   * Check if agent positions changed significantly.
   */
  private positionsChanged(
    oldPositions: readonly { x: number; y: number }[],
    newPositions: readonly { x: number; y: number }[]
  ): boolean {
    if (oldPositions.length !== newPositions.length) {
      return true;
    }

    for (let i = 0; i < oldPositions.length; i++) {
      const old = oldPositions[i];
      const newPos = newPositions[i];
      if (old && newPos && (old.x !== newPos.x || old.y !== newPos.y)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get last snapshot.
   */
  getLastSnapshot(): WorldStateSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Get all snapshots.
   */
  getAllSnapshots(): WorldStateSnapshot[] {
    return [...this.snapshots];
  }
}
