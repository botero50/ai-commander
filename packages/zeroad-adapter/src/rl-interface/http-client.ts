/**
 * RL Interface HTTP Client
 *
 * Implements the official 0 A.D. RL Interface protocol exactly as defined
 * in source/rlinterface/RLInterface.cpp
 *
 * Protocol:
 * - POST /reset: scenario config as JSON body → game state as plain text
 * - POST /step: newline-delimited commands (playerId;jsonCommand) → game state as plain text
 * - POST /evaluate: JavaScript code → evaluation result as plain text
 * - GET /templates: fetch entity templates
 */

import { Logger } from '../config/logger.js';
import { RawGameState } from './types.js';

export interface ScenarioConfig {
  settings: {
    Map: string;
    PlayerData: Array<{ Civ: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GameCommand {
  playerID: number;
  json_cmd: unknown;
}

export class RLHTTPClient {
  private baseUrl: string;

  constructor(
    private host: string,
    private port: number,
    private timeout: number,
    private logger: Logger
  ) {
    this.baseUrl = `http://${host}:${port}`;
  }

  /**
   * Initialize game with scenario config (POST /reset)
   *
   * Official protocol: Scenario config sent as JSON in POST body
   */
  async reset(scenarioConfig: ScenarioConfig): Promise<RawGameState> {
    this.logger.info('Calling /reset endpoint', { url: `${this.baseUrl}/reset` });

    try {
      const body = JSON.stringify(scenarioConfig);
      const response = await fetch(`${this.baseUrl}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      this.logger.info('Game reset successful', { responseLength: responseText.length });

      // Parse game state from response (plain text, not JSON)
      return this.parseGameState(responseText);
    } catch (error) {
      this.logger.error('Failed to reset game', { error: String(error) });
      throw error;
    }
  }

  /**
   * Execute commands and advance game by one tick (POST /step)
   *
   * Official protocol: Commands as newline-delimited entries
   * Format: playerId;jsonCommand\nplayerId;jsonCommand\n...
   */
  async step(commands: GameCommand[]): Promise<RawGameState> {
    try {
      // Convert commands to official format: playerId;jsonCommand\n
      const body = commands
        .map(cmd => `${cmd.playerID};${JSON.stringify(cmd.json_cmd)}`)
        .join('\n') + (commands.length > 0 ? '\n' : '');

      this.logger.debug('Executing step', {
        commandCount: commands.length,
        bodyLength: body.length,
      });

      const response = await fetch(`${this.baseUrl}/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      return this.parseGameState(responseText);
    } catch (error) {
      this.logger.error('Failed to execute step', {
        error: String(error),
        commandCount: commands.length,
      });
      throw error;
    }
  }

  /**
   * Evaluate JavaScript code in game context (POST /evaluate)
   *
   * Official protocol: JavaScript code as plain text body
   */
  async evaluate(code: string): Promise<string> {
    try {
      this.logger.debug('Evaluating JavaScript', { codeLength: code.length });

      const response = await fetch(`${this.baseUrl}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: code,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.text();
    } catch (error) {
      this.logger.error('Failed to evaluate code', { error: String(error) });
      throw error;
    }
  }

  /**
   * Fetch entity templates (GET /templates)
   *
   * Official protocol: Template names as body, returns newline-delimited XML
   */
  async getTemplates(templateNames: string[]): Promise<Map<string, string>> {
    try {
      const body = templateNames.join('\n');

      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain',
        },
        body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      const templates = new Map<string, string>();

      // Parse response: newline-delimited templates
      const lines = responseText.split('\n').filter(line => line.trim());
      // TODO: properly parse XML templates from response

      return templates;
    } catch (error) {
      this.logger.error('Failed to fetch templates', { error: String(error) });
      throw error;
    }
  }

  /**
   * Check if RL Interface is reachable
   */
  async isReachable(): Promise<boolean> {
    try {
      // Try a simple GET request to /templates (doesn't require a running game)
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });

      // Any response (404, 400, etc) means server is reachable
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse game state from RL Interface response
   *
   * Response is plain text (not JSON). Need to determine actual format
   * from running 0 A.D. instance.
   */
  private parseGameState(responseText: string): RawGameState {
    // TODO: Determine actual response format from 0 A.D.
    // For now, assume it might be JSON on a single line
    try {
      return JSON.parse(responseText) as RawGameState;
    } catch {
      // If not JSON, return raw text as single field
      return {
        tick: 0,
        raw: responseText,
      } as unknown as RawGameState;
    }
  }
}
