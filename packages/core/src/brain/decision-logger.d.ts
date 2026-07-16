/**
 * Decision Logger
 *
 * Captures comprehensive metrics for every Ollama decision:
 * - Input state (tick, unit count, resources)
 * - Prompt sent to Ollama
 * - Raw response from Ollama
 * - Parsed commands (type, targets, locations)
 * - Execution result (success/failure, game response)
 * - Timing metrics (latency, decision rate)
 *
 * Story R2.7.2: Decision Quality Analysis
 */
import { Logger } from '../config/logger.js';
import type { WorldState } from '@ai-commander/domain';
import type { GameCommand } from './http-client.js';
export interface DecisionRecord {
    decisionNumber: number;
    timestamp: Date;
    gameState: {
        tick: number;
        playerUnits: number;
        enemyUnits: number;
        playerResources: Record<string, number>;
    };
    prompt: string;
    ollamaResponse: string;
    ollamaLatency: number;
    commandsParsed: Array<{
        type: string;
        entities: number[];
        targetX?: number;
        targetZ?: number;
        target?: number;
    }>;
    commandsExecuted: number;
    executionSuccess: boolean;
    executionError?: string;
    isHallucination: boolean;
    isRepetitive: boolean;
    isIdle: boolean;
    notes: string[];
}
export declare class DecisionLogger {
    private logger;
    private decisions;
    private lastCommands;
    private decisionCounter;
    constructor(logger: Logger);
    /**
     * Log a complete decision cycle
     */
    logDecision(worldState: WorldState, prompt: string, ollamaResponse: string, ollamaLatency: number, commands: GameCommand[], executionSuccess: boolean, executionError?: string): DecisionRecord;
    /**
     * Get decision quality metrics
     */
    getMetrics(): {
        totalDecisions: number;
        hallucinationRate: number;
        repetitiveRate: number;
        idleRate: number;
        avgLatency: number;
        avgCommands: number;
        successRate: number;
        hallucinationCount: number;
        repetitiveCount: number;
        idleCount: number;
    };
    /**
     * Generate report
     */
    generateReport(): string;
    /**
     * Export decisions to JSON
     */
    exportToJSON(): string;
    /**
     * Get all decisions
     */
    getAllDecisions(): DecisionRecord[];
    /**
     * Get problematic decisions
     */
    getProblematicDecisions(): DecisionRecord[];
}
//# sourceMappingURL=decision-logger.d.ts.map