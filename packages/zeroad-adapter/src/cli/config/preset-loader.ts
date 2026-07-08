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
 * Built-in presets
 */
const BUILTIN_PRESETS: Record<string, Preset> = {
  'ollama-vs-ollama': {
    name: 'Ollama vs Ollama',
    description: 'Local Ollama models competing',
    brains: ['Ollama', 'Ollama'],
    matchFormat: 'round_robin',
    maxTicks: 5000,
  },
  'multi-llm': {
    name: 'Multi-LLM Arena',
    description: 'Ollama, Claude, and GPT competing',
    brains: ['Ollama', 'Claude', 'GPT'],
    matchFormat: 'round_robin',
    maxTicks: 5000,
    parallel: 1,
  },
  'builtin-vs-ollama': {
    name: 'Builtin vs Ollama',
    description: 'Builtin AI against Ollama',
    brains: ['Builtin', 'Ollama'],
    matchFormat: 'round_robin',
    maxTicks: 5000,
  },
  'quick-match': {
    name: 'Quick Match',
    description: 'Single fast match (1000 ticks)',
    brains: ['Ollama', 'Ollama'],
    maxTicks: 1000,
  },
  'long-match': {
    name: 'Long Match',
    description: 'Extended match (10000 ticks)',
    brains: ['Ollama', 'Ollama'],
    maxTicks: 10000,
  },
};

/**
 * Preset loader
 */
export class PresetLoader {
  /**
   * List all available presets
   */
  static listPresets(): Array<{ readonly name: string; readonly description: string }> {
    return Object.values(BUILTIN_PRESETS).map((p) => ({
      name: p.name,
      description: p.description,
    }));
  }

  /**
   * Load a preset by name
   */
  static loadPreset(name: string): Preset | null {
    return BUILTIN_PRESETS[name] || null;
  }

  /**
   * Get all preset names
   */
  static getPresetNames(): string[] {
    return Object.keys(BUILTIN_PRESETS);
  }

  /**
   * Create preset from options
   */
  static createPreset(
    name: string,
    options: Partial<Preset>
  ): Preset {
    return {
      name: options.name || name,
      description: options.description || '',
      brains: options.brains || ['Ollama', 'Ollama'],
      matchFormat: options.matchFormat,
      maxTicks: options.maxTicks,
      parallel: options.parallel,
    };
  }

  /**
   * Validate preset
   */
  static validatePreset(preset: Preset): { readonly valid: boolean; readonly error?: string } {
    if (!preset.brains || preset.brains.length < 2) {
      return { valid: false, error: 'Preset must specify at least 2 brains' };
    }

    if (preset.maxTicks && preset.maxTicks < 100) {
      return { valid: false, error: 'maxTicks must be at least 100' };
    }

    if (preset.parallel && preset.parallel < 1) {
      return { valid: false, error: 'parallel must be at least 1' };
    }

    return { valid: true };
  }
}
