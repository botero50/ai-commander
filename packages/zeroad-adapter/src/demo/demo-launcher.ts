/**
 * Story 53.1 — Demo Launcher
 *
 * Verify all dependencies and perform fail-fast diagnostics.
 * Prerequisites: Ollama running, RL Interface available, 0 A.D. installed, models loaded.
 */

import { Logger } from '../config/logger.js';

export interface DiagnosticResult {
  name: string;
  status: 'ok' | 'fail' | 'warning';
  message: string;
  details?: Record<string, any>;
}

export interface LaunchDiagnostics {
  timestamp: string;
  results: DiagnosticResult[];
  allPassed: boolean;
  failureCount: number;
  warningCount: number;
}

export class DemoLauncher {
  private logger: Logger;
  private diagnostics: DiagnosticResult[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Run full diagnostics before launch
   */
  async runDiagnostics(): Promise<LaunchDiagnostics> {
    this.diagnostics = [];

    this.logger.info('Starting diagnostics...');

    // Check Ollama
    await this.checkOllama();

    // Check RL Interface
    await this.checkRLInterface();

    // Check 0 A.D.
    await this.checkZeroAD();

    // Check required models
    await this.checkModels();

    // Compile results
    const failureCount = this.diagnostics.filter(d => d.status === 'fail').length;
    const warningCount = this.diagnostics.filter(d => d.status === 'warning').length;
    const allPassed = failureCount === 0;

    this.logger.info('Diagnostics complete', {
      total: this.diagnostics.length,
      failures: failureCount,
      warnings: warningCount,
    });

    return {
      timestamp: new Date().toISOString(),
      results: this.diagnostics,
      allPassed,
      failureCount,
      warningCount,
    };
  }

  /**
   * Check Ollama service
   */
  private async checkOllama(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        timeout: 5000,
      } as any);

      if (response.ok) {
        this.diagnostics.push({
          name: 'Ollama Service',
          status: 'ok',
          message: 'Ollama is running and responding',
        });
      } else {
        this.diagnostics.push({
          name: 'Ollama Service',
          status: 'fail',
          message: `Ollama returned status ${response.status}`,
        });
      }
    } catch (error) {
      this.diagnostics.push({
        name: 'Ollama Service',
        status: 'fail',
        message: 'Cannot connect to Ollama on localhost:11434',
        details: {
          error: error instanceof Error ? error.message : String(error),
          hint: 'Run: ollama serve',
        },
      });
    }
  }

  /**
   * Check RL Interface availability
   */
  private async checkRLInterface(): Promise<void> {
    try {
      const response = await fetch('http://localhost:6379/health', {
        timeout: 5000,
      } as any);

      if (response.ok) {
        this.diagnostics.push({
          name: 'RL Interface',
          status: 'ok',
          message: 'RL Interface is running',
        });
      } else {
        this.diagnostics.push({
          name: 'RL Interface',
          status: 'warning',
          message: 'RL Interface available but health check returned non-OK status',
          details: { status: response.status },
        });
      }
    } catch (error) {
      this.diagnostics.push({
        name: 'RL Interface',
        status: 'warning',
        message: 'Cannot connect to RL Interface on localhost:6379',
        details: {
          error: error instanceof Error ? error.message : String(error),
          hint: 'RL Interface required for live game control',
        },
      });
    }
  }

  /**
   * Check 0 A.D. installation
   */
  private async checkZeroAD(): Promise<void> {
    try {
      // Try to detect 0 A.D. binary in common locations
      const { execSync } = await import('child_process');

      try {
        // Try to get version
        const output = execSync('pyrogenesis -version 2>&1', {
          timeout: 3000,
          encoding: 'utf-8',
        } as any);

        if (output.includes('0 A.D.')) {
          this.diagnostics.push({
            name: '0 A.D. Installation',
            status: 'ok',
            message: '0 A.D. is installed and accessible',
            details: { version: output.split('\n')[0] },
          });
        } else {
          this.diagnostics.push({
            name: '0 A.D. Installation',
            status: 'warning',
            message: '0 A.D. found but version unclear',
            details: { output: output.substring(0, 100) },
          });
        }
      } catch (innerError) {
        this.diagnostics.push({
          name: '0 A.D. Installation',
          status: 'warning',
          message: 'Cannot execute pyrogenesis binary',
          details: {
            hint: 'Ensure 0 A.D. is installed and in PATH',
            error: innerError instanceof Error ? innerError.message : String(innerError),
          },
        });
      }
    } catch (error) {
      this.diagnostics.push({
        name: '0 A.D. Installation',
        status: 'warning',
        message: 'Unable to check 0 A.D. installation',
        details: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Check required AI models
   */
  private async checkModels(): Promise<void> {
    const requiredModels = ['neural-rts', 'claude-opus-4-8'];

    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        timeout: 5000,
      } as any);

      if (!response.ok) {
        this.diagnostics.push({
          name: 'AI Models',
          status: 'fail',
          message: 'Cannot fetch model list from Ollama',
        });
        return;
      }

      const data = (await response.json()) as any;
      const availableModels = data.models ? data.models.map((m: any) => m.name) : [];

      const missingModels = requiredModels.filter(
        m => !availableModels.some((am: string) => am.includes(m))
      );

      if (missingModels.length === 0) {
        this.diagnostics.push({
          name: 'AI Models',
          status: 'ok',
          message: `All required models available (${availableModels.length} total)`,
          details: { models: availableModels },
        });
      } else {
        this.diagnostics.push({
          name: 'AI Models',
          status: 'warning',
          message: `Missing models: ${missingModels.join(', ')}`,
          details: {
            available: availableModels,
            missing: missingModels,
            hint: 'Run: ollama pull <model-name>',
          },
        });
      }
    } catch (error) {
      this.diagnostics.push({
        name: 'AI Models',
        status: 'fail',
        message: 'Cannot check AI models (Ollama not available)',
      });
    }
  }

  /**
   * Get the current diagnostics
   */
  getDiagnostics(): DiagnosticResult[] {
    return [...this.diagnostics];
  }

  /**
   * Export diagnostics as report
   */
  exportDiagnostics(): string {
    const report = ['=== DEMO LAUNCHER DIAGNOSTICS ===', ''];

    let okCount = 0;
    let failCount = 0;
    let warnCount = 0;

    for (const diag of this.diagnostics) {
      const icon = diag.status === 'ok' ? '✓' : diag.status === 'fail' ? '✗' : '⚠';
      report.push(`${icon} ${diag.name}: ${diag.status.toUpperCase()}`);
      report.push(`  ${diag.message}`);

      if (diag.details) {
        if (diag.details.hint) {
          report.push(`  Hint: ${diag.details.hint}`);
        }
        if (diag.details.error) {
          report.push(`  Error: ${diag.details.error}`);
        }
      }

      report.push('');

      if (diag.status === 'ok') okCount++;
      else if (diag.status === 'fail') failCount++;
      else warnCount++;
    }

    report.push('=== SUMMARY ===');
    report.push(`OK: ${okCount}, Warnings: ${warnCount}, Failures: ${failCount}`);

    if (failCount === 0) {
      report.push('Ready to launch demo!');
    } else {
      report.push('Fix failures before launching demo.');
    }

    return report.join('\n');
  }
}
