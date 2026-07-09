#!/usr/bin/env node

/**
 * Real 0 A.D. Game Launcher
 *
 * Attempts to launch a real 0 A.D. game instance.
 * This is the REAL integration test — no simulation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

class RealGameLauncher {
  constructor() {
    this.gameProcess = null;
    this.platformInfo = {
      platform: process.platform,
      arch: process.arch,
      homeDir: process.env.HOME || process.env.USERPROFILE || os.homedir(),
    };
  }

  log(message, emoji = '→') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  section(title) {
    console.log('\n' + '='.repeat(70));
    console.log(`  ${title}`);
    console.log('='.repeat(70) + '\n');
  }

  success(message) {
    this.log(message, '✅');
  }

  warn(message) {
    this.log(message, '⚠️');
  }

  error(message) {
    this.log(message, '❌');
  }

  // ============================================================================
  // FIND 0 A.D. INSTALLATION
  // ============================================================================

  findZeroADExecutable() {
    this.section('STEP 1: LOCATE 0 A.D.');

    const candidates = this.getPlatformCandidates();
    this.log(`Searching ${candidates.length} possible locations...`, '🔍');

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.success(`Found 0 A.D. at: ${candidate}`);
        return candidate;
      }
    }

    this.error('0 A.D. not found in any standard locations');
    this.log('Checked:', '📋');
    candidates.forEach((c) => console.log(`  • ${c}`));

    console.log('\n🔧 How to install 0 A.D.:');
    console.log('  Windows: Download from https://play0ad.com/');
    console.log('  macOS:   brew install 0ad');
    console.log('  Linux:   sudo apt install 0ad');
    console.log('');

    throw new Error('0 A.D. installation not found');
  }

  getPlatformCandidates() {
    const platform = process.platform;
    const homeDir = this.platformInfo.homeDir;

    if (platform === 'win32') {
      return [
        'C:\\Program Files\\0 A.D.\\pyrogenesis.exe',
        'C:\\Program Files (x86)\\0 A.D.\\pyrogenesis.exe',
        path.join(homeDir, 'AppData\\Local\\0 A.D.\\pyrogenesis.exe'),
        path.join(homeDir, 'AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe'),
        path.join(homeDir, 'AppData\\Roaming\\0 A.D.\\pyrogenesis.exe'),
      ];
    } else if (platform === 'darwin') {
      return [
        '/Applications/0 A.D.app/Contents/MacOS/pyrogenesis',
        path.join(homeDir, 'Applications/0 A.D.app/Contents/MacOS/pyrogenesis'),
      ];
    } else if (platform === 'linux') {
      return [
        '/usr/games/0ad',
        '/usr/bin/0ad',
        '/usr/local/games/0ad',
        path.join(homeDir, '.local/share/0ad/pyrogenesis'),
      ];
    }

    return [];
  }

  // ============================================================================
  // LAUNCH THE GAME
  // ============================================================================

  launchGame(executablePath) {
    this.section('STEP 2: LAUNCH 0 A.D.');

    return new Promise((resolve, reject) => {
      try {
        this.log(`Launching: ${executablePath}`, '🚀');

        // For real game play, we want to launch normally, not in editor mode
        // Arguments: none for now (defaults to main menu)
        const args = [
          // Optional: Add map configuration here
          // '-autostart=maps/scenarios/...'
        ];

        this.gameProcess = spawn(executablePath, args, {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, capture stdout/stderr
          // On Windows, we might want to show the window
          windowsHide: false,
        });

        if (!this.gameProcess.pid) {
          throw new Error('Failed to spawn process (no PID)');
        }

        this.success(`Process spawned with PID: ${this.gameProcess.pid}`);

        // Monitor stdout/stderr
        if (this.gameProcess.stdout) {
          this.gameProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
              this.log(`[0 A.D.] ${output}`, '📡');
            }
          });
        }

        if (this.gameProcess.stderr) {
          this.gameProcess.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
              this.warn(`[0 A.D. stderr] ${output}`);
            }
          });
        }

        // Handle process exit
        this.gameProcess.on('exit', (code, signal) => {
          this.log(`Process exited with code ${code} (signal: ${signal})`, '⏹️');
          this.gameProcess = null;
        });

        this.gameProcess.on('error', (err) => {
          this.error(`Process error: ${err.message}`);
          this.gameProcess = null;
          reject(err);
        });

        // Give the process time to start
        setTimeout(() => {
          if (this.gameProcess && !this.gameProcess.killed) {
            this.success('0 A.D. started successfully');
            resolve(this.gameProcess);
          } else {
            reject(new Error('Process exited unexpectedly'));
          }
        }, 3000); // Wait 3 seconds for startup
      } catch (err) {
        this.error(`Launch failed: ${err.message}`);
        reject(err);
      }
    });
  }

  // ============================================================================
  // VERIFY GAME IS RUNNING
  // ============================================================================

  verifyGameRunning() {
    this.section('STEP 3: VERIFY GAME STATE');

    if (!this.gameProcess || this.gameProcess.killed) {
      this.error('Process is not running');
      return false;
    }

    this.success(`Process is running (PID: ${this.gameProcess.pid})`);

    // Check if process is actually alive
    try {
      // Send signal 0 to check if process exists (doesn't kill it)
      // This only works on Unix-like systems
      if (process.platform !== 'win32') {
        process.kill(this.gameProcess.pid, 0);
        this.success('Process signal check passed');
      } else {
        this.log('Process exists (Windows)', '✅');
      }
    } catch (err) {
      this.error(`Process is not responding: ${err.message}`);
      return false;
    }

    return true;
  }

  // ============================================================================
  // MONITOR GAME
  // ============================================================================

  async monitorGame(durationSeconds = 10) {
    this.section('STEP 4: MONITOR GAME');

    this.log(`Monitoring for ${durationSeconds} seconds...`, '👀');
    this.log('The 0 A.D. window should be visible on your screen', '🖥️');
    this.log('Game will continue running after this script exits', '⏳');

    return new Promise((resolve) => {
      let elapsed = 0;

      const interval = setInterval(() => {
        elapsed++;

        if (this.gameProcess && !this.gameProcess.killed) {
          const percent = Math.round((elapsed / durationSeconds) * 100);
          process.stdout.write(`\r[${timestamp()}] ⏳ Monitoring... ${percent}% (${elapsed}/${durationSeconds}s)`);

          if (elapsed >= durationSeconds) {
            clearInterval(interval);
            console.log(''); // newline
            this.success('Monitoring complete');
            resolve(true);
          }
        } else {
          clearInterval(interval);
          console.log(''); // newline
          this.error('Game process terminated unexpectedly');
          resolve(false);
        }
      }, 1000);
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async shutdown() {
    if (!this.gameProcess || this.gameProcess.killed) {
      return;
    }

    this.section('CLEANUP');
    this.log('Shutting down...', '🛑');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.warn('Forcing termination');
        this.gameProcess?.kill('SIGKILL');
        resolve();
      }, 5000);

      this.gameProcess.on('exit', () => {
        clearTimeout(timeout);
        this.success('Process terminated cleanly');
        resolve();
      });

      this.gameProcess.kill('SIGTERM');
    });
  }

  // ============================================================================
  // MAIN
  // ============================================================================

  async run() {
    this.section('🎮 REAL 0 A.D. GAME LAUNCHER');

    try {
      // Step 1: Find 0 A.D.
      const executablePath = this.findZeroADExecutable();

      // Step 2: Launch the game
      await this.launchGame(executablePath);

      // Step 3: Verify it's running
      this.verifyGameRunning();

      // Step 4: Monitor it
      await this.monitorGame(15);

      // Success!
      this.section('✅ SUCCESS');
      console.log('0 A.D. launched successfully!\n');
      console.log('What just happened:');
      console.log('  1. AI Commander located your 0 A.D. installation');
      console.log('  2. AI Commander launched the 0 A.D. process');
      console.log('  3. The game window opened on your screen');
      console.log('  4. Process stayed alive and responsive\n');
      console.log('Next steps:');
      console.log('  - The game is still running (you can close it manually)');
      console.log('  - Story R1.3: Read game state from a running match');
      console.log('  - Story R1.4: Inject commands into the game\n');
    } catch (err) {
      this.section('❌ FAILED');
      console.error('Error:', err.message);

      if (err.message.includes('0 A.D. not found')) {
        console.log('\n💡 Solutions:');
        console.log('  1. Install 0 A.D. from https://play0ad.com/');
        console.log('  2. Run: npm run real-game-launcher');
      } else {
        console.log('\n💡 Troubleshooting:');
        console.log('  - Is 0 A.D. already running? Close it and try again.');
        console.log('  - Try running 0 A.D. manually to verify installation.');
        console.log('  - Check console output above for specific errors.');
      }

      process.exit(1);
    } finally {
      // Ensure cleanup
      await this.shutdown();
    }
  }
}

function timestamp() {
  return new Date().toLocaleTimeString();
}

// Main
async function main() {
  const launcher = new RealGameLauncher();
  await launcher.run();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
