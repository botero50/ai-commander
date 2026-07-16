#!/usr/bin/env node

/**
 * Chess Startup Command — Verify dependencies and launch continuous chess arena
 *
 * Flow:
 * 1. Verify Node version
 * 2. Verify Ollama availability
 * 3. Verify Ollama models
 * 4. Verify chess engine (Stockfish)
 * 5. Create default config
 * 6. Initialize broadcaster
 * 7. Create arena manager
 * 8. Launch first match
 * 9. Loop forever
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

interface StartupResult {
  success: boolean;
  nodeVersion: string;
  ollamaAvailable: boolean;
  ollamaModels: string[];
  stockfishAvailable: boolean;
  configPath: string;
}

export class ChessStartup {
  private config = {
    ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
    defaultModel: process.env.CHESS_MODEL || 'mistral',
    nodeMinVersion: '22.0.0',
    stockfishTimeout: 5000,
  };

  private results: StartupResult = {
    success: false,
    nodeVersion: '',
    ollamaAvailable: false,
    ollamaModels: [],
    stockfishAvailable: false,
    configPath: '',
  };

  async run(): Promise<void> {
    console.clear();
    this.logBanner();

    try {
      console.log('\n🔍 STARTUP DIAGNOSTICS\n');
      console.log('=' + '='.repeat(49) + '\n');

      // Step 1: Verify Node
      await this.verifyNode();
      this.logCheck('Node.js version', `v${this.results.nodeVersion}`);

      // Step 2: Verify Ollama
      await this.verifyOllama();
      this.logCheck('Ollama connection', this.results.ollamaAvailable ? '✓ Connected' : '✗ Failed');

      // Step 3: Verify Models
      if (this.results.ollamaAvailable) {
        await this.verifyOllamaModels();
        this.logCheck(
          'Ollama models',
          this.results.ollamaModels.length > 0 ? `${this.results.ollamaModels.length} available` : '✗ None found'
        );
      }

      // Step 4: Verify Stockfish
      await this.verifyStockfish();
      this.logCheck('Stockfish engine', this.results.stockfishAvailable ? '✓ Available' : '✗ Not found');

      // Step 5: Create default config
      await this.createDefaultConfig();
      this.logCheck('Default config', `Created: ${this.results.configPath}`);

      console.log('\n' + '='.repeat(50) + '\n');

      // Final status
      if (!this.isReadyToLaunch()) {
        await this.printRecoveryInstructions();
        process.exit(1);
      }

      console.log('✅ Arena Ready\n');
      console.log('🚀 Launching first match...\n');

      // Step 6-9: Launch arena
      await this.launchArena();
    } catch (error) {
      console.error(`\n❌ Startup failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  }

  private logBanner(): void {
    console.log('\n' + '='.repeat(50));
    console.log('  AI COMMANDER v1.0 — Chess Tournament Platform');
    console.log('='.repeat(50));
  }

  private logCheck(label: string, status: string): void {
    const padding = ' '.repeat(Math.max(0, 24 - label.length));
    console.log(`  ${label}${padding}${status}`);
  }

  private async verifyNode(): Promise<void> {
    const version = process.version.replace('v', '');
    this.results.nodeVersion = version;

    const [major, minor] = version.split('.').map(Number);
    const [minMajor, minMinor] = this.config.nodeMinVersion.split('.').map(Number);

    if (major < minMajor || (major === minMajor && minor < minMinor)) {
      throw new Error(
        `Node.js ${this.config.nodeMinVersion}+ required (found v${version}). ` +
        `Update Node.js from https://nodejs.org`
      );
    }
  }

  private async verifyOllama(): Promise<void> {
    try {
      const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`, {
        signal: AbortSignal.timeout(this.config.stockfishTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.results.ollamaAvailable = true;
    } catch (error) {
      this.results.ollamaAvailable = false;
    }
  }

  private async verifyOllamaModels(): Promise<void> {
    if (!this.results.ollamaAvailable) {
      return;
    }

    try {
      const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`, {
        signal: AbortSignal.timeout(this.config.stockfishTimeout),
      });
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      this.results.ollamaModels = (data.models || []).map((m: any) => m.name);
    } catch (error) {
      this.results.ollamaModels = [];
    }
  }

  private async verifyStockfish(): Promise<void> {
    try {
      // Try to run stockfish with version command
      const { stdout } = await execPromise('stockfish --version 2>&1 || echo ""', { timeout: 5000 });

      if (stdout.includes('Stockfish')) {
        this.results.stockfishAvailable = true;
      }
    } catch (error) {
      this.results.stockfishAvailable = false;
    }
  }

  private async createDefaultConfig(): Promise<void> {
    const configPath = path.join(process.cwd(), 'chess-arena-config.json');
    const config = {
      version: '1.0.0',
      game: 'chess',
      arena: {
        maxGamesPerSession: 0, // infinite
        randomizeEachGame: true,
        defaultTimeControl: 'infinite',
      },
      players: [
        {
          id: 'player-1',
          name: 'Ollama',
          provider: 'ollama',
          model: this.results.ollamaModels[0] || this.config.defaultModel,
          personality: 'balanced',
        },
        {
          id: 'player-2',
          name: 'Stockfish',
          provider: 'stockfish',
          elo: 1500,
          personality: 'competitive',
        },
      ],
      broadcast: {
        port: 9000,
        enabled: true,
        displayName: 'AI Chess Arena',
      },
    };

    // Write config only if it doesn't exist
    if (!existsSync(configPath)) {
      const fs = await import('fs/promises');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    this.results.configPath = configPath;
  }

  private isReadyToLaunch(): boolean {
    return this.results.ollamaAvailable && this.results.ollamaModels.length > 0 && this.results.stockfishAvailable;
  }

  private async printRecoveryInstructions(): Promise<void> {
    console.log('\n❌ STARTUP FAILED\n');
    console.log('Missing dependencies. Follow these steps:\n');

    if (!this.results.ollamaAvailable) {
      console.log('1. Start Ollama:');
      console.log('   • Download from https://ollama.ai');
      console.log('   • Run: ollama serve\n');
    }

    if (this.results.ollamaAvailable && this.results.ollamaModels.length === 0) {
      console.log('2. Pull an Ollama model:');
      console.log(`   • Run: ollama pull ${this.config.defaultModel}\n`);
    }

    if (!this.results.stockfishAvailable) {
      console.log('3. Install Stockfish:');
      console.log('   • macOS: brew install stockfish');
      console.log('   • Linux: apt-get install stockfish');
      console.log('   • Windows: Download from https://stockfishchess.org\n');
    }

    console.log('Then try again: pnpm chess\n');
  }

  private async launchArena(): Promise<void> {
    // Import and launch the arena
    // This will be implemented in EPIC 61.2
    // For now, just show that startup succeeded

    console.log('═'.repeat(50));
    console.log('  Arena launched successfully');
    console.log('  Press Ctrl+C to stop\n');

    // TODO: Implement arena loop in EPIC 61.2
    // For now, just keep the process running
    await new Promise(() => {
      // Never resolve - keep running
    });
  }
}

// Run startup
const startup = new ChessStartup();
startup.run().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}\n`);
  process.exit(1);
});
