/**
 * Story 49.1 — Prompt Registry
 *
 * Treat prompts as first-class assets.
 * Maintain a registry of:
 * - System prompts (for AI initialization)
 * - Decision prompts (for move selection)
 * - Strategy prompts (for objective setting)
 * - Custom prompts (user-defined)
 */

import { Logger } from '../config/logger.js';
import * as crypto from 'crypto';

export type PromptCategory =
  | 'system'
  | 'decision'
  | 'strategy'
  | 'analysis'
  | 'custom';

export interface PromptVersion {
  version: string; // semantic versioning: 1.0.0
  hash: string; // SHA256 for change tracking
  createdAt: string;
  description?: string;
}

export interface Prompt {
  id: string;
  name: string;
  category: PromptCategory;
  content: string;
  currentVersion: string;
  versions: PromptVersion[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  lastUsedAt?: string;
}

export class PromptRegistry {
  private prompts: Map<string, Prompt> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeDefaultPrompts();
  }

  /**
   * Initialize built-in default prompts
   */
  private initializeDefaultPrompts(): void {
    // System prompt for RTS AI
    this.createPrompt({
      id: 'system-rts-default',
      name: 'RTS AI System Prompt',
      category: 'system',
      content: `You are an AI controlling a civilization in a real-time strategy game (0 A.D.).
Your role is to make strategic decisions about:
- Economic management (gathering resources, trading)
- Military operations (training units, attacking enemies)
- Infrastructure development (building structures, expanding territory)
- Technology research (advancing civilization)

You must balance short-term survival with long-term strategic goals.
Always consider the current game state and make decisions that maximize your civilization's strength.`,
      tags: ['default', 'rts', 'system'],
      metadata: { modelVersion: '1.0', gameVersion: '0.26.13' },
    });

    // Decision prompt for unit commands
    this.createPrompt({
      id: 'decision-aggressive',
      name: 'Aggressive Decision Prompt',
      category: 'decision',
      content: `Analyze the current game state and decide on the next action for your civilization.
Your objective is aggressive expansion and military dominance.

Current priorities:
1. Build a strong military force
2. Expand territory aggressively
3. Destroy enemy units when possible
4. Maintain minimal economic production

Provide your decision as a JSON object with:
- action: specific unit command or building order
- reasoning: why this action is optimal
- expectedOutcome: what result you expect`,
      tags: ['aggressive', 'military-focused'],
      metadata: { playStyle: 'aggressive', riskLevel: 'high' },
    });

    // Decision prompt for economic strategy
    this.createPrompt({
      id: 'decision-economic',
      name: 'Economic Decision Prompt',
      category: 'decision',
      content: `Analyze the current game state and decide on the next action for your civilization.
Your objective is economic dominance through superior resources and technology.

Current priorities:
1. Maximize resource gathering
2. Build production infrastructure
3. Research advanced technologies
4. Build minimal military for defense only

Provide your decision as a JSON object with:
- action: specific unit command or building order
- reasoning: why this action is optimal
- expectedOutcome: what result you expect`,
      tags: ['economic', 'resource-focused'],
      metadata: { playStyle: 'economic', riskLevel: 'low' },
    });

    this.logger.info('Default prompts initialized', { count: 3 });
  }

