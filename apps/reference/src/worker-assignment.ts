import type { WorldState } from '@ai-commander/domain';

export interface WorkerAssignment {
  readonly workerId: string;
  readonly assignedFieldId: string;
  readonly assignedAtTick: number;
}

export interface WorkerStatus {
  readonly workerId: string;
  readonly isIdle: boolean;
  readonly position: { x: number; y: number };
  readonly assignedFieldId?: string;
}

export class WorkerAssignment_Logic {
  private assignedWorkers: Set<string> = new Set();

  detectIdleWorkers(worldState: WorldState): WorkerStatus[] {
    if (!worldState || !worldState.agents) return [];

    return worldState.agents
      .map((agent: any) => {
        const pos = this.extractPosition(agent.customData?.position);
        if (!pos) return null;

        return {
          workerId: agent.id,
          isIdle: agent.customData?.status !== 'gathering' && agent.customData?.status !== 'returning',
          position: pos,
        };
      })
      .filter((w): w is WorkerStatus => w !== null && w.isIdle);
  }

  selectBestField(availableFields: any[], currentWorkerCount: Map<string, number>): any | null {
    if (availableFields.length === 0) return null;

    // Find field with least workers assigned
    let bestField = availableFields[0];
    let minWorkers = currentWorkerCount.get(bestField.id) || 0;

    for (const field of availableFields) {
      const workerCount = currentWorkerCount.get(field.id) || 0;
      if (workerCount < minWorkers) {
        bestField = field;
        minWorkers = workerCount;
      }
    }

    return bestField;
  }

  recordAssignment(workerId: string): void {
    this.assignedWorkers.add(workerId);
  }

  isAssigned(workerId: string): boolean {
    return this.assignedWorkers.has(workerId);
  }

  clearAssignments(): void {
    this.assignedWorkers.clear();
  }

  private extractPosition(positionStr: any): { x: number; y: number } | null {
    try {
      if (!positionStr || typeof positionStr !== 'string') return null;
      const match = positionStr.match(/^(\d+),(\d+)$/);
      if (match && match[1] && match[2]) {
        return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
      }
      return null;
    } catch {
      return null;
    }
  }
}
