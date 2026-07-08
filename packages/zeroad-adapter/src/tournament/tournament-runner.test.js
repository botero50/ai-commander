/**
 * Test: Tournament Runner
 *
 * Validates:
 * 1. Round-robin match generation
 * 2. Result collection and recording
 * 3. Statistics calculation
 * 4. Ranking generation
 * 5. Progress tracking
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TournamentRunner } from './tournament-runner.js';
describe('Tournament Runner', () => {
    let runner;
    const mockBrains = [
        { id: 'brain1', name: 'Brain1', version: '1.0', brain: {} },
        { id: 'brain2', name: 'Brain2', version: '1.0', brain: {} },
        { id: 'brain3', name: 'Brain3', version: '1.0', brain: {} },
    ];
    beforeEach(() => {
        runner = new TournamentRunner({
            name: 'Test Tournament',
            brains: mockBrains,
            matchFormat: 'round_robin',
        });
    });
    it('should initialize tournament', () => {
        expect(runner.getTournamentId()).toBeDefined();
        expect(runner.getConfig().name).toBe('Test Tournament');
    });
    it('should generate round-robin matches', () => {
        const matches = runner.generateRoundRobinMatches();
        // 3 brains = 3 matches (1v2, 1v3, 2v3)
        expect(matches).toHaveLength(3);
        expect(matches[0][0].name).toBe('Brain1');
        expect(matches[0][1].name).toBe('Brain2');
        expect(matches[1][0].name).toBe('Brain1');
        expect(matches[1][1].name).toBe('Brain3');
        expect(matches[2][0].name).toBe('Brain2');
        expect(matches[2][1].name).toBe('Brain3');
    });
    it('should calculate expected match count for round-robin', () => {
        // 3 brains: 3*2/2 = 3 matches
        expect(runner.getExpectedMatchCount()).toBe(3);
    });
    it('should calculate expected match count for single elimination', () => {
        runner = new TournamentRunner({
            name: 'Test Tournament',
            brains: mockBrains,
            matchFormat: 'single_elimination',
        });
        // 3 brains: 3-1 = 2 matches (one semifinal, one final)
        expect(runner.getExpectedMatchCount()).toBe(2);
    });
    it('should record match results', () => {
        const result = {
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 2,
            player2Commands: 45,
            player2Errors: 3,
            timestamp: Date.now(),
        };
        runner.recordMatch(result);
        const matches = runner.getMatches();
        expect(matches).toHaveLength(1);
        expect(matches[0].winner).toBe('brain1');
    });
    it('should calculate brain statistics', () => {
        // Brain1 wins against Brain2
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 2,
            player2Commands: 45,
            player2Errors: 3,
            timestamp: Date.now(),
        });
        // Brain2 wins against Brain3
        runner.recordMatch({
            matchId: 'match2',
            brain1Id: 'brain2',
            brain2Id: 'brain3',
            winner: 'brain2',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 48,
            player1Errors: 1,
            player2Commands: 40,
            player2Errors: 4,
            timestamp: Date.now(),
        });
        const stats = runner.calculateStats();
        expect(stats).toHaveLength(3);
        const brain1Stats = stats.find((s) => s.brainId === 'brain1');
        expect(brain1Stats?.wins).toBe(1);
        expect(brain1Stats?.losses).toBe(0);
        expect(brain1Stats?.totalMatches).toBe(1);
        expect(brain1Stats?.totalCommands).toBe(50);
        expect(brain1Stats?.totalErrors).toBe(2);
        const brain2Stats = stats.find((s) => s.brainId === 'brain2');
        expect(brain2Stats?.wins).toBe(1);
        expect(brain2Stats?.losses).toBe(1);
        expect(brain2Stats?.totalMatches).toBe(2);
    });
    it('should calculate win rate correctly', () => {
        // Brain1 wins 2 out of 2 matches
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        runner.recordMatch({
            matchId: 'match2',
            brain1Id: 'brain1',
            brain2Id: 'brain3',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        const stats = runner.calculateStats();
        const brain1Stats = stats.find((s) => s.brainId === 'brain1');
        expect(brain1Stats?.winRate).toBe(100);
    });
    it('should rank brains by wins and win rate', () => {
        // Brain1: 2 wins, 0 losses
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        runner.recordMatch({
            matchId: 'match2',
            brain1Id: 'brain1',
            brain2Id: 'brain3',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        // Brain2: 1 win, 1 loss
        runner.recordMatch({
            matchId: 'match3',
            brain1Id: 'brain2',
            brain2Id: 'brain3',
            winner: 'brain2',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 48,
            player1Errors: 0,
            player2Commands: 40,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        const stats = runner.calculateStats();
        // Brain1 should be first (2 wins)
        expect(stats[0].brainId).toBe('brain1');
        expect(stats[0].wins).toBe(2);
        // Brain2 should be second (1 win)
        expect(stats[1].brainId).toBe('brain2');
        expect(stats[1].wins).toBe(1);
        // Brain3 should be last (0 wins)
        expect(stats[2].brainId).toBe('brain3');
        expect(stats[2].wins).toBe(0);
    });
    it('should track tournament progress', () => {
        expect(runner.getProgress().completed).toBe(0);
        expect(runner.getProgress().total).toBe(3);
        expect(runner.getProgress().percentage).toBe(0);
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        const progress = runner.getProgress();
        expect(progress.completed).toBe(1);
        expect(progress.percentage).toBe(33); // 1/3 ≈ 33%
    });
    it('should calculate average commands per match', () => {
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 100,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        runner.recordMatch({
            matchId: 'match2',
            brain1Id: 'brain1',
            brain2Id: 'brain3',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        const stats = runner.calculateStats();
        const brain1Stats = stats.find((s) => s.brainId === 'brain1');
        // (100 + 50) / 2 = 75
        expect(brain1Stats?.averageCommandsPerMatch).toBe(75);
    });
    it('should return tournament results', () => {
        runner.start();
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            winner: 'brain1',
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 45,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        runner.end();
        const results = runner.getResults();
        expect(results.tournamentId).toBeDefined();
        expect(results.name).toBe('Test Tournament');
        expect(results.completedMatches).toBe(1);
        expect(results.totalMatches).toBe(3);
        expect(results.rankings).toHaveLength(3);
        expect(results.duration).toBeGreaterThan(0);
    });
    it('should get brain by ID', () => {
        const brain = runner.getBrain('brain1');
        expect(brain?.name).toBe('Brain1');
    });
    it('should handle draws', () => {
        runner.recordMatch({
            matchId: 'match1',
            brain1Id: 'brain1',
            brain2Id: 'brain2',
            // No winner = draw
            ticksRan: 100,
            duration: 5000,
            player1Commands: 50,
            player1Errors: 0,
            player2Commands: 50,
            player2Errors: 0,
            timestamp: Date.now(),
        });
        const stats = runner.calculateStats();
        const brain1Stats = stats.find((s) => s.brainId === 'brain1');
        expect(brain1Stats?.wins).toBe(0);
        expect(brain1Stats?.draws).toBe(1);
        expect(brain1Stats?.losses).toBe(0);
    });
});
//# sourceMappingURL=tournament-runner.test.js.map