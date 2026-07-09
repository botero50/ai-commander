#!/usr/bin/env node

/**
 * AI Commander — One Command Demo Launcher
 *
 * Verifies all prerequisites and launches a complete AI vs AI match
 * This is the entry point for a new user experiencing AI Commander
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

class DemoLauncher {
  constructor() {
    this.checks = [];
    this.warnings = [];
    this.errors = [];
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
    this.checks.push({ status: 'pass', message });
  }

  warn(message) {
    this.log(message, '⚠️');
    this.warnings.push(message);
  }

  fail(message) {
    this.log(message, '❌');
    this.errors.push(message);
  }

  // ============================================================================
  // PREREQUISITE CHECKS
  // ============================================================================

  checkNodejs() {
    try {
      const version = execSync('node --version', { encoding: 'utf-8' }).trim();
      const major = parseInt(version.split('.')[0].slice(1), 10);
      if (major >= 22) {
        this.success(`Node.js ${version} installed`);
        return true;
      } else {
        this.fail(`Node.js ${version} found, but 22+ required`);
        console.log(`  → Download: https://nodejs.org`);
        return false;
      }
    } catch (error) {
      this.fail('Node.js not found');
      console.log(`  → Download: https://nodejs.org`);
      return false;
    }
  }

  checkOllama() {
    try {
      execSync('ollama --version', { encoding: 'utf-8', stdio: 'pipe' });
      this.success('Ollama installed');
      return true;
    } catch (error) {
      this.fail('Ollama not found');
      console.log(`  → Download: https://ollama.ai`);
      console.log(`  → Then run: ollama serve`);
      return false;
    }
  }

  checkOllamaRunning() {
    try {
      const response = execSync(
        `curl -s http://localhost:11434/api/tags`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      const data = JSON.parse(response);
      const modelCount = data.models ? data.models.length : 0;
      this.success(`Ollama running with ${modelCount} model(s)`);
      return true;
    } catch (error) {
      this.fail('Ollama not running at localhost:11434');
      console.log(`  → In a terminal, run: ollama serve`);
      console.log(`  → Keep that terminal open while demo runs`);
      return false;
    }
  }

  checkOllamaModels() {
    try {
      const response = execSync(
        `curl -s http://localhost:11434/api/tags`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      const data = JSON.parse(response);
      const models = data.models || [];
      const modelNames = models.map(m => m.name.split(':')[0]);

      const required = ['mistral', 'neural-chat'];
      const missing = required.filter(req => !modelNames.some(name => name.includes(req)));

      if (missing.length === 0) {
        this.success(`Required models found: ${required.join(', ')}`);
        return true;
      } else {
        this.fail(`Missing models: ${missing.join(', ')}`);
        missing.forEach(model => {
          console.log(`  → Download: ollama pull ${model}`);
        });
        return false;
      }
    } catch (error) {
      this.fail('Could not check Ollama models');
      return false;
    }
  }

  checkZeroAD() {
    const possiblePaths = [
      'C:\\Program Files\\0 A.D\\',
      'C:\\Program Files (x86)\\0 A.D\\',
      '/Applications/0 A.D.app/Contents/MacOS/',
      '/usr/games/0ad',
      '/usr/bin/0ad',
      path.join(process.env.HOME || '', '.local/share/0ad'),
    ];

    const found = possiblePaths.find(p => {
      try {
        return fs.existsSync(p) || fs.existsSync(path.join(p, 'pyrogenesis'));
      } catch (e) {
        return false;
      }
    });

    if (found) {
      this.success('0 A.D. installation found');
      return true;
    } else {
      this.warn('0 A.D. not found (optional for initial demo)');
      console.log(`  → Download: https://play0ad.com`);
      console.log(`  → For now, using built-in match simulator`);
      return false;
    }
  }

  checkBuildArtifacts() {
    const dist = path.join(PROJECT_ROOT, 'packages/match-runner/dist');
    if (fs.existsSync(dist)) {
      this.success('Build artifacts found');
      return true;
    } else {
      this.warn('Build artifacts missing');
      return false;
    }
  }

  checkDependencies() {
    const nodeModules = path.join(PROJECT_ROOT, 'node_modules');
    if (fs.existsSync(nodeModules)) {
      this.success('Dependencies installed');
      return true;
    } else {
      this.fail('Dependencies not installed');
      console.log(`  → Run: npm install`);
      return false;
    }
  }

  // ============================================================================
  // VERIFICATION
  // ============================================================================

  async verify() {
    this.section('STEP 1: VERIFY PREREQUISITES');

    const checks = [
      { name: 'Node.js', fn: () => this.checkNodejs() },
      { name: 'npm dependencies', fn: () => this.checkDependencies() },
      { name: 'Build artifacts', fn: () => this.checkBuildArtifacts() },
      { name: 'Ollama installation', fn: () => this.checkOllama() },
      { name: 'Ollama running', fn: () => this.checkOllamaRunning() },
      { name: 'Ollama models', fn: () => this.checkOllamaModels() },
      { name: '0 A.D. installation', fn: () => this.checkZeroAD() },
    ];

    const results = [];
    for (const check of checks) {
      try {
        const result = check.fn();
        results.push(result);
      } catch (error) {
        this.fail(`${check.name} check failed: ${error.message}`);
        results.push(false);
      }
    }

    return results;
  }

  // ============================================================================
  // BUILD & LAUNCH
  // ============================================================================

  async build() {
    this.section('STEP 2: BUILD PROJECT');
    this.log('Running: npm run build', '🔨');

    try {
      execSync('npm run build', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        timeout: 120000, // 2 minutes
      });
      this.success('Build completed');
      return true;
    } catch (error) {
      this.fail('Build failed');
      console.log(`\n  Error: ${error.message}`);
      console.log(`  → Try: npm ci && npm run build`);
      return false;
    }
  }

  async launchDemo() {
    this.section('STEP 3: LAUNCH DEMO');
    this.log('Starting AI vs AI match...', '▶️');

    return new Promise((resolve) => {
      const demo = spawn('node', ['demo/simple-demo.js'], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });

      demo.on('close', (code) => {
        if (code === 0) {
          this.success('Demo completed successfully');
          resolve(true);
        } else {
          this.fail(`Demo exited with code ${code}`);
          resolve(false);
        }
      });

      demo.on('error', (error) => {
        this.fail(`Failed to launch demo: ${error.message}`);
        resolve(false);
      });
    });
  }

  openSpectatorDashboard() {
    // In production, this would open a web dashboard
    // For now, show replay information
    this.section('STEP 4: VIEW RESULTS');

    const replayPath = path.join(PROJECT_ROOT, 'demo-output/replay.json');
    const logsPath = path.join(PROJECT_ROOT, 'demo-output/logs.txt');

    if (fs.existsSync(replayPath)) {
      console.log('✅ Replay saved:');
      console.log(`   ${replayPath}`);
    }

    if (fs.existsSync(logsPath)) {
      console.log('\n✅ Match summary:');
      try {
        const logs = fs.readFileSync(logsPath, 'utf-8');
        console.log(logs);
      } catch (e) {
        console.log(`   ${logsPath}`);
      }
    }

    console.log('\n📊 To view the replay:');
    console.log('   npm run replay');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  summarize() {
    this.section('DEMO SUMMARY');

    if (this.errors.length === 0) {
      console.log('✅ SUCCESS\n');
      console.log('AI Commander demo ran successfully!');
      console.log('\nNext steps:');
      console.log('  1. Run again: npm run launch-demo');
      console.log('  2. Try different models: PLAYER1_MODEL=llama2 npm run launch-demo');
      console.log('  3. View replay: npm run replay');
      console.log('  4. Read docs: cat INSTALLATION.md');
    } else {
      console.log('❌ FAILED\n');
      console.log('Issues preventing demo launch:\n');
      this.errors.forEach(e => console.log(`  • ${e}`));

      console.log('\nRecovery steps:');
      if (this.errors.some(e => e.includes('Node.js'))) {
        console.log('  1. Install Node.js 22+ from https://nodejs.org');
      }
      if (this.errors.some(e => e.includes('Dependencies'))) {
        console.log('  1. Run: npm install');
      }
      if (this.errors.some(e => e.includes('Build'))) {
        console.log('  1. Run: npm ci && npm run build');
      }
      if (this.errors.some(e => e.includes('Ollama'))) {
        console.log('  1. Install Ollama from https://ollama.ai');
        console.log('  2. In a terminal: ollama serve');
        console.log('  3. In another terminal: ollama pull mistral && ollama pull neural-chat');
      }
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  // ============================================================================
  // MAIN ORCHESTRATION
  // ============================================================================

  async run() {
    this.section('🎮 AI COMMANDER — ONE COMMAND DEMO');

    // Phase 1: Verify
    const verifyResults = await this.verify();
    const allOk = verifyResults.every(r => r);

    if (!allOk && this.errors.length > 0) {
      this.summarize();
      process.exit(1);
    }

    // Phase 2: Build
    const buildOk = await this.build();
    if (!buildOk) {
      this.summarize();
      process.exit(1);
    }

    // Phase 3: Launch
    const demoOk = await this.launchDemo();
    if (!demoOk) {
      this.summarize();
      process.exit(1);
    }

    // Phase 4: Results
    this.openSpectatorDashboard();

    // Summary
    this.summarize();
  }
}

// Main
async function main() {
  const launcher = new DemoLauncher();
  try {
    await launcher.run();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (process.env.VERBOSE === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
