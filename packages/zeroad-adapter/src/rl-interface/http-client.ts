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
import * as http from 'http';

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
   * Official protocol: Scenario config sent as plain text (not JSON) in POST body
   * Sends config in format: key=value\nkey=value\n...
   */
  async reset(scenarioConfig: ScenarioConfig): Promise<RawGameState> {
    this.logger.info('Calling /reset endpoint', { url: `${this.baseUrl}/reset` });

    try {
      // Convert scenario config to plain text format
      const body = this.serializeScenarioConfig(scenarioConfig);

      const response = await fetch(`${this.baseUrl}/reset`, {
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
      this.logger.info('Game reset successful', { responseLength: responseText.length });

      // Parse game state from response (plain text, not JSON)
      return this.parseGameState(responseText);
    } catch (error) {
      this.logger.error('Failed to reset game', { error: String(error) });
      throw error;
    }
  }

  /**
   * Serialize scenario config to plain text format expected by RL Interface
   */
  private serializeScenarioConfig(config: ScenarioConfig): string {
    const lines: string[] = [];

    // Settings section
    if (config.settings) {
      const settings = config.settings;

      // Map name
      if (settings.Map) {
        lines.push(`Map=${settings.Map}`);
      }

      // Player data (civilization list)
      if (settings.PlayerData && Array.isArray(settings.PlayerData)) {
        for (let i = 0; i < settings.PlayerData.length; i++) {
          const playerData = settings.PlayerData[i];
          if (playerData.Civ) {
            lines.push(`PlayerData[${i}].Civ=${playerData.Civ}`);
          }
        }
      }

      // Other settings
      for (const [key, value] of Object.entries(settings)) {
        if (key !== 'Map' && key !== 'PlayerData' && typeof value === 'string') {
          lines.push(`${key}=${value}`);
        }
      }
    }

    return lines.join('\n') + (lines.length > 0 ? '\n' : '');
  }

  /**
   * Execute commands and advance game by one tick (POST /step)
   *
   * Official protocol: Commands as newline-delimited entries
   * Format: playerId;jsonCommand\nplayerId;jsonCommand\n...
   */
  async step(commands: GameCommand[]): Promise<RawGameState> {
    try {
      // Convert commands to official format: just raw JSON (no playerID prefix)
      // The RL Interface infers player ID from session context
      const body = commands
        .map(cmd => JSON.stringify(cmd.json_cmd))
        .join('\n') + (commands.length > 0 ? '\n' : '');

      if (commands.length > 0) {
        this.logger.info('Sending commands to RL Interface', {
          commandCount: commands.length,
          body: body.substring(0, 500),
        });
      }

      this.logger.debug('Executing step', {
        commandCount: commands.length,
        bodyLength: body.length,
      });

      return new Promise((resolve, reject) => {
        const postData = Buffer.from(body);
        const options = {
          hostname: this.host,
          port: this.port,
          path: '/step',
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': postData.length,
          },
          timeout: this.timeout,
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode < 300) {
              resolve(this.parseGameState(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.write(postData);
        req.end();
      });
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
      // Evaluate failures are typically non-critical (e.g., camera operations)
      // Log as debug instead of error to avoid alarming logs
      this.logger.debug('Evaluate request failed (non-critical)', {
        error: String(error),
        codePreview: code.substring(0, 50),
      });
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
      // Try a POST to /step with empty commands (known working endpoint)
      // Use a longer timeout for connectivity check (20 seconds)
      const response = await fetch(`${this.baseUrl}/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: '',
        signal: AbortSignal.timeout(20000),
      });

      this.logger.debug('isReachable check successful', {
        url: `${this.baseUrl}/step`,
        status: response.status,
      });

      // Any response (404, 400, etc) means server is reachable
      return response.ok || response.status >= 400;
    } catch (error) {
      this.logger.debug('isReachable check failed', {
        url: `${this.baseUrl}/step`,
        error: String(error),
      });
      return false;
    }
  }

  /**
   * Parse game state from RL Interface response
   *
   * 0 A.D. returns JSON with:
   * - timeElapsed (in seconds)
   * - entities: map of ID -> entity object (not an array)
   * - players: array
   * - various game state fields
   *
   * We need to normalize this to RawGameState format:
   * - Calculate tick from timeElapsed (20 FPS = 50ms per tick)
   * - Convert entities object to array
   */
  private parseGameState(responseText: string): RawGameState {
    try {
      const raw = JSON.parse(responseText) as any;

      // Calculate tick from timeElapsed (game runs at 20 FPS)
      const tick = Math.floor((raw.timeElapsed || 0) * 20);

      // Convert entities from map { id: entity } to array
      const entitiesArray = raw.entities
        ? Object.values(raw.entities).map((entity: any, id: number) => ({
            ...entity,
            id: entity.id || id,
          }))
        : [];

      // Debug: log raw players to see if they have resources
      if (tick % 500 === 0 && tick > 0) {
        this.logger.debug('Raw players from 0 A.D. (before RawGameState)', {
          tick,
          player1: raw.players?.[0],
          player2: raw.players?.[1],
        });
      }

      return {
        tick,
        time_elapsed: raw.timeElapsed || 0,
        players: raw.players || [],
        entities: entitiesArray,
        mapSize: raw.mapSize,
        mapName: raw.mapName,
      } as RawGameState;
    } catch (error) {
      this.logger.error('Failed to parse game state', { error: String(error) });
      // If not JSON, return raw text as single field
      return {
        tick: 0,
        time_elapsed: 0,
        players: [],
        entities: [],
        raw: responseText,
      } as unknown as RawGameState;
    }
  }
}
