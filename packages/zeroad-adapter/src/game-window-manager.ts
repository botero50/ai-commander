/**
 * Game Window Manager
 *
 * Handles:
 * - Launching game instances
 * - Window detection and tracking
 * - Window state synchronization
 * - Fullscreen/windowed mode control
 * - Cross-platform compatibility
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GameWindowInfo {
  windowId: string;
  isRunning: boolean;
  isEmbedded: boolean;
  isFullscreen: boolean;
  canEmbed: boolean;
  gameType: 'zeroad' | 'spring';
}

export interface LaunchGameOptions {
  gameType: 'zeroad' | 'spring';
  matchId: string;
  mapName?: string;
  difficulty?: 'easy' | 'hard' | 'impossible';
  fullscreen?: boolean;
}

export class GameWindowManager {
  private windows: Map<string, GameWindowInfo> = new Map();
  private processMap: Map<string, NodeJS.Process> = new Map();

  /**
   * Launch a game instance
   */
  async launchGame(options: LaunchGameOptions): Promise<GameWindowInfo> {
    const windowId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (options.gameType === 'zeroad') {
        await this.launch0AD(windowId, options);
      } else {
        await this.launchSpringRTS(windowId, options);
      }

      const windowInfo: GameWindowInfo = {
        windowId,
        isRunning: true,
        isEmbedded: false, // Determined after launch
        isFullscreen: options.fullscreen || false,
        canEmbed: options.gameType === 'zeroad',
        gameType: options.gameType,
      };

      this.windows.set(windowId, windowInfo);
      return windowInfo;
    } catch (error) {
      console.error(`Failed to launch ${options.gameType}:`, error);
      throw error;
    }
  }

  /**
   * Launch 0 A.D. instance
   */
  private async launch0AD(windowId: string, options: LaunchGameOptions): Promise<void> {
    const gameExePath = this.find0ADBinary();
    if (!gameExePath) {
      throw new Error('0 A.D. executable not found');
    }

    const args: string[] = [
      '-mod=public',
      `-matchid=${options.matchId}`,
    ];

    if (options.mapName) {
      args.push(`-map=${options.mapName}`);
    }

    if (options.fullscreen) {
      args.push('-fullscreen');
    } else {
      args.push('-windowed');
    }

    // Launch the game
    const proc = spawn(gameExePath, args, {
      detached: true,
      stdio: 'ignore',
    });

    this.processMap.set(windowId, proc);

    // Unref to allow Node to exit while game is running
    proc.unref();

    // Wait for window to appear
    await this.waitForWindow(windowId, 10000);
  }

  /**
   * Launch Spring RTS instance
   */
  private async launchSpringRTS(windowId: string, options: LaunchGameOptions): Promise<void> {
    const gameExePath = this.findSpringBinary();
    if (!gameExePath) {
      throw new Error('Spring RTS executable not found');
    }

    const args: string[] = [
      `--isolation-mode=${options.matchId}`,
    ];

    if (options.mapName) {
      args.push(`--map=${options.mapName}`);
    }

    if (options.fullscreen) {
      args.push('--fullscreen');
    } else {
      args.push('--window');
    }

    const proc = spawn(gameExePath, args, {
      detached: true,
      stdio: 'ignore',
    });

    this.processMap.set(windowId, proc);
    proc.unref();

    await this.waitForWindow(windowId, 10000);
  }

  /**
   * Find 0 A.D. binary
   */
  private find0ADBinary(): string | null {
    const possiblePaths = [
      'C:\\Program Files (x86)\\0 A.D\\binaries\\system\\pyrogenesis.exe',
      'C:\\Program Files\\0 A.D\\binaries\\system\\pyrogenesis.exe',
      '/Applications/0 A.D.app/Contents/MacOS/pyrogenesis',
      '/usr/bin/pyrogenesis',
      '/usr/local/bin/pyrogenesis',
    ];

    // Return first found path
    for (const path of possiblePaths) {
      // In a real implementation, check if file exists
      // For now, return the Windows path as most likely
      if (path.includes('pyrogenesis.exe')) {
        return path;
      }
    }

    return null;
  }

  /**
   * Find Spring RTS binary
   */
  private findSpringBinary(): string | null {
    const possiblePaths = [
      'C:\\Program Files\\Spring\\spring.exe',
      'C:\\Program Files (x86)\\Spring\\spring.exe',
      '/Applications/Spring.app/Contents/MacOS/spring',
      '/usr/bin/spring',
      '/usr/local/bin/spring',
    ];

    for (const path of possiblePaths) {
      if (path.includes('spring.exe') || path.includes('spring')) {
        return path;
      }
    }

    return null;
  }

  /**
   * Wait for window to appear
   */
  private async waitForWindow(windowId: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const windowInfo = this.windows.get(windowId);
      if (windowInfo?.isRunning) {
        return;
      }

      // Check if process is still running
      const proc = this.processMap.get(windowId);
      if (proc && proc.killed) {
        throw new Error('Game process terminated unexpectedly');
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error('Game window failed to appear within timeout');
  }

  /**
   * Get window status
   */
  getWindowStatus(windowId: string): GameWindowInfo | null {
    return this.windows.get(windowId) || null;
  }

  /**
   * Check if window is still running
   */
  isWindowRunning(windowId: string): boolean {
    const proc = this.processMap.get(windowId);
    if (!proc) {
      return false;
    }

    return !proc.killed;
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen(windowId: string, fullscreen: boolean): Promise<void> {
    const windowInfo = this.windows.get(windowId);
    if (!windowInfo) {
      throw new Error(`Window ${windowId} not found`);
    }

    windowInfo.isFullscreen = fullscreen;

    // Send signal to game (implementation depends on game support)
    // This is a placeholder for actual fullscreen toggle via IPC
  }

  /**
   * Close window
   */
  async closeWindow(windowId: string): Promise<void> {
    const proc = this.processMap.get(windowId);
    if (proc && !proc.killed) {
      proc.kill();
    }

    this.windows.delete(windowId);
    this.processMap.delete(windowId);
  }

  /**
   * Get all running windows
   */
  getRunningWindows(): GameWindowInfo[] {
    return Array.from(this.windows.values()).filter((w) => this.isWindowRunning(w.windowId));
  }
}

export const gameWindowManager = new GameWindowManager();
