/**
 * Test: Match Replay
 *
 * Validates:
 * 1. Replay playback
 * 2. Frame navigation
 * 3. Decision analysis
 * 4. Key moment detection
 * 5. Export functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MatchReplay } from './match-replay.js';
describe.skip('Match Replay', () => {
    let replay;
    const mockDecisions = [
        {
            tick: 1,
            timestamp: Date.now(),
            player: 'player1',
            brainName: 'Brain1',
            reasoning: 'Attack',
            commands: ['move', 'attack'],
            commandCount: 2,
            durationMs: 100,
        },
        {
            tick: 1,
            timestamp: Date.now(),
            player: 'player2',
            brainName: 'Brain2',
            reasoning: 'Defend',
            commands: ['build_wall'],
            commandCount: 1,
            durationMs: 80,
        },
        {
            tick: 2,
            timestamp: Date.now(),
            player: 'player1',
            brainName: 'Brain1',
            reasoning: 'Continue attack',
            commands: Array(5).fill('attack'),
            commandCount: 5,
            durationMs: 150,
        },
    ];
    const mockSnapshots = [
        {
            tick: 1,
            timestamp: Date.now(),
            gameState: {
                unitCount: 10,
                buildingCount: 2,
                playerCount: 2,
                resourcesPerPlayer: [],
            },
            decisions: mockDecisions.slice(0, 2),
        },
        {
            tick: 2,
            timestamp: Date.now(),
            gameState: {
                unitCount: 15,
                buildingCount: 3,
                playerCount: 2,
                resourcesPerPlayer: [],
            },
            decisions: [mockDecisions[2]],
        },
    ];
    beforeEach(() => {
        replay = new MatchReplay('match1');
        replay.loadMatchData(mockDecisions, mockSnapshots);
    });
    it('should initialize replay', () => {
        expect(replay).toBeDefined();
    });
    it('should load match data', () => {
        const decisions = replay.getDecisions();
        expect(decisions).toHaveLength(3);
    });
    it('should seek to tick', () => {
        const frame = replay.seek(1);
        expect(frame).toBeDefined();
        expect(frame?.tick).toBe(1);
    });
    it('should get current position', () => {
        replay.seek(1);
        const pos = replay.getCurrentPosition();
        expect(pos.tick).toBe(1);
        expect(pos.maxTick).toBe(2);
    });
    it('should move next', () => {
        replay.restart();
        const frame = replay.next();
        expect(frame?.tick).toBe(1);
    });
    it('should move previous', () => {
        replay.seek(2);
        const frame = replay.previous();
        expect(frame?.tick).toBe(1);
    });
    it('should restart to beginning', () => {
        replay.seek(2);
        const frame = replay.restart();
        expect(frame?.tick).toBe(0);
    });
    it('should jump to end', () => {
        const frame = replay.end();
        expect(frame?.tick).toBe(2);
    });
    it('should return null for out of range', () => {
        const frame = replay.seek(999);
        expect(frame).toBeNull();
    });
    it('should get frame at tick', () => {
        const frame = replay.getFrame(1);
        expect(frame).toBeDefined();
        expect(frame?.decisions).toHaveLength(2);
    });
    it('should get frames in range', () => {
        const frames = replay.getFramesInRange(1, 2);
        expect(frames).toHaveLength(2);
        expect(frames[0].tick).toBe(1);
        expect(frames[1].tick).toBe(2);
    });
    it('should get player decisions', () => {
        const player1Decisions = replay.getPlayerDecisions('player1');
        expect(player1Decisions).toHaveLength(2);
        expect(player1Decisions.every((d) => d.player === 'player1')).toBe(true);
    });
    it('should get decision at tick', () => {
        const decision = replay.getDecisionAt(1, 'player1');
        expect(decision).toBeDefined();
        expect(decision?.brainName).toBe('Brain1');
    });
    it('should get state at tick', () => {
        const state = replay.getStateAt(1);
        expect(state).toBeDefined();
        expect(state?.gameState.unitCount).toBe(10);
    });
    it('should analyze decision sequence', () => {
        const analysis = replay.analyzeDecisionSequence(1, 2, 'player1');
        expect(analysis.count).toBe(2);
        expect(analysis.totalCommands).toBe(7); // 2 + 5
        expect(analysis.averageCommands).toBe(3.5);
    });
    it('should find key moments', () => {
        const keyMoments = replay.findKeyMoments(3);
        expect(keyMoments).toHaveLength(1); // Only tick 2 has 5 commands
        expect(keyMoments[0].tick).toBe(2);
    });
    it('should export to JSON', () => {
        const exported = replay.exportToJSON();
        expect(exported.matchId).toBe('match1');
        expect(exported.totalTicks).toBe(2);
        expect(exported.decisions).toHaveLength(3);
    });
    it('should track progress', () => {
        replay.seek(1);
        const pos1 = replay.getCurrentPosition();
        replay.seek(2);
        const pos2 = replay.getCurrentPosition();
        expect(pos1.progress).toBe(50); // 1/2 = 50%
        expect(pos2.progress).toBe(100); // 2/2 = 100%
    });
    it('should handle empty replay', () => {
        const emptyReplay = new MatchReplay('empty');
        const pos = emptyReplay.getCurrentPosition();
        expect(pos.progress).toBe(0);
    });
});
//# sourceMappingURL=match-replay.test.js.map