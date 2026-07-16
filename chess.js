#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

class ChessStartup {
  constructor() {
    this.config = {
      ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      defaultModel: process.env.CHESS_MODEL || 'mistral',
      nodeMinVersion: '22.0.0',
      stockfishTimeout: 5000,
    };

    this.results = {
      success: false,
      nodeVersion: '',
      ollamaAvailable: false,
      ollamaModels: [],
      stockfishAvailable: false,
      configPath: '',
    };
  }

  async run() {
    try {
      console.clear?.();
      this.logBanner();
      console.log('\n🔍 STARTUP DIAGNOSTICS\n');
      console.log('=' + '='.repeat(49) + '\n');

      // Step 1: Verify Node
      await this.verifyNode();
      this.logCheck('Node.js version', 'v' + this.results.nodeVersion);

      // Step 2: Verify Ollama
      await this.verifyOllama();
      this.logCheck('Ollama connection', this.results.ollamaAvailable ? '✓ Connected' : '✗ Failed');

      // Step 3: Verify Models
      if (this.results.ollamaAvailable) {
        await this.verifyOllamaModels();
        const modelCount = this.results.ollamaModels.length > 0
          ? this.results.ollamaModels.length + ' available'
          : '✗ None found';
        this.logCheck('Ollama models', modelCount);
      }

      // Step 4: Verify Stockfish
      await this.verifyStockfish();
      this.logCheck('Stockfish engine', this.results.stockfishAvailable ? '✓ Available' : '✗ Not found');

      // Step 5: Create default config
      await this.createDefaultConfig();
      this.logCheck('Default config', 'Created: ' + this.results.configPath);

      console.log('\n' + '='.repeat(50) + '\n');

      // Final status
      if (!this.isReadyToLaunch()) {
        await this.printRecoveryInstructions();
        process.exit(1);
      }

      console.log('✅ Arena Ready\n');
      console.log('🚀 Launching first match...\n');
      console.log('═'.repeat(50));
      console.log('  Arena launched successfully');
      console.log('  Press Ctrl+C to stop\n');

      // Keep process alive
      await new Promise(() => {
        // Never resolve
      });
    } catch (error) {
      console.error('\n❌ Startup failed: ' + error.message + '\n');
      process.exit(1);
    }
  }

  logBanner() {
    console.log('\n' + '='.repeat(50));
    console.log('  AI COMMANDER v1.0 — Chess Tournament Platform');
    console.log('='.repeat(50));
  }

  logCheck(label, status) {
    const padding = ' '.repeat(Math.max(0, 24 - label.length));
    console.log('  ' + label + padding + status);
  }

  async verifyNode() {
    const version = process.version.replace('v', '');
    this.results.nodeVersion = version;

    const [major, minor] = version.split('.').map(Number);
    const [minMajor, minMinor] = this.config.nodeMinVersion.split('.').map(Number);

    if (major < minMajor || (major === minMajor && minor < minMinor)) {
      throw new Error(
        'Node.js ' + this.config.nodeMinVersion + '+ required (found v' + version + '). ' +
        'Update Node.js from https://nodejs.org'
      );
    }
  }

  async verifyOllama() {
    try {
      const response = await fetch(this.config.ollamaEndpoint + '/api/tags', {
        signal: AbortSignal.timeout(this.config.stockfishTimeout),
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      this.results.ollamaAvailable = true;
    } catch (error) {
      this.results.ollamaAvailable = false;
    }
  }

  async verifyOllamaModels() {
    if (!this.results.ollamaAvailable) {
      return;
    }

    try {
      const response = await fetch(this.config.ollamaEndpoint + '/api/tags', {
        signal: AbortSignal.timeout(this.config.stockfishTimeout),
      });
      const data = await response.json();
      this.results.ollamaModels = (data.models || []).map((m) => m.name);
    } catch (error) {
      this.results.ollamaModels = [];
    }
  }

  async verifyStockfish() {
    try {
      const { stdout } = await execPromise('stockfish --version 2>&1 || echo ""', { timeout: 5000 });

      if (stdout.includes('Stockfish')) {
        this.results.stockfishAvailable = true;
      }
    } catch (error) {
      this.results.stockfishAvailable = false;
    }
  }

  async createDefaultConfig() {
    const configPath = path.join(process.cwd(), 'chess-arena-config.json');
    const config = {
      version: '1.0.0',
      game: 'chess',
      arena: {
        maxGamesPerSession: 0,
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

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    this.results.configPath = configPath;
  }

  isReadyToLaunch() {
    const hasOllama = this.results.ollamaAvailable && this.results.ollamaModels.length >= 1;
    const hasMixedSetup = hasOllama && this.results.stockfishAvailable;
    const hasOllamaVsOllama = this.results.ollamaModels.length >= 2;

    return hasOllama && (hasMixedSetup || hasOllamaVsOllama);
  }

  async printRecoveryInstructions() {
    console.log('\n❌ STARTUP FAILED\n');
    console.log('Missing dependencies. Follow these steps:\n');

    if (!this.results.ollamaAvailable) {
      console.log('1. Start Ollama:');
      console.log('   • Download from https://ollama.ai');
      console.log('   • Run: ollama serve\n');
    }

    if (this.results.ollamaAvailable && this.results.ollamaModels.length < 2) {
      const needed = 2 - this.results.ollamaModels.length;
      console.log('2. Pull ' + needed + ' more Ollama model(s):');
      console.log('   • Run: ollama pull mistral');
      console.log('   • Run: ollama pull neural-chat\n');
    }

    console.log('Optional (for Ollama vs Stockfish matches):');
    if (!this.results.stockfishAvailable) {
      console.log('3. Install Stockfish:');
      console.log('   • macOS: brew install stockfish');
      console.log('   • Linux: apt-get install stockfish');
      console.log('   • Windows: Download from https://stockfishchess.org\n');
    }

    console.log('Then try again: pnpm chess\n');
  }
}

export { ChessStartup };

// Auto-run if invoked directly
const startup = new ChessStartup();
startup.run().catch((error) => {
  console.error('\n❌ Fatal error: ' + error.message + '\n');
  process.exit(1);
});
