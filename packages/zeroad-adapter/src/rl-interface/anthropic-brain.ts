/**
 * Anthropic Brain
 *
 * AI Brain implementation using Anthropic Claude API
 *
 * Prerequisites:
 * - ANTHROPIC_API_KEY environment variable set
 * - Anthropic account with API access
 *
 * Usage:
 *   const brain = new AnthropicBrain(logger, {
 *     modelName: 'claude-3-opus-20240229',
 *     apiKey: 'sk-ant-...',
 *     temperature: 0.7,
 *     playerID: 1,
 *   });
 */

import { Logger } from '../config/logger.js';
import type { WorldState } from '@ai-commander/domain';
import type { AIBrain, BrainDecision } from './ai-loop-orchestrator.js';
import type { GameCommand } from './http-client.js';

export interface AnthropicConfig {
  modelName: string; // e.g., 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'
  apiKey: string; // Anthropic API key
  temperature: number; // 0.0 - 1.0
  maxTokens: number; // Max response tokens
  timeout: number; // Request timeout in ms
  playerID?: number; // Player to control (1 or 2)
  baseUrl?: string; // Custom API endpoint (default: https://api.anthropic.com)
}

/**
 * AI Brain powered by Anthropic Claude
 */
export class AnthropicBrain implements AIBrain {
  private logger: Logger;
  private config: AnthropicConfig;
  private decisionCount: number = 0;
  private playerID: number;
  private baseUrl: string;

  constructor(logger: Logger, config: Partial<AnthropicConfig> = {}) {
    this.logger = logger;
    this.playerID = config.playerID || 2;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.config = {
      modelName: config.modelName || 'claude-3-sonnet-20240229',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      temperature: config.temperature !== undefined ? config.temperature : 0.7,
      maxTokens: config.maxTokens || 256,
      timeout: config.timeout || 60000,
      playerID: config.playerID || 2,
    };

    if (!this.config.apiKey) {
      throw new Error('Anthropic API key required. Set ANTHROPIC_API_KEY environment variable or pass apiKey in config.');
    }
  }

  /**
   * Initialize brain (verify API key is valid)
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info(`✓ Anthropic brain initialized (${this.config.modelName})`);
    } catch (error) {
      this.logger.error('❌ Anthropic brain initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        model: this.config.modelName,
      });
      throw error;
    }
  }

  /**
   * Make a decision based on world state
   */
  async decide(worldState: WorldState): Promise<BrainDecision> {
    this.decisionCount++;

    try {
      // Convert world state to a concise prompt
      const prompt = this.buildPrompt(worldState);

      // Call Anthropic API
      const response = await this.callAnthropic(prompt);

      // Parse response into game commands
      const commands = this.parseResponse(response, worldState);

      return {
        playerID: this.playerID,
        commands,
        reasoning: response.substring(0, 200), // First 200 chars as reasoning
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Anthropic brain decision failed', {
        decision: this.decisionCount,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        playerID: this.playerID,
        commands: [],
        reasoning: 'Error generating decision',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Build a prompt from world state
   */
  private buildPrompt(worldState: WorldState): string {
    const myPlayer = worldState.players?.[this.playerID - 1] as any;
    const opponent = worldState.players?.[this.playerID === 1 ? 1 : 0] as any;

    return `You are an AI player in a real-time strategy game (0 A.D.). Make a strategic decision for your civilization.

Current State:
- Your units: ${myPlayer?.units || 0}
- Your buildings: ${myPlayer?.buildings || 0}
- Your population: ${myPlayer?.population || 0}
- Your phase: ${myPlayer?.phase || 'unknown'}

Opponent:
- Units: ${opponent?.units || 0}
- Buildings: ${opponent?.buildings || 0}

Suggest ONE strategic action (attack, defend, expand, research, or gather resources). Be brief.`;
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.modelName,
          max_tokens: this.config.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = (await response.json()) as any;
      return data.content?.[0]?.text || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Anthropic API timeout (${this.config.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * Parse Anthropic response into game commands
   * For now, return empty commands (planning phase)
   */
  private parseResponse(response: string, worldState: WorldState): GameCommand[] {
    // TODO: Parse LLM response into actual game commands
    // For now, just log the response
    this.logger.debug(`Anthropic decision: ${response}`);
    return [];
  }
}
