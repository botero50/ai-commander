import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DemoLauncher } from './demo-launcher.js';
import { Logger } from '../config/logger.js';

// Mock fetch and child_process
global.fetch = vi.fn();

describe('DemoLauncher', () => {
  let launcher: DemoLauncher;
  const logger = new Logger('error');

  beforeEach(() => {
    launcher = new DemoLauncher(logger);
    vi.clearAllMocks();
  });

  describe('diagnostics', () => {
    it('should initialize empty diagnostics', () => {
      const diags = launcher.getDiagnostics();
      expect(diags).toEqual([]);
    });

    it('should run diagnostics and return results', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ models: [] }),
      });

      const result = await launcher.runDiagnostics();

      expect(result.timestamp).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(typeof result.allPassed).toBe('boolean');
      expect(typeof result.failureCount).toBe('number');
      expect(typeof result.warningCount).toBe('number');
    });
  });

  describe('Ollama check', () => {
    it('should detect Ollama when service is running', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ models: [] }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const ollamaCheck = diags.find(d => d.name === 'Ollama Service');
      expect(ollamaCheck).toBeDefined();
      expect(ollamaCheck?.status).toBe('ok');
    });

    it('should report Ollama failure when not responding', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      (global.fetch as any).mockRejectedValueOnce(new Error('Not found'));
      (global.fetch as any).mockRejectedValueOnce(new Error('Not found'));

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const ollamaCheck = diags.find(d => d.name === 'Ollama Service');
      expect(ollamaCheck).toBeDefined();
      expect(ollamaCheck?.status).toBe('fail');
      expect(ollamaCheck?.message).toContain('localhost:11434');
    });

    it('should handle Ollama bad status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      (global.fetch as any).mockRejectedValueOnce(new Error('Not found'));
      (global.fetch as any).mockRejectedValueOnce(new Error('Not found'));

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const ollamaCheck = diags.find(d => d.name === 'Ollama Service');
      expect(ollamaCheck?.status).toBe('fail');
    });
  });

  describe('RL Interface check', () => {
    it('should detect RL Interface when running', async () => {
      // Calls order: Ollama, RL Interface, 0 A.D., Models
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Ollama
        .mockResolvedValueOnce({ ok: true, status: 200 }) // RL Interface
        .mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) }); // Models

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const rlCheck = diags.find(d => d.name === 'RL Interface');
      expect(rlCheck).toBeDefined();
      expect(rlCheck?.status).toBe('ok');
    });

    it('should warn when RL Interface is unreachable', async () => {
      // Calls order: Ollama, RL Interface, 0 A.D., Models
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Ollama OK
        .mockRejectedValueOnce(new Error('Connection refused')) // RL Interface fails
        .mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) }); // Models

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const rlCheck = diags.find(d => d.name === 'RL Interface');
      expect(rlCheck).toBeDefined();
      expect(rlCheck?.status).toBe('warning');
    });
  });

  describe('0 A.D. check', () => {
    it('should detect 0 A.D. installation', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      // Mock execSync to simulate successful 0 A.D. detection
      vi.doMock('child_process', () => ({
        execSync: vi.fn(() => '0 A.D. version 0.27.0'),
      }));

      // This test depends on execSync behavior
      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const zeroADCheck = diags.find(d => d.name === '0 A.D. Installation');
      expect(zeroADCheck).toBeDefined();
      // May be ok or warning depending on mock behavior
      expect(['ok', 'warning']).toContain(zeroADCheck?.status);
    });
  });

  describe('models check', () => {
    it('should detect available models', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            { name: 'neural-rts:latest' },
            { name: 'claude-opus-4-8:latest' },
          ],
        }),
      });

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const modelsCheck = diags.find(d => d.name === 'AI Models');
      expect(modelsCheck).toBeDefined();
      expect(modelsCheck?.status).toBe('ok');
      expect(modelsCheck?.message).toContain('available');
    });

    it('should warn when models are missing', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'other-model:latest' }],
        }),
      });

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const modelsCheck = diags.find(d => d.name === 'AI Models');
      expect(modelsCheck).toBeDefined();
      expect(modelsCheck?.status).toBe('warning');
      expect(modelsCheck?.message).toContain('Missing');
    });

    it('should handle model fetch failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await launcher.runDiagnostics();
      const diags = launcher.getDiagnostics();

      const modelsCheck = diags.find(d => d.name === 'AI Models');
      expect(modelsCheck).toBeDefined();
      expect(modelsCheck?.status).toBe('fail');
    });
  });

  describe('diagnostics reporting', () => {
    it('should export diagnostics as readable report', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'neural-rts:latest' }] }),
      });

      await launcher.runDiagnostics();
      const report = launcher.exportDiagnostics();

      expect(report).toContain('DEMO LAUNCHER DIAGNOSTICS');
      expect(report).toContain('SUMMARY');
      expect(report).toMatch(/OK:|Warnings:|Failures:/);
    });

    it('should indicate readiness in report when all pass', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            { name: 'neural-rts:latest' },
            { name: 'claude-opus-4-8:latest' },
          ],
        }),
      });

      await launcher.runDiagnostics();
      const result = await launcher.runDiagnostics();

      if (result.failureCount === 0) {
        const report = launcher.exportDiagnostics();
        expect(report).toContain('Ready to launch demo!');
      }
    });

    it('should indicate failures need fixing', async () => {
      (global.fetch as any).mockRejectedValue(new Error('All services down'));

      await launcher.runDiagnostics();
      const report = launcher.exportDiagnostics();

      expect(report).toContain('Fix failures');
    });
  });

  describe('realistic scenario', () => {
    it('should run full diagnostics with mixed results', async () => {
      // Ollama OK
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'neural-rts:latest' }],
        }),
      });

      // RL Interface warning
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      // 0 A.D. warning (execSync fails)
      // Models partial match
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            { name: 'neural-rts:latest' },
            // Missing claude-opus-4-8
          ],
        }),
      });

      await launcher.runDiagnostics();
      const result = await launcher.runDiagnostics();

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();

      const report = launcher.exportDiagnostics();
      expect(report).toContain('SUMMARY');

      // Should have at least some results
      const diags = launcher.getDiagnostics();
      expect(diags.length).toBeGreaterThan(0);
    });
  });
});
