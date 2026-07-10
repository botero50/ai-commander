/**
 * Story 48.2 — Model Profiles
 *
 * Store model configurations as reusable profiles.
 * Each profile specifies:
 * - Temperature and sampling parameters
 * - Context window and max tokens
 * - System prompt
 * - Custom metadata
 */

import { Logger } from '../config/logger.js';

export interface ModelConfig {
  temperature: number; // 0.0 - 2.0
  topP?: number; // 0.0 - 1.0
  topK?: number; // 1+
  maxTokens?: number;
  frequencyPenalty?: number; // -2.0 to 2.0
  presencePenalty?: number; // -2.0 to 2.0
  stopSequences?: string[];
}

export interface SystemPromptConfig {
  prompt: string;
  instructions?: string;
  context?: string;
  constraints?: string[];
}

export interface ModelProfile {
  id: string;
  name: string;
  description?: string;
  modelId: string; // Reference to registered model
  config: ModelConfig;
  systemPrompt?: SystemPromptConfig;
  metadata: Record<string, any>;
  tags: string[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<ModelConfig>;
  systemPrompt?: Partial<SystemPromptConfig>;
  bestFor: string;
}

export class ModelProfileManager {
  private profiles: Map<string, ModelProfile> = new Map();
  private templates: Map<string, ProfileTemplate> = new Map();
  private defaultProfile?: string;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeTemplates();
  }

  /**
   * Initialize built-in profile templates
   */
  private initializeTemplates(): void {
    const templates: ProfileTemplate[] = [
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Good balance of creativity and consistency',
        config: { temperature: 0.7, topP: 0.9 },
        bestFor: 'General purpose, strategy, decision-making',
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Higher temperature for more diverse outputs',
        config: { temperature: 1.2, topP: 0.95, topK: 40 },
        bestFor: 'Exploration, diverse strategies, experimentation',
      },
      {
        id: 'focused',
        name: 'Focused',
        description: 'Lower temperature for consistent outputs',
        config: { temperature: 0.3, topP: 0.5 },
        bestFor: 'Deterministic behavior, consistent strategy',
      },
      {
        id: 'precise',
        name: 'Precise',
        description: 'Very low temperature for maximum determinism',
        config: { temperature: 0.1, topP: 0.1 },
        bestFor: 'Exact behavior, debugging, testing',
      },
      {
        id: 'exploratory',
        name: 'Exploratory',
        description: 'High temperature and top-k for broad exploration',
        config: { temperature: 1.5, topP: 1.0, topK: 100 },
        bestFor: 'New strategies, novel approaches',
      },
      {
        id: 'aggressive',
        name: 'Aggressive',
        description: 'Biased toward high-reward actions',
        config: {
          temperature: 0.8,
          topP: 0.85,
          frequencyPenalty: 0.5,
          presencePenalty: 0.1,
        },
        systemPrompt: {
          constraints: [
            'Prioritize military expansion',
            'Take calculated risks',
            'Pursue aggressive strategies',
          ],
        },
        bestFor: 'Offensive gameplay, rushing opponent',
      },
      {
        id: 'defensive',
        name: 'Defensive',
        description: 'Conservative strategy with risk aversion',
        config: {
          temperature: 0.5,
          topP: 0.7,
          presencePenalty: 0.2,
        },
        systemPrompt: {
          constraints: [
            'Prioritize defense',
            'Build economic strength',
            'Avoid risky moves',
          ],
        },
        bestFor: 'Economic gameplay, defensive positioning',
      },
      {
        id: 'economic',
        name: 'Economic',
        description: 'Focus on resource gathering and production',
        config: { temperature: 0.6, topP: 0.8 },
        systemPrompt: {
          constraints: [
            'Maximize resource gathering',
            'Build production infrastructure',
            'Invest in technology',
          ],
        },
        bestFor: 'Long-term growth, technology advancement',
      },
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }

