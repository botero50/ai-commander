/**
 * Configuration System — Load, validate, merge YAML/JSON configs
 *
 * Supports:
 * 1. Environment variable substitution
 * 2. Config inheritance (extends)
 * 3. Validation against schemas
 * 4. Multiple file formats
 */
import type { BrainManagerConfig } from '@ai-commander/brain';
export interface TournamentConfig {
    readonly format: 'round-robin' | 'swiss' | 'best-of-n' | 'elimination';
    readonly brains: ReadonlyArray<BrainManagerConfig>;
    readonly mapSeeds: ReadonlyArray<number>;
    readonly maxTicksPerMatch: number;
    readonly gameAdapterId: string;
    readonly gamesPerPairing?: number;
    readonly rounds?: number;
}
export interface ExperimentConfig {
    readonly name: string;
    readonly variants: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly brainConfig: BrainManagerConfig;
        readonly prompt?: string;
        readonly metadata?: Record<string, unknown>;
    }>;
    readonly tournamentsPerVariant: number;
    readonly mapsPerTournament: number;
}
export interface AICommanderConfig {
    readonly version: string;
    readonly tournaments?: Record<string, TournamentConfig>;
    readonly experiments?: Record<string, ExperimentConfig>;
    readonly defaults?: {
        readonly gameAdapterId?: string;
        readonly maxTicksPerMatch?: number;
        readonly reportFormat?: 'markdown' | 'html' | 'json' | 'csv';
    };
}
/**
 * ConfigLoader: Load and merge configurations
 */
export declare class ConfigLoader {
    static load(filePath: string): AICommanderConfig;
    static parse(content: string, ext: string): any;
    static parseYAML(content: string): any;
    static parseValue(value: string): any;
    static substituteEnv(config: any): any;
    static merge(parent: any, child: any): any;
    static validate(config: AICommanderConfig): {
        valid: boolean;
        errors: string[];
    };
    static mergeWithDefaults(config: AICommanderConfig): AICommanderConfig;
}
//# sourceMappingURL=config-loader.d.ts.map