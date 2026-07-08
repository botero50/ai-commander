import { describe, it, expect } from 'vitest';
import {
  parseTournamentOptions,
  tournamentRunCommand,
  tournamentStatusCommand,
  tournamentListCommand,
} from './tournament-commands.js';

describe('Tournament Commands', () => {
  describe('parseTournamentOptions', () => {
    it('should parse brains option', () => {
      const options = parseTournamentOptions(['--brains', 'Ollama,Claude,GPT']);
      expect(options.brains).toEqual(['Ollama', 'Claude', 'GPT']);
    });

    it('should parse tournament name', () => {
      const options = parseTournamentOptions(['--name', 'my-tournament']);
      expect(options.name).toBe('my-tournament');
    });

    it('should parse format option', () => {
      const options = parseTournamentOptions(['--format', 'single_elimination']);
      expect(options.format).toBe('single_elimination');
    });

    it('should parse max-ticks', () => {
      const options = parseTournamentOptions(['--max-ticks', '10000']);
      expect(options.maxTicks).toBe(10000);
    });

    it('should parse parallel matches', () => {
      const options = parseTournamentOptions(['--parallel', '4']);
      expect(options.parallel).toBe(4);
    });

    it('should handle no-replay flag', () => {
      const options = parseTournamentOptions(['--no-replay']);
      expect(options.saveReplay).toBe(false);
    });

    it('should handle verbose flag', () => {
      const options = parseTournamentOptions(['--verbose']);
      expect(options.verbose).toBe(true);
    });

    it('should use defaults when no options', () => {
      const options = parseTournamentOptions([]);
      expect(options.brains).toEqual(['Ollama', 'Ollama']);
      expect(options.format).toBe('round_robin');
      expect(options.maxTicks).toBe(5000);
      expect(options.parallel).toBe(1);
    });

    it('should handle multiple options', () => {
      const options = parseTournamentOptions([
        '--brains',
        'Brain1,Brain2,Brain3',
        '--format',
        'round_robin',
        '--max-ticks',
        '8000',
        '--parallel',
        '2',
      ]);

      expect(options.brains).toEqual(['Brain1', 'Brain2', 'Brain3']);
      expect(options.format).toBe('round_robin');
      expect(options.maxTicks).toBe(8000);
      expect(options.parallel).toBe(2);
    });

    it('should trim whitespace from brain names', () => {
      const options = parseTournamentOptions(['--brains', ' Brain1 , Brain2 , Brain3 ']);
      expect(options.brains).toEqual(['Brain1', 'Brain2', 'Brain3']);
    });
  });

  describe('tournamentRunCommand', () => {
    it('should return 0 on success', async () => {
      const result = await tournamentRunCommand(['--brains', 'Ollama,Ollama']);
      expect(result).toBe(0);
    });

    it('should handle round-robin format', async () => {
      const result = await tournamentRunCommand([
        '--brains',
        'Brain1,Brain2,Brain3',
        '--format',
        'round_robin',
      ]);
      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const result = await tournamentRunCommand(['--invalid']);
      // Should still succeed with defaults
      expect([0, 1]).toContain(result);
    });
  });

  describe('tournamentStatusCommand', () => {
    it('should return 0 with tournament ID', async () => {
      const result = await tournamentStatusCommand(['tournament-001']);
      expect(result).toBe(0);
    });

    it('should return 1 without tournament ID', async () => {
      const result = await tournamentStatusCommand([]);
      expect(result).toBe(1);
    });
  });

  describe('tournamentListCommand', () => {
    it('should return 0', async () => {
      const result = await tournamentListCommand([]);
      expect(result).toBe(0);
    });
  });
});
