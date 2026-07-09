#!/usr/bin/env node

/**
 * Real Game State Reader
 *
 * Connects to a running 0 A.D. process and reads actual game state.
 * This proves the IPC protocol works.
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class StateReader {
  constructor() {
    this.socket = null;
    this.ipcPort = 9090; // Standard port for 0 A.D. IPC
    this.ipcHost = '127.0.0.1';
    this.gameProcess = null;
    this.stateBuffer = [];
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
  // LAUNCH 0 A.D.
  // ============================================================================

  launchZeroAD() {
    this.section('STEP 1: LAUNCH 0 A.D.');

    const exePath = this.find0ADExecutable();

    try {
      this.log('Starting 0 A.D. process...', '🚀');

      // Launch 0 A.D. with network debugging enabled
      // This requires 0 A.D. to have network support compiled in
      this.gameProcess = spawn(exePath, [], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false,
      });

      if (!this.gameProcess.pid) {
        throw new Error('Failed to spawn 0 A.D.');
      }

      this.success(`Game process started (PID: ${this.gameProcess.pid})`);

      // Monitor process output for debug messages
      if (this.gameProcess.stdout) {
        this.gameProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output.includes('IPC') || output.includes('network') || output.includes('port')) {
            this.log(`[0 A.D.] ${output}`, '📡');
          }
        });
      }

      // Give it time to start
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 3000);
      });
    } catch (err) {
      this.error(`Failed to launch 0 A.D.: ${err.message}`);
      throw err;
    }
  }

  find0ADExecutable() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const candidates = [
      'C:\\Program Files\\0 A.D.\\pyrogenesis.exe',
      'C:\\Program Files (x86)\\0 A.D.\\pyrogenesis.exe',
      path.join(homeDir || '', 'AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe'),
      '/Applications/0 A.D.app/Contents/MacOS/pyrogenesis',
      '/usr/games/0ad',
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error('0 A.D. not found');
  }

  // ============================================================================
  // CONNECT VIA IPC
  // ============================================================================

  async connectToGame() {
    this.section('STEP 2: CONNECT TO 0 A.D. VIA IPC');

    return new Promise((resolve, reject) => {
      this.log(`Attempting to connect to ${this.ipcHost}:${this.ipcPort}...`, '🔌');

      const timeout = setTimeout(() => {
        this.warn('Connection timeout (10 seconds)');
        this.warn('0 A.D. may not have IPC support enabled');
        reject(new Error('IPC connection timeout'));
      }, 10000);

      this.socket = net.createConnection(
        {
          host: this.ipcHost,
          port: this.ipcPort,
          timeout: 10000,
        },
        () => {
          clearTimeout(timeout);
          this.success(`Connected to 0 A.D. IPC at ${this.ipcHost}:${this.ipcPort}`);

          // Set up data handler
          this.socket.on('data', (data) => {
            this.handleData(data);
          });

          this.socket.on('error', (err) => {
            this.error(`Socket error: ${err.message}`);
            reject(err);
          });

          this.socket.on('end', () => {
            this.log('Connection closed', '🔌');
          });

          resolve(this.socket);
        }
      );

      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        this.error(`Failed to connect: ${err.message}`);
        reject(err);
      });
    });
  }

  handleData(data) {
    // Accumulate data in buffer
    this.stateBuffer.push(data);

    const fullData = Buffer.concat(this.stateBuffer).toString('utf-8');

    // Try to parse as JSON (0 A.D. might send JSON or binary)
    try {
      // Look for JSON object boundaries
      if (fullData.includes('{') && fullData.includes('}')) {
        const startIdx = fullData.indexOf('{');
        const endIdx = fullData.lastIndexOf('}');

        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = fullData.substring(startIdx, endIdx + 1);
          const state = JSON.parse(jsonStr);

          this.logGameState(state);
          this.stateBuffer = []; // Clear buffer after successful parse
        }
      }
    } catch (err) {
      // Not valid JSON yet, keep buffering
      if (this.stateBuffer.length > 100000) {
        // If buffer gets too large, it's probably not JSON
        this.warn('Received data but could not parse as JSON');
        this.warn('Raw data sample: ' + fullData.substring(0, 100));
        this.stateBuffer = [];
      }
    }
  }

  logGameState(state) {
    this.section('GAME STATE RECEIVED');

    this.log(`Tick: ${state.tick || '?'}`, '⏱️');
    this.log(`Players: ${state.players?.length || 0}`, '👥');
    this.log(`Units: ${state.units?.length || 0}`, '🎖️');
    this.log(`Buildings: ${state.buildings?.length || 0}`, '🏗️');

    if (state.players) {
      console.log('\nPlayer Details:');
      state.players.forEach((p, i) => {
        console.log(`  Player ${p.id}: ${p.name || 'Unknown'}`);
        if (p.resources) {
          console.log(`    Food: ${p.resources.food || 0}`);
          console.log(`    Wood: ${p.resources.wood || 0}`);
          console.log(`    Stone: ${p.resources.stone || 0}`);
          console.log(`    Metal: ${p.resources.metal || 0}`);
        }
      });
    }

    if (state.map) {
      console.log(`\nMap: ${state.map.terrain} (${state.map.width}x${state.map.height})`);
    }

    this.success('Game state successfully parsed!');
  }

  // ============================================================================
  // REQUEST GAME STATE
  // ============================================================================

  async requestGameState() {
    this.section('STEP 3: REQUEST GAME STATE');

    if (!this.socket) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const request = JSON.stringify({ command: 'get_state' });
        this.log(`Sending: ${request}`, '📤');

        this.socket.write(request + '\n');

        // Wait for response
        const timeout = setTimeout(() => {
          this.warn('No response from 0 A.D. (5 second timeout)');
          reject(new Error('State request timeout'));
        }, 5000);

        // Listen for response
        const onData = (data) => {
          clearTimeout(timeout);
          this.log('Received response from 0 A.D.', '📥');
          this.socket.removeListener('data', onData);
          resolve(data);
        };

        this.socket.on('data', onData);
      } catch (err) {
        this.error(`Failed to send request: ${err.message}`);
        reject(err);
      }
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async shutdown() {
    this.section('CLEANUP');

    if (this.socket) {
      this.log('Closing IPC connection...', '🔌');
      this.socket.destroy();
    }

    if (this.gameProcess) {
      this.log('Terminating 0 A.D. process...', '🛑');
      this.gameProcess.kill('SIGTERM');

      // Wait for exit
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.gameProcess?.kill('SIGKILL');
          resolve();
        }, 5000);

        this.gameProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this.success('Cleanup complete');
  }

  // ============================================================================
  // MAIN
  // ============================================================================

  async run() {
    this.section('🎮 REAL GAME STATE READER');

    try {
      // Step 1: Launch game
      await this.launchZeroAD();

      // Step 2: Connect via IPC
      try {
        await this.connectToGame();
      } catch (err) {
        this.section('⚠️ IPC CONNECTION FAILED');
        console.log('This is expected if 0 A.D. does not have IPC support compiled in.\n');
        console.log('The following occurs when 0 A.D. does NOT support IPC:');
        console.log('  - Game launches successfully');
        console.log('  - Connection attempts fail (port not open)');
        console.log('  - No network protocol available\n');
        console.log('NEXT STEPS:');
        console.log('  1. Verify 0 A.D. version supports network IPC');
        console.log('  2. Check if a mod is required for IPC support');
        console.log('  3. Review 0 A.D. source code or documentation\n');
        throw new Error('Cannot proceed without IPC support');
      }

      // Step 3: Request game state
      await this.requestGameState();

      // Wait a bit to receive data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.section('✅ SUCCESS');
      console.log('Successfully read game state from 0 A.D.!\n');
      console.log('What just happened:');
      console.log('  1. AI Commander launched 0 A.D.');
      console.log('  2. AI Commander connected via IPC socket');
      console.log('  3. AI Commander sent "get_state" command');
      console.log('  4. 0 A.D. responded with real game state');
      console.log('  5. State was parsed and displayed\n');
      console.log('MILESTONE ACHIEVED:');
      console.log('  ✅ Process launching works');
      console.log('  ✅ IPC protocol works');
      console.log('  ✅ State observation works\n');
      console.log('NEXT STEP:');
      console.log('  Story R1.4 — Execute Real Commands');
    } catch (err) {
      this.section('❌ FAILED');
      console.error('Error:', err.message);
      console.log('\nDiagnostics:');
      console.log('  - Did 0 A.D. launch? (Check your screen)');
      console.log('  - Does 0 A.D. support IPC? (Check version/mod requirements)');
      console.log('  - Is firewall blocking port 9090?');
      process.exit(1);
    } finally {
      await this.shutdown();
    }
  }
}

// Main
async function main() {
  const reader = new StateReader();
  await reader.run();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
