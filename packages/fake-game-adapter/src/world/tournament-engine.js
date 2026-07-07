/**
 * Tournament Engine
 *
 * Execute multiple match formats:
 * - Round-robin: all vs all
 * - Swiss: minimize rematches, pair strong players together
 * - Best-of-N: repeat best-of match, declare winner by majority
 * - Elimination: bracket-based, losers are out
 */
import { MatchRunner } from './match-runner.js';
/**
 * Tournament Engine
 */
export class TournamentEngine {
    constructor(config) {
        this.matches = [];
        this.config = config;
    }
    /**
     * Run tournament with specified format
     */
    async runTournament() {
        const startTime = performance.now();
        switch (this.config.format) {
            case 'round-robin':
                await this.roundRobin();
                break;
            case 'swiss':
                await this.swiss();
                break;
            case 'best-of':
                await this.bestOf();
                break;
            case 'elimination':
                await this.elimination();
                break;
        }
        const standings = this.calculateStandings();
        const winner = standings.length > 0 ? standings[0]?.competitor : undefined;
        const endTime = performance.now();
        return {
            config: this.config,
            matches: this.matches,
            standings,
            winner: winner ?? undefined,
            totalDurationMs: endTime - startTime,
        };
    }
    /**
     * Round-robin: every player plays every other player once
     */
    async roundRobin() {
        const { competitors } = this.config;
        for (let i = 0; i < competitors.length; i++) {
            for (let j = i + 1; j < competitors.length; j++) {
                const pairing = {
                    player1: competitors[i],
                    player2: competitors[j],
                };
                const match = await this.playMatch(pairing);
                this.matches.push(match);
            }
        }
    }
    /**
     * Swiss: minimize rematches, pair players by strength
     */
    async swiss() {
        const roundCount = this.config.roundCount || 3;
        const { competitors } = this.config;
        const standings = this.createInitialStandings();
        for (let round = 0; round < roundCount; round++) {
            // Sort by wins
            standings.sort((a, b) => b.wins - a.wins);
            // Pair adjacent players (strong with strong, weak with weak)
            const pairings = this.swissPairings(standings);
            for (const pairing of pairings) {
                const p1 = pairing[0];
                const p2 = pairing[1];
                if (!p1 || !p2)
                    continue;
                const matchPairing = {
                    player1: p1.competitor,
                    player2: p2.competitor,
                };
                const match = await this.playMatch(matchPairing);
                this.matches.push(match);
                // Update standings
                if (match.winner === 'player1') {
                    p1.wins++;
                    p2.losses++;
                }
                else if (match.winner === 'player2') {
                    p2.wins++;
                    p1.losses++;
                }
                else {
                    p1.draws++;
                    p2.draws++;
                }
            }
        }
    }
    /**
     * Best-of-N: repeat match N times, declare winner by majority
     */
    async bestOf() {
        const n = this.config.bestOfN || 3;
        const [p1, p2] = this.config.competitors;
        const pairing = {
            player1: p1,
            player2: p2,
        };
        let p1Wins = 0;
        let p2Wins = 0;
        for (let game = 0; game < n; game++) {
            const match = await this.playMatch(pairing);
            this.matches.push(match);
            if (match.winner === 'player1') {
                p1Wins++;
            }
            else if (match.winner === 'player2') {
                p2Wins++;
            }
            // Early exit if winner is clinched
            const gamesNeeded = Math.ceil(n / 2);
            if (p1Wins >= gamesNeeded || p2Wins >= gamesNeeded) {
                break;
            }
        }
    }
    /**
     * Elimination: bracket-based, single elimination
     */
    async elimination() {
        let remaining = [...this.config.competitors];
        while (remaining.length > 1) {
            const nextRound = [];
            for (let i = 0; i < remaining.length; i += 2) {
                if (i + 1 < remaining.length) {
                    const pairing = {
                        player1: remaining[i],
                        player2: remaining[i + 1],
                    };
                    const match = await this.playMatch(pairing);
                    this.matches.push(match);
                    // Winner advances
                    if (match.winner === 'player1') {
                        nextRound.push(remaining[i]);
                    }
                    else if (match.winner === 'player2') {
                        nextRound.push(remaining[i + 1]);
                    }
                    else {
                        nextRound.push(remaining[i]);
                    }
                }
                else {
                    // Bye
                    nextRound.push(remaining[i]);
                }
            }
            remaining = nextRound;
        }
    }
    /**
     * Play a single match
     */
    async playMatch(pairing) {
        const config = {
            maxTicks: this.config.matchMaxTicks,
            player1Brain: pairing.player1.brain,
            player2Brain: pairing.player2.brain,
        };
        const runner = new MatchRunner(config);
        const replay = await runner.runMatch();
        // Determine winner: who had more successful decisions (simple heuristic)
        const p1Decisions = replay.decisions.filter((d) => d.player === 'player1');
        const p2Decisions = replay.decisions.filter((d) => d.player === 'player2');
        const p1Confidence = p1Decisions.length > 0
            ? p1Decisions.reduce((sum, d) => sum + d.confidence, 0) / p1Decisions.length
            : 50;
        const p2Confidence = p2Decisions.length > 0
            ? p2Decisions.reduce((sum, d) => sum + d.confidence, 0) / p2Decisions.length
            : 50;
        let winner = 'draw';
        if (p1Confidence > p2Confidence + 1) {
            winner = 'player1';
        }
        else if (p2Confidence > p1Confidence + 1) {
            winner = 'player2';
        }
        return {
            pairing,
            replay,
            winner,
        };
    }
    /**
     * Calculate tournament standings
     */
    calculateStandings() {
        const standings = this.createInitialStandings();
        for (const match of this.matches) {
            if (!match.winner) {
                continue;
            }
            const p1Index = standings.findIndex((s) => s.competitor.id === match.pairing.player1.id);
            const p2Index = standings.findIndex((s) => s.competitor.id === match.pairing.player2.id);
            if (p1Index === -1 || p2Index === -1) {
                continue;
            }
            const s1 = standings[p1Index];
            const s2 = standings[p2Index];
            if (match.winner === 'player1') {
                s1.wins++;
                s2.losses++;
            }
            else if (match.winner === 'player2') {
                s2.wins++;
                s1.losses++;
            }
            else {
                s1.draws++;
                s2.draws++;
            }
            s1.costUsd += match.replay.metrics.costPerPlayer.player1;
            s2.costUsd += match.replay.metrics.costPerPlayer.player2;
            s1.averageLatencyMs = Math.max(s1.averageLatencyMs, match.replay.metrics.latencyPerPlayer.player1);
            s2.averageLatencyMs = Math.max(s2.averageLatencyMs, match.replay.metrics.latencyPerPlayer.player2);
        }
        // Sort by wins, then draws, then head-to-head
        standings.sort((a, b) => {
            const aScore = a.wins * 3 + a.draws;
            const bScore = b.wins * 3 + b.draws;
            return bScore - aScore;
        });
        return standings;
    }
    /**
     * Create initial standings
     */
    createInitialStandings() {
        return this.config.competitors.map((c) => ({
            competitor: c,
            wins: 0,
            losses: 0,
            draws: 0,
            costUsd: 0,
            averageLatencyMs: 0,
        }));
    }
    /**
     * Generate Swiss-format pairings (greedy algorithm)
     */
    swissPairings(standings) {
        const pairings = [];
        const used = new Set();
        for (const standing of standings) {
            if (used.has(standing.competitor.id)) {
                continue;
            }
            // Find best available opponent
            for (const opponent of standings) {
                if (opponent.competitor.id !== standing.competitor.id &&
                    !used.has(opponent.competitor.id)) {
                    pairings.push([standing, opponent]);
                    used.add(standing.competitor.id);
                    used.add(opponent.competitor.id);
                    break;
                }
            }
        }
        return pairings;
    }
}
//# sourceMappingURL=tournament-engine.js.map