/**
 * Advanced strategic intelligence for autonomous RTS gameplay
 */
import type { FakeWorldSnapshot } from './fake-world-state.js';
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export interface ThreatAssessment {
    readonly level: ThreatLevel;
    readonly enemyCount: number;
    readonly totalEnemyDamage: number;
    readonly closestEnemyDistance: number;
    readonly estimatedCombatDuration: number;
    readonly playerAdvantage: number;
    readonly recommendations: ReadonlyArray<string>;
}
export interface ResourcePriority {
    readonly phase: 'early-economy' | 'balanced-growth' | 'military-buildup' | 'defense' | 'expansion';
    readonly workerTarget: number;
    readonly militaryTarget: number;
    readonly priorityList: ReadonlyArray<ResourceAllocation>;
}
export interface ResourceAllocation {
    readonly type: 'worker' | 'military-infantry' | 'military-ranged' | 'military-tank';
    readonly priority: number;
    readonly cost: number;
    readonly rationale: string;
}
export interface UnitPosition {
    readonly unitId: string;
    readonly currentX: number;
    readonly currentY: number;
    readonly targetX: number;
    readonly targetY: number;
    readonly role: 'gathering' | 'defending' | 'attacking' | 'scouting';
    readonly health?: number;
}
export interface PositioningStrategy {
    readonly baseDefensePositions: ReadonlyArray<UnitPosition>;
    readonly scoutPatrol: ReadonlyArray<UnitPosition>;
    readonly attackFormation: ReadonlyArray<UnitPosition>;
    readonly gatheringPattern: ReadonlyArray<UnitPosition>;
}
export interface BehaviorPattern {
    readonly type: 'aggressive' | 'defensive' | 'economic' | 'mixed';
    readonly confidence: number;
    readonly indicators: ReadonlyArray<string>;
    readonly predictedNextMove: string;
}
export interface StrategicDecision {
    readonly timestamp: number;
    readonly decision: string;
    readonly reasoning: string;
    readonly expectedOutcome: string;
    readonly riskLevel: 'low' | 'medium' | 'high';
    readonly alternatives: ReadonlyArray<string>;
}
/**
 * Strategic intelligence engine
 */
export declare class StrategicIntelligence {
    private threatHistory;
    private decisionHistory;
    private behaviorPatterns;
    assessThreat(world: FakeWorldSnapshot): ThreatAssessment;
    determinePriority(world: FakeWorldSnapshot): ResourcePriority;
    planPositioning(world: FakeWorldSnapshot): PositioningStrategy;
    analyzeBehaviorPattern(world: FakeWorldSnapshot, previousWorlds?: FakeWorldSnapshot[]): BehaviorPattern;
    private analyzeMovement;
    recordDecision(decision: Omit<StrategicDecision, 'timestamp'>): StrategicDecision;
    getDecisionHistory(): ReadonlyArray<StrategicDecision>;
    getThreatHistory(): ReadonlyArray<ThreatAssessment>;
    generateStrategicReport(world: FakeWorldSnapshot): string;
    reset(): void;
}
/**
 * Global strategic intelligence instance
 */
export declare const globalStrategicIntelligence: StrategicIntelligence;
//# sourceMappingURL=strategic-intelligence.d.ts.map