  /**
   * Create a new prompt
   */
  createPrompt(options: {
    id: string;
    name: string;
    category: PromptCategory;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Prompt {
    const hash = this.calculateHash(options.content);

    const prompt: Prompt = {
      id: options.id,
      name: options.name,
      category: options.category,
      content: options.content,
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          hash,
          createdAt: new Date().toISOString(),
          description: 'Initial version',
        },
      ],
      tags: options.tags || [],
      metadata: options.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.prompts.set(options.id, prompt);

    this.logger.info('Prompt created', {
      id: options.id,
      name: options.name,
      category: options.category,
    });

    return prompt;
  }

  /**
   * Get a prompt by ID
   */
  getPrompt(id: string): Prompt | null {
    return this.prompts.get(id) || null;
  }

  /**
   * List all prompts
   */
  listPrompts(filter?: {
    category?: PromptCategory;
    tag?: string;
  }): Prompt[] {
    let prompts = Array.from(this.prompts.values());

    if (filter?.category) {
      prompts = prompts.filter(p => p.category === filter.category);
    }

    if (filter?.tag) {
      prompts = prompts.filter(p => p.tags.includes(filter.tag!));
    }

    return prompts.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update prompt content (creates new version)
   */
  updatePrompt(id: string, newContent: string, description?: string): boolean {
    const prompt = this.prompts.get(id);
    if (!prompt) return false;

    const hash = this.calculateHash(newContent);

    // Check if content actually changed
    if (hash === prompt.versions[prompt.versions.length - 1].hash) {
      this.logger.warn('Prompt content unchanged', { id });
      return false;
    }

    // Create new version
    const newVersion = this.incrementVersion(prompt.currentVersion);
    prompt.versions.push({
      version: newVersion,
      hash,
      createdAt: new Date().toISOString(),
      description,
    });

    prompt.content = newContent;
    prompt.currentVersion = newVersion;
    prompt.updatedAt = new Date().toISOString();

    this.logger.info('Prompt updated', { id, newVersion });
    return true;
  }

  /**
   * Record prompt usage
   */
  recordUsage(id: string): boolean {
    const prompt = this.prompts.get(id);
    if (!prompt) return false;

    prompt.usageCount = (prompt.usageCount || 0) + 1;
    prompt.lastUsedAt = new Date().toISOString();

    return true;
  }

  /**
   * Get prompt by category
   */
  getPromptsByCategory(category: PromptCategory): Prompt[] {
    return this.listPrompts({ category });
  }

  /**
   * Get prompt by tag
   */
  getPromptsByTag(tag: string): Prompt[] {
    return this.listPrompts({ tag });
  }

  /**
   * Delete a prompt
   */
  deletePrompt(id: string): boolean {
    if (this.prompts.delete(id)) {
      this.logger.info('Prompt deleted', { id });
      return true;
    }
    return false;
  }

  /**
   * Get prompt history (all versions)
   */
  getPromptHistory(id: string): PromptVersion[] | null {
    const prompt = this.prompts.get(id);
    if (!prompt) return null;

    return prompt.versions;
  }

  /**
   * Get specific version of a prompt
   */
  getPromptVersion(id: string, version: string): Prompt | null {
    const prompt = this.prompts.get(id);
    if (!prompt) return null;

    const versionInfo = prompt.versions.find(v => v.version === version);
    if (!versionInfo) return null;

    // Return a copy with the specific version
    return {
      ...prompt,
      currentVersion: version,
      // Note: actual content for specific version would need to be stored separately
      // For now, we return current content
    };
  }

  /**
   * Get usage statistics
   */
  getStatistics(): {
    totalPrompts: number;
    byCategory: Record<PromptCategory, number>;
    mostUsed: Array<{ id: string; name: string; usageCount: number }>;
    totalVersions: number;
  } {
    const prompts = Array.from(this.prompts.values());

    const byCategory: Record<PromptCategory, number> = {
      system: 0,
      decision: 0,
      strategy: 0,
      analysis: 0,
      custom: 0,
    };

    let totalVersions = 0;

    for (const prompt of prompts) {
      byCategory[prompt.category]++;
      totalVersions += prompt.versions.length;
    }

    const mostUsed = prompts
      .filter(p => p.usageCount && p.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        usageCount: p.usageCount || 0,
      }));

    return {
      totalPrompts: prompts.length,
      byCategory,
      mostUsed,
      totalVersions,
    };
  }

  /**
   * Export registry as JSON
   */
  exportRegistry(): string {
    const prompts = Array.from(this.prompts.values());
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import registry from JSON
   */
  importRegistry(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.version !== '1.0' || !Array.isArray(data.prompts)) {
        this.logger.error('Invalid registry format');
        return false;
      }

      for (const prompt of data.prompts) {
        this.prompts.set(prompt.id, prompt);
      }

      this.logger.info('Registry imported', { count: data.prompts.length });
      return true;
    } catch (error) {
      this.logger.error('Failed to import registry', { error });
      return false;
    }
  }

  /**
   * Compare two prompts
   */
  comparePrompts(id1: string, id2: string): {
    prompt1: Prompt | null;
    prompt2: Prompt | null;
    same: boolean;
    differences: string[];
  } {
    const p1 = this.prompts.get(id1);
    const p2 = this.prompts.get(id2);

    const differences: string[] = [];

    if (p1 && p2) {
      if (p1.content !== p2.content) {
        differences.push('Content differs');
      }
      if (p1.category !== p2.category) {
        differences.push(`Category: ${p1.category} vs ${p2.category}`);
      }
      if (JSON.stringify(p1.tags.sort()) !== JSON.stringify(p2.tags.sort())) {
        differences.push('Tags differ');
      }
    }

    return {
      prompt1: p1 || null,
      prompt2: p2 || null,
      same: differences.length === 0,
      differences,
    };
  }

  /**
   * Private: Calculate SHA256 hash of content
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Private: Increment semantic version
   */
  private incrementVersion(current: string): string {
    const parts = current.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
  }
}
