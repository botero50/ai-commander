import { createCommand, createActionId, createTick } from '@ai-commander/domain';
/**
 * Converts framework WorldState to Brain SDK WorldObservation.
 * Adapts domain model to Brain's expected observation format while maintaining immutability.
 */
export class BrainAdapter {
    static worldStateToObservation(worldState, missionId, agentId) {
        const primaryAgent = worldState.agents[0];
        const agentIdStr = primaryAgent?.agentId ? String(primaryAgent.agentId) : agentId;
        return {
            tick: worldState.time.currentTick.number,
            timestamp: Date.now(),
            missionId,
            agentId,
            agentName: `Agent-${agentId}`,
            agentPosition: primaryAgent?.customData?.position ?? { x: 0, y: 0 },
            agentHealth: primaryAgent?.customData?.health ?? 100,
            friendlyUnits: worldState.agents
                .filter((a) => a.customData?.owner === 'friendly')
                .map((a) => ({
                id: String(a.agentId),
                name: a.customData?.name ?? String(a.agentId),
                type: a.customData?.type ?? 'unit',
                position: a.customData?.position ?? { x: 0, y: 0 },
                health: a.customData?.health ?? 100,
            })),
            enemyUnits: worldState.agents
                .filter((a) => a.customData?.owner === 'enemy')
                .map((a) => ({
                id: String(a.agentId),
                type: a.customData?.type ?? 'unit',
                position: a.customData?.position ?? { x: 0, y: 0 },
                health: a.customData?.health ?? 100,
                threat: a.customData?.threat ?? 0,
            })),
            resources: worldState.customData?.resources ?? [],
            structures: worldState.agents
                .filter((a) => a.customData?.type === 'building')
                .map((a) => ({
                id: String(a.agentId),
                type: a.customData?.subType ?? 'structure',
                position: a.customData?.position ?? { x: 0, y: 0 },
                health: a.customData?.health ?? 100,
                owner: a.customData?.owner ?? 'friendly',
            })),
            visibility: {
                explored: worldState.customData?.visibility?.explored ?? 0,
                visible: worldState.customData?.visibility?.visible ?? 0,
                totalMap: (worldState.map?.width ?? 256) * (worldState.map?.height ?? 256),
                visibleEnemyCount: worldState.agents.filter((a) => a.customData?.owner === 'enemy').length,
                visibleResourceCount: worldState.customData?.resources?.length ?? 0,
            },
        };
    }
    /**
     * Returns default goal options for the current state.
     * Framework-provided, no provider-specific logic.
     */
    static getDefaultGoals() {
        return [
            {
                id: 'goal-attack',
                intent: 'Destroy enemy units and structures',
                priority: 'high',
                feasibility: 0.8,
                expectedDuration: 60000,
                estimatedValue: 100,
            },
            {
                id: 'goal-defend',
                intent: 'Protect friendly units and structures',
                priority: 'high',
                feasibility: 0.9,
                expectedDuration: 30000,
                estimatedValue: 80,
            },
            {
                id: 'goal-gather',
                intent: 'Collect resources from the map',
                priority: 'medium',
                feasibility: 0.7,
                expectedDuration: 45000,
                estimatedValue: 60,
            },
        ];
    }
    /**
     * Returns default command options for the current state.
     * Framework-provided, no provider-specific logic.
     */
    static getDefaultCommands() {
        return [
            {
                id: 'cmd-move',
                action: 'move',
                expectedDuration: 5000,
                expectedCost: 0,
                description: 'Move units to target location',
            },
            {
                id: 'cmd-attack',
                action: 'attack',
                expectedDuration: 8000,
                expectedCost: 0,
                description: 'Attack enemy units',
            },
            {
                id: 'cmd-gather',
                action: 'gather',
                expectedDuration: 10000,
                expectedCost: 0,
                description: 'Gather resources',
            },
        ];
    }
    /**
     * Returns execution memory for context.
     * Minimal initial state, expanded in future stories.
     */
    static getExecutionMemory() {
        return {
            recentEvents: [],
            recentDecisions: [],
            metrics: {
                commandsExecuted: 0,
                commandsFailed: 0,
                goalsCompleted: 0,
                goalsAbandoned: 0,
            },
        };
    }
    /**
     * Converts Brain decision to framework Commands.
     * Maintains type safety and immutability of framework Command objects.
     */
    static brainDecisionToCommands(decision, agentId, tick) {
        const maxPriority = Math.min(100, Math.max(0, Math.floor(decision.confidence * 100)));
        return decision.commands.map((cmdStr, index) => createCommand(createActionId(`brain-cmd-${tick}-${index}`), agentId, cmdStr.split(':')[0] || 'move', {
            description: cmdStr,
            reasoning: decision.reasoning,
            confidence: decision.confidence,
        }, createTick(tick), maxPriority));
    }
}
//# sourceMappingURL=brain-adapter.js.map