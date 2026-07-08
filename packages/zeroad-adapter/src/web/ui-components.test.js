/**
 * Test: UI Components
 *
 * Validates:
 * 1. Duration formatting
 * 2. Match status formatting
 * 3. Decision formatting
 * 4. Statistics formatting
 * 5. Color selection
 * 6. Text utilities
 */
import { describe, it, expect } from 'vitest';
import { formatDuration, formatMatchStatus, formatDecision, formatPlayerStats, getStatusColor, getTrendColor, getPlayerColor, truncateText, formatNumber, getProgressWidth, } from './ui-components.js';
describe('UI Components - Duration Formatting', () => {
    it('should format milliseconds', () => {
        expect(formatDuration(250)).toBe('250ms');
        expect(formatDuration(999)).toBe('999ms');
    });
    it('should format seconds', () => {
        expect(formatDuration(1000)).toBe('1s');
        expect(formatDuration(5000)).toBe('5s');
    });
    it('should format minutes and seconds', () => {
        expect(formatDuration(60000)).toBe('1m 0s');
        expect(formatDuration(83000)).toBe('1m 23s');
        expect(formatDuration(120000)).toBe('2m 0s');
    });
    it('should handle zero', () => {
        expect(formatDuration(0)).toBe('0ms');
    });
});
describe('UI Components - Match Status Formatting', () => {
    it('should format active match status', () => {
        const state = {
            matchId: 'match1',
            status: 'running',
            brain1: 'Brain1',
            brain2: 'Brain2',
            currentTick: 50,
            totalTicks: 100,
            duration: 5000,
        };
        const formatted = formatMatchStatus(state);
        expect(formatted.matchId).toBe('match1');
        expect(formatted.status).toBe('running');
        expect(formatted.brain1).toBe('Brain1');
        expect(formatted.currentTick).toBe(50);
        expect(formatted.progress).toBe(50);
        expect(formatted.isActive).toBe(true);
    });
    it('should calculate progress correctly', () => {
        const state = {
            currentTick: 25,
            totalTicks: 100,
        };
        const formatted = formatMatchStatus(state);
        expect(formatted.progress).toBe(25);
    });
    it('should cap progress at 100', () => {
        const state = {
            currentTick: 150,
            totalTicks: 100,
        };
        const formatted = formatMatchStatus(state);
        expect(formatted.progress).toBe(100);
    });
    it('should handle completed status', () => {
        const state = {
            status: 'completed',
            winner: 'Brain1',
        };
        const formatted = formatMatchStatus(state);
        expect(formatted.isActive).toBe(false);
        expect(formatted.winner).toBe('Brain1');
    });
});
describe('UI Components - Decision Formatting', () => {
    it('should format decision with all fields', () => {
        const decision = {
            tick: 1,
            timestamp: Date.now(),
            player: 'player1',
            brainName: 'Brain1',
            reasoning: 'Attack enemy',
            commands: ['move', 'attack'],
            commandCount: 2,
            durationMs: 250,
        };
        const formatted = formatDecision(decision);
        expect(formatted.tick).toBe(1);
        expect(formatted.player).toBe('Player 1');
        expect(formatted.brain).toBe('Brain1');
        expect(formatted.reasoning).toBe('Attack enemy');
        expect(formatted.commandCount).toBe(2);
        expect(formatted.commands).toBe('move, attack');
        expect(formatted.duration).toBe('250ms');
    });
    it('should handle player2', () => {
        const decision = {
            tick: 2,
            timestamp: Date.now(),
            player: 'player2',
            brainName: 'Brain2',
            reasoning: 'Defend',
            commands: ['build_wall'],
            commandCount: 1,
            durationMs: 100,
        };
        const formatted = formatDecision(decision);
        expect(formatted.player).toBe('Player 2');
    });
    it('should handle missing reasoning', () => {
        const decision = {
            tick: 1,
            timestamp: Date.now(),
            player: 'player1',
            brainName: 'Brain1',
            commands: [],
            commandCount: 0,
            durationMs: 50,
        };
        const formatted = formatDecision(decision);
        expect(formatted.reasoning).toBe('(no reasoning)');
        expect(formatted.commands).toBe('(no commands)');
    });
});
describe('UI Components - Statistics Formatting', () => {
    it('should format player statistics', () => {
        const stats = formatPlayerStats('Brain1', 50, 2, 100);
        expect(stats.name).toBe('Brain1');
        expect(stats.commands).toBe(50);
        expect(stats.errors).toBe(2);
        expect(stats.commandsPerTick).toBe(0.5);
        expect(stats.errorRate).toBe(4); // 2/50 = 4%
    });
    it('should calculate correct error rate', () => {
        const stats = formatPlayerStats('Brain1', 100, 10, 100);
        expect(stats.errorRate).toBe(10); // 10/100 = 10%
    });
    it('should handle zero commands', () => {
        const stats = formatPlayerStats('Brain1', 0, 0, 100);
        expect(stats.errorRate).toBe(0);
    });
    it('should handle zero ticks', () => {
        const stats = formatPlayerStats('Brain1', 50, 2, 0);
        expect(stats.commandsPerTick).toBe(0);
    });
});
describe('UI Components - Colors', () => {
    it('should return correct status colors', () => {
        expect(getStatusColor('starting')).toBe('#FFA500');
        expect(getStatusColor('running')).toBe('#00FF00');
        expect(getStatusColor('completed')).toBe('#0000FF');
        expect(getStatusColor('unknown')).toBe('#808080');
    });
    it('should return correct trend colors', () => {
        expect(getTrendColor('increasing')).toBe('#00FF00');
        expect(getTrendColor('decreasing')).toBe('#FF0000');
        expect(getTrendColor('stable')).toBe('#FFFF00');
    });
    it('should return correct player colors', () => {
        expect(getPlayerColor('player1')).toBe('#FF6B6B');
        expect(getPlayerColor('player2')).toBe('#4ECDC4');
    });
});
describe('UI Components - Text Utilities', () => {
    it('should truncate long text', () => {
        expect(truncateText('Hello World', 5)).toBe('He...');
        expect(truncateText('Hi', 5)).toBe('Hi');
        expect(truncateText('Testing truncation', 10)).toBe('Testing ...');
    });
    it('should format numbers with separators', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1000000)).toBe('1,000,000');
        expect(formatNumber(50)).toBe('50');
    });
    it('should calculate progress width', () => {
        expect(getProgressWidth(50, 100)).toBe(50);
        expect(getProgressWidth(25, 100)).toBe(25);
        expect(getProgressWidth(150, 100)).toBe(100); // Capped at 100
        expect(getProgressWidth(0, 100)).toBe(0);
    });
    it('should handle division by zero', () => {
        expect(getProgressWidth(50, 0)).toBe(0);
    });
});
//# sourceMappingURL=ui-components.test.js.map