/**
 * Tournament Engine — Execute four tournament formats
 *
 * Formats:
 * 1. Round Robin: Every brain vs every other brain (all pairings)
 * 2. Swiss: Seeded by rating, opponents matched by score after each round
 * 3. Best of N: Play N games per pairing, aggregate wins
 * 4. Elimination: Single elimination bracket
 */
import { MatchRunner } from '@ai-commander/match-runner';
/**
 * Tournament Engine: Execute various tournament formats
 */
export class TournamentEngine {
    static async roundRobin(config) {
        const startTime = Date.now();
        const matches = [];
        const standings = new Map();
        // Initialize standings
        for (const brain of config.brains) {
            standings.set(brain.name, {
                brainName: brain.name,
                wins: 0,
                losses: 0,
                draws: 0,
                rating: 1500,
                totalCost: 0,
            });
        }
        // Round robin: every brain vs every other
        for (let i = 0; i < config.brains.length; i++) {
            for (let j = i + 1; j < config.brains.length; j++) {
                for (const seed of config.mapSeeds) {
                    const replay = await MatchRunner.run({
                        redBrain: config.brains[i],
                        blueBrain: config.brains[j],
                        mapSeed: seed,
                        maxTicks: config.maxTicksPerMatch,
                        gameAdapterId: config.gameAdapterId,
                    });
                    matches.push(replay);
                    this.updateStandings(standings, replay);
                }
            }
        }
        const sortedStandings = Array.from(standings.values()).sort((a, b) => b.wins - a.wins || b.rating - a.rating);
        return {
            format: 'round-robin',
            standings: sortedStandings,
            matches,
            duration: Date.now() - startTime,
        };
    }
    static async swiss(config) {
        const startTime = Date.now();
        const matches = [];
        const standings = new Map();
        // Initialize standings
        for (const brain of config.brains) {
            standings.set(brain.name, {
                brainName: brain.name,
                wins: 0,
                losses: 0,
                draws: 0,
                rating: 1500,
                totalCost: 0,
            });
        }
        const rounds = config.rounds || Math.ceil(Math.log2(config.brains.length) * 1.5);
        for (let round = 0; round < rounds; round++) {
            // Sort by rating descending
            const sorted = Array.from(standings.values()).sort((a, b) => b.rating - a.rating);
            // Pair by score buckets (simplified: pair neighbors)
            const pairings = this.createSwissPairings(sorted);
            for (const [brainA, brainB] of pairings) {
                const matchBrain1 = config.brains.find((b) => b.name === brainA.brainName);
                const matchBrain2 = config.brains.find((b) => b.name === brainB.brainName);
                const seed = config.mapSeeds[round % config.mapSeeds.length];
                const replay = await MatchRunner.run({
                    redBrain: matchBrain1,
                    blueBrain: matchBrain2,
                    mapSeed: seed,
                    maxTicks: config.maxTicksPerMatch,
                    gameAdapterId: config.gameAdapterId,
                });
                matches.push(replay);
                this.updateStandings(standings, replay);
            }
        }
        const sortedStandings = Array.from(standings.values()).sort((a, b) => b.wins - a.wins || b.rating - a.rating);
        return {
            format: 'swiss',
            standings: sortedStandings,
            matches,
            duration: Date.now() - startTime,
        };
    }
    static async bestOfN(config) {
        const startTime = Date.now();
        const matches = [];
        const standings = new Map();
        const gamesPerPairing = config.gamesPerPairing || 3;
        // Initialize standings
        for (const brain of config.brains) {
            standings.set(brain.name, {
                brainName: brain.name,
                wins: 0,
                losses: 0,
                draws: 0,
                rating: 1500,
                totalCost: 0,
            });
        }
        // Every brain vs every other, best-of-N
        for (let i = 0; i < config.brains.length; i++) {
            for (let j = i + 1; j < config.brains.length; j++) {
                for (let game = 0; game < gamesPerPairing; game++) {
                    const seed = config.mapSeeds[game % config.mapSeeds.length];
                    const replay = await MatchRunner.run({
                        redBrain: config.brains[i],
                        blueBrain: config.brains[j],
                        mapSeed: seed,
                        maxTicks: config.maxTicksPerMatch,
                        gameAdapterId: config.gameAdapterId,
                    });
                    matches.push(replay);
                    this.updateStandings(standings, replay);
                }
            }
        }
        const sortedStandings = Array.from(standings.values()).sort((a, b) => b.wins - a.wins || b.rating - a.rating);
        return {
            format: 'best-of-n',
            standings: sortedStandings,
            matches,
            duration: Date.now() - startTime,
        };
    }
    static async elimination(config) {
        const startTime = Date.now();
        const matches = [];
        const standings = new Map();
        // Initialize standings
        for (const brain of config.brains) {
            standings.set(brain.name, {
                brainName: brain.name,
                wins: 0,
                losses: 0,
                draws: 0,
                rating: 1500,
                totalCost: 0,
            });
        }
        // Single elimination bracket
        let round = config.brains.slice();
        while (round.length > 1) {
            const nextRound = [];
            for (let i = 0; i < round.length; i += 2) {
                if (i + 1 >= round.length) {
                    // Bye
                    nextRound.push(round[i]);
                    continue;
                }
                const seed = config.mapSeeds[0];
                const replay = await MatchRunner.run({
                    redBrain: round[i],
                    blueBrain: round[i + 1],
                    mapSeed: seed,
                    maxTicks: config.maxTicksPerMatch,
                    gameAdapterId: config.gameAdapterId,
                });
                matches.push(replay);
                this.updateStandings(standings, replay);
                // Winner advances
                const winner = replay.metrics.winner === 'red' ? round[i] : round[i + 1];
                nextRound.push(winner);
            }
            round = nextRound;
        }
        const sortedStandings = Array.from(standings.values()).sort((a, b) => b.wins - a.wins || b.rating - a.rating);
        return {
            format: 'elimination',
            standings: sortedStandings,
            matches,
            duration: Date.now() - startTime,
        };
    }
    static updateStandings(standings, replay) {
        const red = standings.get(replay.metrics.redPlayer);
        const blue = standings.get(replay.metrics.bluePlayer);
        let newRedWins = red.wins;
        let newRedLosses = red.losses;
        let newRedDraws = red.draws;
        let newBlueWins = blue.wins;
        let newBlueLosses = blue.losses;
        let newBlueDraws = blue.draws;
        let newRedRating = red.rating;
        let newBlueRating = blue.rating;
        if (replay.metrics.winner === 'red') {
            newRedWins += 1;
            newBlueLosses += 1;
        }
        else if (replay.metrics.winner === 'blue') {
            newBlueWins += 1;
            newRedLosses += 1;
        }
        else {
            newRedDraws += 1;
            newBlueDraws += 1;
        }
        // Simple ELO
        const kFactor = 32;
        const expected = 1 / (1 + Math.pow(10, (blue.rating - red.rating) / 400));
        if (replay.metrics.winner === 'red') {
            newRedRating += kFactor * (1 - expected);
            newBlueRating += kFactor * (0 - (1 - expected));
        }
        else if (replay.metrics.winner === 'blue') {
            newBlueRating += kFactor * (1 - (1 - expected));
            newRedRating += kFactor * (0 - (1 - expected));
        }
        standings.set(red.brainName, {
            brainName: red.brainName,
            wins: newRedWins,
            losses: newRedLosses,
            draws: newRedDraws,
            rating: newRedRating,
            totalCost: red.totalCost + replay.metrics.redCost,
        });
        standings.set(blue.brainName, {
            brainName: blue.brainName,
            wins: newBlueWins,
            losses: newBlueLosses,
            draws: newBlueDraws,
            rating: newBlueRating,
            totalCost: blue.totalCost + replay.metrics.blueCost,
        });
    }
    static createSwissPairings(standings) {
        const pairings = [];
        const used = new Set();
        for (const standing of standings) {
            if (used.has(standing.brainName))
                continue;
            // Find highest-rated opponent not yet paired this round
            for (const other of standings) {
                if (used.has(other.brainName) || other.brainName === standing.brainName)
                    continue;
                pairings.push([standing, other]);
                used.add(standing.brainName);
                used.add(other.brainName);
                break;
            }
        }
        return pairings;
    }
}
//# sourceMappingURL=tournament-engine.js.map