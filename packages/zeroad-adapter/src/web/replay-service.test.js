import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReplayService } from './replay-service.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
describe('ReplayService', () => {
    let testDir;
    let service;
    beforeEach(async () => {
        testDir = join(tmpdir(), `replay-service-test-${Date.now()}`);
        await mkdir(testDir, { recursive: true });
        service = new ReplayService(testDir);
    });
    afterEach(async () => {
        try {
            await rm(testDir, { recursive: true });
        }
        catch {
            // Ignore cleanup errors
        }
    });
    it('should save a match replay', async () => {
        const decisions = [];
        const snapshots = [];
        const filepath = await service.saveMatchReplay('match-001', 'Ollama-1', 'Ollama-2', 'Ollama-1', 5000, 100, 50, 2, 48, 3, decisions, snapshots);
        expect(filepath).toContain('match-001.json');
    });
    it('should load a saved match replay', async () => {
        const decisions = [
            {
                tick: 0,
                timestamp: Date.now(),
                player: 'player1',
                brainName: 'Ollama-1',
                reasoning: 'Test decision',
                commands: ['move', 'train'],
                duration: 250,
            },
        ];
        const snapshots = [
            {
                tick: 0,
                timestamp: Date.now(),
                unitCount: 10,
                buildingCount: 5,
                playerCount: 2,
                resourcesPerPlayer: [
                    { wood: 100, stone: 50 },
                    { wood: 100, stone: 50 },
                ],
            },
        ];
        await service.saveMatchReplay('match-002', 'Ollama-1', 'Ollama-2', undefined, 3000, 60, 30, 1, 32, 2, decisions, snapshots);
        const replay = await service.loadMatchReplay('match-002');
        expect(replay).not.toBeNull();
        expect(replay?.getCurrentPosition().maxTick).toBeGreaterThanOrEqual(0);
    });
    it('should return null for non-existent replay', async () => {
        const replay = await service.loadMatchReplay('nonexistent');
        expect(replay).toBeNull();
    });
    it('should get replay metadata', async () => {
        await service.saveMatchReplay('match-003', 'Ollama-1', 'Ollama-2', 'Ollama-1', 5000, 100, 50, 2, 48, 3, [], []);
        const metadata = await service.getReplayMetadata('match-003');
        expect(metadata).not.toBeNull();
        expect(metadata?.brain1Name).toBe('Ollama-1');
        expect(metadata?.brain2Name).toBe('Ollama-2');
    });
    it('should list all replays', async () => {
        const baseTime = Date.now();
        await service.saveMatchReplay('match-a', 'Brain1', 'Brain2', 'Brain1', 5000, 100, 50, 0, 48, 0, [], []);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
        await service.saveMatchReplay('match-b', 'Brain3', 'Brain4', undefined, 6000, 120, 55, 1, 52, 1, [], []);
        const replays = await service.listReplays();
        expect(replays).toHaveLength(2);
        expect(replays[0].matchId).toBe('match-b'); // Newest first
        expect(replays[1].matchId).toBe('match-a');
    });
    it('should get replay summary with file size', async () => {
        await service.saveMatchReplay('match-004', 'Brain1', 'Brain2', 'Brain1', 5000, 100, 50, 0, 48, 0, [], []);
        const summary = await service.getReplaySummary('match-004');
        expect(summary).not.toBeNull();
        expect(summary?.size).toBeGreaterThan(0);
        expect(summary?.brain1Name).toBe('Brain1');
    });
    it('should list replay summaries', async () => {
        await service.saveMatchReplay('match-x', 'Brain1', 'Brain2', 'Brain1', 5000, 100, 50, 0, 48, 0, [], []);
        const summaries = await service.listReplaySummaries();
        expect(summaries.length).toBeGreaterThan(0);
        expect(summaries[0].size).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=replay-service.test.js.map