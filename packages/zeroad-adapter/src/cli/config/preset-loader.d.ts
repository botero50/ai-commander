/**
 * Preset Loader
 *
 * Load and validate configuration presets.
 */
/**
 * Preset configuration
 */
export interface Preset {
    readonly name: string;
    readonly description: string;
    readonly brains: readonly string[];
    readonly matchFormat?: 'round_robin' | 'single_elimination';
    readonly maxTicks?: number;
    readonly parallel?: number;
}
/**
 * Preset loader
 */
export declare class PresetLoader {
    /**
     * List all available presets
     */
    static listPresets(): Array<{
        readonly name: string;
        readonly description: string;
    }>;
    /**
     * Load a preset by name
     */
    static loadPreset(name: string): Preset | null;
    /**
     * Get all preset names
     */
    static getPresetNames(): string[];
    /**
     * Create preset from options
     */
    static createPreset(name: string, options: Partial<Preset>): Preset;
    /**
     * Validate preset
     */
    static validatePreset(preset: Preset): {
        readonly valid: boolean;
        readonly error?: string;
    };
}
//# sourceMappingURL=preset-loader.d.ts.map