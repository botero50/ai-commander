/**
 * Trash Talk Generator
 *
 * Generates contextual, natural-sounding taunts and responses between players.
 * Uses LLM to create dynamic, varied banter covering multiple game aspects.
 * Players can taunt each other AND respond to taunts.
 */
import { Logger } from '../config/logger.js';
export interface GameContext {
    player1: {
        name: string;
        unitCount: number;
        buildingCount: number;
        phase: string;
    };
    player2: {
        name: string;
        unitCount: number;
        buildingCount: number;
        phase: string;
    };
    recentEvent?: string;
    tick: number;
}
export interface TrashTalk {
    speaker: string;
    message: string;
    tick: number;
    isResponse?: boolean;
    respondingTo?: string;
}
export declare class TrashTalkGenerator {
    private logger;
    private ollama_url;
    private model;
    private lastTalkTick;
    private talkFrequency;
    private useOllama;
    private chatCallback?;
    private lastMessage;
    private readonly DEFAULT_TAUNTS;
    private readonly DEFAULT_RESPONSES;
    constructor(logger: Logger, ollamaUrl?: string, model?: string, chatCallback?: (message: string) => Promise<void>);
    /**
     * Generate trash talk or response based on game context
     * Can either taunt or respond to opponent's previous taunt
     */
    generateTrashTalk(context: GameContext): Promise<TrashTalk | null>;
    /**
     * Build prompt for a new taunt
     * Covers multiple game aspects: units, buildings, tech phase
     */
    private buildTauntPrompt;
    /**
     * Build prompt for responding to opponent's taunt
     */
    private buildResponsePrompt;
    /**
     * Analyze game state to provide context for trash talk
     */
    private analyzeGameState;
    /**
     * Set trash talk frequency (in ticks)
     */
    setTalkFrequency(ticks: number): void;
}
//# sourceMappingURL=trash-talk-generator.d.ts.map