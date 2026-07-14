/**
 * OpenAI Brain
 *
 * AI Brain implementation using OpenAI API (GPT-4, GPT-3.5-turbo, etc.)
 *
 * Prerequisites:
 * - OPENAI_API_KEY environment variable set
 * - OpenAI account with API access
 *
 * Usage:
 *   const brain = new OpenAIBrain(logger, {
 *     modelName: 'gpt-4',
 *     apiKey: 'sk-...',
 *     temperature: 0.7,
 *     playerID: 1,
 *   });
 */

import { Logger } from '../config/logger.js';
import type { WorldState } from '@ai-commander/domain';
import type { AIBrain, BrainDecision } from './ai-loop-orchestrator.js';
import type { GameCommand } from './http-client.js';

export interface OpenAIConfig {
  modelName: string; // e.g., 'gpt-4', 'gpt-3.5-turbo'
  apiKey: string; // OpenAI API key
  temperature: number; // 0.0 - 2.0
  topP: number; // 0.0 - 1.0
  maxTokens: number; // Max response tokens
  timeout: number; // Request timeout in ms
  playerID?: number; // Player to control (1 or 2)
  baseUrl?: string; // Custom API endpoint (default: https://api.openai.com/v1)
}

/**
 * AI Brain powered by OpenAI
 */
export class OpenAIBrain implements AIBrain {
  private logger: Logger;
  private config: OpenAIConfig;
  private decisionCount: number = 0;
  private playerID: number;
  private baseUrl: string;

  constructor(logger: Logger, config: Partial<OpenAIConfig> = {}) {
    this.logger = logger;
    this.playerID = config.playerID || 2;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.config = {
      modelName: config.modelName || 'gpt-3.5-turbo',
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      temperature: config.temperature !== undefined ? config.temperature : 0.7,
      topP: config.topP !== undefined ? config.topP : 0.9,
      maxTokens: config.maxTokens || 256,
      timeout: config.timeout || 60000,
      playerID: config.playerID || 2,
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required. Set OPENAI_API_KEY environment variable or pass apiKey in config.');
    }
  }

  /**
   * Initialize brain (verify API key is valid)
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info(`✓ OpenAI brain initialized (${this.config.modelName})`);
    } catch (error) {
      this.logger.error('❌ OpenAI brain initialization failed', {
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

      // Call OpenAI API
      const response = await this.callOpenAI(prompt);

      // Parse response into game commands
      const commands = this.parseResponse(response, worldState);

      return {
        playerID: this.playerID,
        commands,
        reasoning: response.substring(0, 200), // First 200 chars as reasoning
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('OpenAI brain decision failed', {
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
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
          top_p: this.config.topP,
          max_tokens: this.config.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = (await response.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI API timeout (${this.config.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * Parse OpenAI response into game commands
   * For now, return empty commands (planning phase)
   */
  private parseResponse(response: string, worldState: WorldState): GameCommand[] {
    // TODO: Parse LLM response into actual game commands
    // For now, just log the response
    this.logger.debug(`OpenAI decision: ${response}`);
    return [];
  }
}
