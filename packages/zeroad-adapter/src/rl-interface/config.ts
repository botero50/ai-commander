/**
 * RL Interface Configuration
 *
 * Minimal configuration for connecting to 0 A.D. RL Interface
 */

export interface RLInterfaceConfig {
  // Process configuration
  gameExecutablePath?: string;  // Auto-detect if not provided
  rlInterfacePort: number;      // Default: 6000
  rlInterfaceHost: string;      // Default: 127.0.0.1

  // Timing configuration
  launchTimeout: number;        // Default: 30000 (ms) - how long to wait for game to start
  startupGrace: number;         // Default: 3000 (ms) - grace period after launch before connecting
  connectionTimeout: number;    // Default: 10000 (ms) - HTTP connection timeout
  stepTimeout: number;          // Default: 30000 (ms) - per-step timeout

  // Game configuration
  modPath?: string;             // Default: 'public' - which mod to load

  // Logging
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default RL Interface configuration
 */
export const DEFAULT_RL_CONFIG: RLInterfaceConfig = {
  rlInterfacePort: 6000,
  rlInterfaceHost: '127.0.0.1',
  launchTimeout: 30000,
  startupGrace: 3000,
  connectionTimeout: 10000,
  stepTimeout: 30000,
  modPath: 'public',
  logLevel: 'info',
};