    this.logger.info('Profile templates initialized', { count: templates.length });
  }

  /**
   * Create a profile from a template
   */
  createFromTemplate(
    profileId: string,
    templateId: string,
    modelId: string,
    overrides?: Partial<ModelProfile>
  ): ModelProfile | null {
    const template = this.templates.get(templateId);
    if (!template) {
      this.logger.warn('Template not found', { templateId });
      return null;
    }

    const baseConfig: ModelConfig = {
      temperature: template.config.temperature ?? 0.7,
      topP: template.config.topP,
      topK: template.config.topK,
      maxTokens: overrides?.config?.maxTokens,
      frequencyPenalty: template.config.frequencyPenalty,
      presencePenalty: template.config.presencePenalty,
      stopSequences: template.config.stopSequences,
    };

    const profile: ModelProfile = {
      id: profileId,
      name: overrides?.name || `${template.name} - ${modelId}`,
      description: overrides?.description || template.description,
      modelId,
      config: overrides?.config ? { ...baseConfig, ...overrides.config } : baseConfig,
      systemPrompt: template.systemPrompt
        ? {
            prompt: overrides?.systemPrompt?.prompt || '',
            instructions: template.systemPrompt.instructions,
            context: template.systemPrompt.context,
            constraints: template.systemPrompt.constraints,
          }
        : undefined,
      metadata: overrides?.metadata || {},
      tags: [templateId, ...((overrides?.tags) || [])],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profileId, profile);
    this.logger.info('Profile created from template', { profileId, templateId, modelId });

    return profile;
  }

  /**
   * Create a custom profile
   */
  createCustomProfile(
    profileId: string,
    modelId: string,
    config: ModelConfig,
    options: {
      name?: string;
      description?: string;
      systemPrompt?: SystemPromptConfig;
      metadata?: Record<string, any>;
      tags?: string[];
    } = {}
  ): ModelProfile {
    const profile: ModelProfile = {
      id: profileId,
      name: options.name || `Custom - ${modelId}`,
      description: options.description,
      modelId,
      config,
      systemPrompt: options.systemPrompt,
      metadata: options.metadata || {},
      tags: options.tags || ['custom'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profileId, profile);
    this.logger.info('Custom profile created', { profileId, modelId });

    return profile;
  }

  /**
   * Get a profile by ID
   */
  getProfile(profileId: string): ModelProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * List all profiles
   */
  listProfiles(filter?: {
    modelId?: string;
    tag?: string;
    template?: string;
  }): ModelProfile[] {
    let profiles = Array.from(this.profiles.values());

    if (filter?.modelId) {
      profiles = profiles.filter(p => p.modelId === filter.modelId);
    }

    if (filter?.tag) {
      profiles = profiles.filter(p => p.tags.includes(filter.tag!));
    }

    if (filter?.template) {
      profiles = profiles.filter(p => p.tags.includes(filter.template!));
    }

    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update a profile
   */
  updateProfile(profileId: string, updates: Partial<ModelProfile>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    if (updates.name) profile.name = updates.name;
    if (updates.description) profile.description = updates.description;
    if (updates.config) {
      profile.config = { ...profile.config, ...updates.config };
    }
    if (updates.systemPrompt) {
      profile.systemPrompt = { ...profile.systemPrompt, ...updates.systemPrompt };
    }
    if (updates.metadata) {
      profile.metadata = { ...profile.metadata, ...updates.metadata };
    }
    if (updates.tags) {
      profile.tags = updates.tags;
    }

    profile.updatedAt = new Date().toISOString();

    this.logger.info('Profile updated', { profileId });
    return true;
  }

  /**
   * Delete a profile
   */
  deleteProfile(profileId: string): boolean {
    if (this.defaultProfile === profileId) {
      this.defaultProfile = undefined;
    }

    if (this.profiles.delete(profileId)) {
      this.logger.info('Profile deleted', { profileId });
      return true;
    }

    return false;
  }

  /**
   * Clone a profile with modifications
   */
  cloneProfile(
    sourceProfileId: string,
    newProfileId: string,
    updates?: Partial<ModelProfile>
  ): ModelProfile | null {
    const source = this.profiles.get(sourceProfileId);
    if (!source) return null;

    const cloned: ModelProfile = {
      ...source,
      id: newProfileId,
      name: updates?.name || `${source.name} (clone)`,
      metadata: { ...source.metadata, ...updates?.metadata },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (updates?.config) {
      cloned.config = { ...source.config, ...updates.config };
    }

    if (updates?.systemPrompt) {
      cloned.systemPrompt = source.systemPrompt
        ? { ...source.systemPrompt, ...updates.systemPrompt }
        : updates.systemPrompt;
    }

    this.profiles.set(newProfileId, cloned);
    this.logger.info('Profile cloned', { sourceProfileId, newProfileId });

    return cloned;
  }

  /**
   * Set default profile
   */
  setDefault(profileId: string): boolean {
    if (!this.profiles.has(profileId)) return false;

    this.defaultProfile = profileId;
    this.logger.info('Default profile set', { profileId });

    return true;
  }

  /**
   * Get default profile
   */
  getDefault(): ModelProfile | null {
    if (!this.defaultProfile) return null;
    return this.profiles.get(this.defaultProfile) || null;
  }

  /**
   * List all templates
   */
  listTemplates(): ProfileTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): ProfileTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get profiles by model
   */
  getProfilesByModel(modelId: string): ModelProfile[] {
    return this.listProfiles({ modelId });
  }

  /**
   * Get profiles with a specific tag
   */
  getProfilesByTag(tag: string): ModelProfile[] {
    return this.listProfiles({ tag });
  }

  /**
   * Export all profiles as JSON
   */
  exportProfiles(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      defaultProfile: this.defaultProfile,
      profiles: Array.from(this.profiles.values()),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import profiles from JSON
   */
  importProfiles(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.version !== '1.0' || !Array.isArray(data.profiles)) {
        this.logger.error('Invalid profiles format');
        return false;
      }

      for (const profile of data.profiles) {
        this.profiles.set(profile.id, profile);
      }

      if (data.defaultProfile) {
        this.defaultProfile = data.defaultProfile;
      }

      this.logger.info('Profiles imported', { count: data.profiles.length });
      return true;
    } catch (error) {
      this.logger.error('Failed to import profiles', { error });
      return false;
    }
  }

  /**
   * Get profile statistics
   */
  getStatistics(): {
    totalProfiles: number;
    byModel: Record<string, number>;
    byTemplate: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const stats = {
      totalProfiles: this.profiles.size,
      byModel: {} as Record<string, number>,
      byTemplate: {} as Record<string, number>,
      byTag: {} as Record<string, number>,
    };

    for (const profile of this.profiles.values()) {
      stats.byModel[profile.modelId] = (stats.byModel[profile.modelId] || 0) + 1;

      for (const tag of profile.tags) {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;

        if (this.templates.has(tag)) {
          stats.byTemplate[tag] = (stats.byTemplate[tag] || 0) + 1;
        }
      }
    }

    return stats;
  }

  /**
   * Validate a profile configuration
   */
  validateProfile(profile: ModelProfile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.id) errors.push('Profile ID is required');
    if (!profile.modelId) errors.push('Model ID is required');
    if (!profile.config.temperature || profile.config.temperature < 0 || profile.config.temperature > 2.0) {
      errors.push('Temperature must be between 0.0 and 2.0');
    }
    if (profile.config.topP !== undefined && (profile.config.topP < 0 || profile.config.topP > 1.0)) {
      errors.push('Top-P must be between 0.0 and 1.0');
    }
    if (profile.config.topK !== undefined && profile.config.topK < 1) {
      errors.push('Top-K must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compare two profiles
   */
  compareProfiles(
    profileId1: string,
    profileId2: string
  ): { same: boolean; differences: Array<{ field: string; profile1: any; profile2: any }> } | null {
    const p1 = this.profiles.get(profileId1);
    const p2 = this.profiles.get(profileId2);

    if (!p1 || !p2) return null;

    const differences: Array<{ field: string; profile1: any; profile2: any }> = [];

    if (p1.config.temperature !== p2.config.temperature) {
      differences.push({
        field: 'temperature',
        profile1: p1.config.temperature,
        profile2: p2.config.temperature,
      });
    }

    if (p1.config.topP !== p2.config.topP) {
      differences.push({
        field: 'topP',
        profile1: p1.config.topP,
        profile2: p2.config.topP,
      });
    }

    if (JSON.stringify(p1.systemPrompt) !== JSON.stringify(p2.systemPrompt)) {
      differences.push({
        field: 'systemPrompt',
        profile1: p1.systemPrompt,
        profile2: p2.systemPrompt,
      });
    }

    return {
      same: differences.length === 0,
      differences,
    };
  }
}
