/**
 * RL Interface HTTP Client
 *
 * Minimal HTTP client for 0 A.D. RL Interface /step endpoint
 * Uses native fetch API (Node 22+)
 */

import { Logger } from '../config/logger.js';
import { RawGameState, RLCommand } from './types.js';

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
   * Initialize game by calling /reset endpoint
   */
  async reset(): Promise<RawGameState> {
    this.logger.info('Calling /reset endpoint', { url: `${this.baseUrl}/reset` });

    try {
      const response = await this.makeRequest('reset', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const state = response as RawGameState;
      this.logger.info('Game reset successful', {
        tick: state.tick,
        players: state.players?.length || 0,
        entities: state.entities?.length || 0,
      });

      return state;
    } catch (error) {
      this.logger.error('Failed to reset game', { error: String(error) });
      throw error;
    }
  }

  /**
   * Execute commands and advance game by one tick
   *
   * @param commands - Array of commands to execute (can be empty for no-op step)
   * @returns Updated game state after executing commands and advancing tick
   */
  async step(commands: RLCommand[]): Promise<RawGameState> {
    try {
      const response = await this.makeRequest('step', {
        method: 'POST',
        body: JSON.stringify(commands),
      });

      const state = response as RawGameState;
      return state;
    } catch (error) {
      this.logger.error('Failed to execute step', { error: String(error), commandCount: commands.length });
      throw error;
    }
  }

  /**
   * Check if server is reachable
   */
  async isReachable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/reset`, {
        method: 'POST',
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Internal HTTP request method
   */
  private async makeRequest(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: string;
    }
  ): Promise<RawGameState> {
    const url = `${this.baseUrl}/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: options.body,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as RawGameState;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Failed to connect to RL Interface at ${url}`);
      }
      throw error;
    }
  }
}
