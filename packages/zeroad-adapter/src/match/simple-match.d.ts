/**
 * Simple Match Runner
 *
 * Minimal integration of Brain, Framework, and Adapter
 * for STORY 11.3: Dual Ollama Match (Two independent brains)
 */
import { GameSession } from '@ai-commander/adapter';
import type { DecisionOverlay } from './decision-overlay.js';
import type { MatchObserver } from './match-observer.js';
/**
 * Generic Brain interface (avoid importing from @ai-commander/brain to stay within rootDir)
 */
export interface BrainInterface {
    readonly name: string;
    readonly version: string;
    decide(observation: any, availableGoals: readonly any[], availableCommands: readonly any[], memory: any): Promise<{
        reasoning?: string;
        commands?: string[];
    }>;
}
export interface SimpleMatchConfig {
    readonly brain: BrainInterface;
    readonly maxTicks?: number;
}
export interface DualBrainMatchConfig {
    readonly brain1: BrainInterface;
    readonly brain2: BrainInterface;
    readonly maxTicks?: number;
    readonly decisionOverlay?: DecisionOverlay;
    readonly observer?: MatchObserver;
}
/**
 * Match result captured at completion
 */
export interface MatchResult {
    readonly success: boolean;
    readonly winner?: string;
    readonly ticksRan: number;
    readonly duration: number;
    readonly player1: {
        readonly name: string;
        readonly commandsExecuted: number;
        readonly errors: number;
    };
    readonly player2?: {
        readonly name: string;
        readonly commandsExecuted: number;
        readonly errors: number;
    };
    readonly error?: unknown;
}
export declare function runSimpleMatch(session: GameSession, brain: BrainInterface, config?: Partial<SimpleMatchConfig>): Promise<{
    success: boolean;
    winner: string;
    ticksRan: number;
    duration: number;
    player1: {
        name: string;
        commandsExecuted: number;
        errors: number;
    };
    error?: undefined;
} | {
    success: boolean;
    ticksRan: number;
    duration: number;
    player1: {
        name: string;
        commandsExecuted: number;
        errors: number;
    };
    error: unknown;
    winner?: undefined;
}>;
/**
 * Run a match with two independent AI brains (Ollama vs Ollama)
 * Each brain has separate observation, memory, and decision context
 */
export declare function runDualBrainMatch(session: GameSession, brain1: BrainInterface, brain2: BrainInterface, config?: Partial<DualBrainMatchConfig>): Promise<{
    success: boolean;
    winner: string;
    ticksRan: number;
    duration: number;
    player1: {
        name: string;
        commandsExecuted: number;
        errors: number;
    };
    player2: {
        name: string;
        commandsExecuted: number;
        errors: number;
    };
    error?: undefined;
} | {
    success: boolean;
    ticksRan: number;
    duration: number;
    player1: {
        name: string;
        commandsExecuted: number;
        errors: number;
    };
    player2: {
        name: string;
        commandsExecuted: number;
        errors: number;
    };
    error: unknown;
    winner?: undefined;
}>;
//# sourceMappingURL=simple-match.d.ts.map