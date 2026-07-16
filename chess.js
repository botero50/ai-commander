#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChessUI } from './ui.js';

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

    this.ui = new ChessUI();
  }

  async run() {
    try {
      console.clear?.();
      this.ui.displayBanner();
      this.ui.displaySectionHeader('Startup Diagnostics');

      // Step 1: Verify Node
      await this.ui.displayCheckAnimated('  Node.js version', () => this.verifyNode());

      // Step 2: Verify Ollama
      await this.ui.displayCheckAnimated('  Ollama connection', () => this.verifyOllama());

      // Step 3: Verify Models
      if (this.results.ollamaAvailable) {
        await this.ui.displayCheckAnimated('  Ollama models', () => this.verifyOllamaModels());
      }

      // Step 4: Verify Stockfish
      await this.ui.displayCheckAnimated('  Stockfish engine', () => this.verifyStockfish());

      // Step 5: Create default config
      await this.ui.displayCheckAnimated('  Default config', () => this.createDefaultConfig());

      // Final status
      if (!this.isReadyToLaunch()) {
        await this.printRecoveryInstructions();
        process.exit(1);
      }

      this.ui.displayArenaReady();
      this.ui.displayLaunchMessage();

      // Import and launch the arena
      const { ChessArena } = await import('./arena.js');
      const arena = new ChessArena();
      await arena.run();
    } catch (error) {
      this.ui.displayError('Startup Failed', error.message);
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

    return { success: true, value: 'v' + version };
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
      return { success: true, value: 'Connected' };
    } catch (error) {
      this.results.ollamaAvailable = false;
      return { success: false, error: 'Failed' };
    }
  }

  async verifyOllamaModels() {
    if (!this.results.ollamaAvailable) {
      return { success: false, error: 'Ollama unavailable' };
    }

    try {
      const response = await fetch(this.config.ollamaEndpoint + '/api/tags', {
        signal: AbortSignal.timeout(this.config.stockfishTimeout),
      });
      const data = await response.json();
      this.results.ollamaModels = (data.models || []).map((m) => m.name);
      return { success: true, value: this.results.ollamaModels.length + ' available' };
    } catch (error) {
      this.results.ollamaModels = [];
      return { success: false, error: 'Failed to fetch models' };
    }
  }

  async verifyStockfish() {
    try {
      const { stdout } = await execPromise('stockfish --version 2>&1 || echo ""', { timeout: 5000 });

      if (stdout.includes('Stockfish')) {
        this.results.stockfishAvailable = true;
        return { success: true, value: 'Available' };
      }

      this.results.stockfishAvailable = false;
      return { success: false, error: 'Not found' };
    } catch (error) {
      this.results.stockfishAvailable = false;
      return { success: false, error: 'Not found' };
    }
  }

  async createDefaultConfig() {
    const configPath = path.join(process.cwd(), 'chess-arena-config.json');

    // Parse brain configuration from .env
    const brainP1 = (process.env.BRAIN_P1 || 'ollama:tinyllama').split(':');
    const brainP2 = (process.env.BRAIN_P2 || 'ollama:mistral').split(':');

    const p1Provider = brainP1[0] || 'ollama';
    const p1Model = brainP1[1] || this.results.ollamaModels[0] || 'tinyllama';
    const p2Provider = brainP2[0] || 'ollama';
    const p2Model = brainP2[1] || this.results.ollamaModels[1] || 'mistral';

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
          name: p1Provider === 'ollama' ? 'Ollama' : p1Provider.charAt(0).toUpperCase() + p1Provider.slice(1),
          provider: p1Provider,
          model: p1Model,
          personality: 'balanced',
        },
        {
          id: 'player-2',
          name: p2Provider === 'ollama' ? 'Ollama' : p2Provider.charAt(0).toUpperCase() + p2Provider.slice(1),
          provider: p2Provider,
          model: p2Model,
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
    } else {
      // Always update with latest env values
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    this.results.configPath = configPath;
    return { success: true, value: 'Created' };
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

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n' + '═'.repeat(60));
  console.log('  Arena Stopped');
  console.log('═'.repeat(60));
  process.exit(0);
});

// Auto-run if invoked directly
const startup = new ChessStartup();
startup.run().catch((error) => {
  console.error('\n❌ Fatal error: ' + error.message + '\n');
  process.exit(1);
});
