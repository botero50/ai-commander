/**
 * Test: Tournament Dashboard
 *
 * Validates:
 * 1. Dashboard state formatting
 * 2. Ranking display
 * 3. Match history
 * 4. Statistics aggregation
 * 5. Export formatting
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TournamentDashboard, formatTournamentExport } from './tournament-dashboard.js';
describe('Tournament Dashboard', () => {
    let dashboard;
    const mockResult = {
        tournamentId: 'tournament1',
        name: 'Test Tournament',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        duration: 3600000,
        totalMatches: 3,
        completedMatches: 3,
        matches: [
            {
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
                timestamp: Date.now() - 3000000,
            },
            {
                matchId: 'match2',
                brain1Id: 'brain1',
                brain2Id: 'brain3',
                winner: 'brain1',
                ticksRan: 100,
                duration: 5000,
                player1Commands: 50,
                player1Errors: 1,
                player2Commands: 40,
                player2Errors: 4,
                timestamp: Date.now() - 2000000,
            },
            {
                matchId: 'match3',
                brain1Id: 'brain2',
                brain2Id: 'brain3',
                winner: 'brain2',
                ticksRan: 100,
                duration: 5000,
                player1Commands: 48,
                player1Errors: 2,
                player2Commands: 40,
                player2Errors: 5,
                timestamp: Date.now() - 1000000,
            },
        ],
        rankings: [
            {
                brainId: 'brain1',
                name: 'Brain1',
                wins: 2,
                losses: 0,
                draws: 0,
                totalMatches: 2,
                winRate: 100,
                totalCommands: 100,
                totalErrors: 3,
                averageCommandsPerMatch: 50,
                averageErrorRate: 3,
            },
            {
                brainId: 'brain2',
                name: 'Brain2',
                wins: 1,
                losses: 1,
                draws: 0,
                totalMatches: 2,
                winRate: 50,
                totalCommands: 93,
                totalErrors: 5,
                averageCommandsPerMatch: 46.5,
                averageErrorRate: 5.38,
            },
            {
                brainId: 'brain3',
                name: 'Brain3',
                wins: 0,
                losses: 2,
                draws: 0,
                totalMatches: 2,
                winRate: 0,
                totalCommands: 80,
                totalErrors: 9,
                averageCommandsPerMatch: 40,
                averageErrorRate: 11.25,
            },
        ],
    };
    const mockEloRatings = [
        { brainId: 'brain1', rating: 1650, ratingHistory: [1600, 1625, 1650] },
        { brainId: 'brain2', rating: 1600, ratingHistory: [1600, 1615, 1600] },
        { brainId: 'brain3', rating: 1550, ratingHistory: [1600, 1575, 1550] },
    ];
    beforeEach(() => {
        dashboard = new TournamentDashboard('tournament1', 'Test Tournament');
        dashboard.updateFromResults(mockResult, mockEloRatings);
    });
    it('should initialize dashboard', () => {
        expect(dashboard).toBeDefined();
    });
    it('should update from tournament results', () => {
        const state = dashboard.getState();
        expect(state.name).toBe('Test Tournament');
        expect(state.totalMatches).toBe(3);
    });
    it('should format rankings with ratings', () => {
        const state = dashboard.getState();
        expect(state.rankings).toHaveLength(3);
        expect(state.rankings[0].name).toBe('Brain1');
        expect(state.rankings[0].wins).toBe(2);
        expect(state.rankings[0].rating).toBe(1650);
    });
    it('should show trend for rating changes', () => {
        const state = dashboard.getState();
        expect(state.rankings[0].trend).toBe('up'); // 1600 → 1650
        expect(state.rankings[2].trend).toBe('down'); // 1600 → 1550
    });
    it('should format win rates as percentages', () => {
        const state = dashboard.getState();
        expect(state.rankings[0].winRate).toBe('100%');
        expect(state.rankings[1].winRate).toBe('50%');
        expect(state.rankings[2].winRate).toBe('0%');
    });
    it('should include recent matches', () => {
        const state = dashboard.getState();
        expect(state.recentMatches).toHaveLength(3);
        expect(state.recentMatches[0].player1).toBe('Brain1');
        expect(state.recentMatches[0].player2).toBe('Brain2');
    });
    it('should determine match results correctly', () => {
        const state = dashboard.getState();
        expect(state.recentMatches[0].result).toBe('win'); // Brain1 vs Brain2, Brain1 wins
        expect(state.recentMatches[2].result).toBe('win'); // Brain2 vs Brain3, Brain2 wins
    });
    it('should get leader', () => {
        const leader = dashboard.getLeader();
        expect(leader).toBeDefined();
        expect(leader?.name).toBe('Brain1');
        expect(leader?.wins).toBe(2);
    });
    it('should calculate statistics', () => {
        const stats = dashboard.getStats();
        expect(stats).toBeDefined();
        expect(stats?.totalMatches).toBe(3);
        expect(stats?.totalCommands).toBe(273); // 100 + 93 + 80
        expect(stats?.topBrain).toBe('Brain1');
    });
    it('should show tournament status', () => {
        const state = dashboard.getState();
        expect(state.status).toBe('completed');
        expect(state.progress.completed).toBe(3);
        expect(state.progress.total).toBe(3);
        expect(state.progress.percentage).toBe(100);
    });
    it('should format duration', () => {
        const state = dashboard.getState();
        expect(state.duration).toContain('h'); // Should show hours for 1-hour tournament
    });
    it('should export tournament data', () => {
        const state = dashboard.getState();
        const exported = formatTournamentExport(state);
        expect(exported.tournament.id).toBe('tournament1');
        expect(exported.standings).toHaveLength(3);
        expect(exported.standings[0].record).toBe('2W-0L-0D');
        expect(exported.matches).toHaveLength(3);
    });
    it('should include recent matches only', () => {
        const state = dashboard.getState();
        // Should show last 10 matches (all 3 in this case)
        expect(state.recentMatches.length).toBeLessThanOrEqual(10);
    });
    it('should handle null stats for no matches', () => {
        const emptyDashboard = new TournamentDashboard('empty', 'Empty');
        const stats = emptyDashboard.getStats();
        expect(stats).toBeNull();
    });
    it('should format match duration', () => {
        const state = dashboard.getState();
        expect(state.recentMatches[0].duration).toBeDefined();
        expect(state.recentMatches[0].duration).toMatch(/\d+/);
    });
    it('should calculate average commands per match', () => {
        const stats = dashboard.getStats();
        expect(stats?.averageCommandsPerMatch).toBe(91);
    });
});
//# sourceMappingURL=tournament-dashboard.test.js.map