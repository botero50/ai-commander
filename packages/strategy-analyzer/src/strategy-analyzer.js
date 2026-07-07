/**
 * Strategy Analyzer — Auto-classify play styles from traces
 *
 * Strategies:
 * 1. Rush: Early aggression, frequent attacks
 * 2. Fast Expand: Early resource gathering, expand territory
 * 3. Turtle: Defensive play, build defenses early
 * 4. Tech Rush: Tech advancement then attack
 * 5. Mixed: No clear dominance
 *
 * Uses goal execution patterns and timing to classify
 */
/**
 * StrategyAnalyzer: Classify strategies from match replays
 */
export class StrategyAnalyzer {
    static analyze(replay, player) {
        const isRed = player === 'red';
        const goals = new Map();
        const timeline = [];
        let rushCount = 0;
        let gatherCount = 0;
        let defendCount = 0;
        let expandCount = 0;
        const earlyGameTicks = Math.min(20, replay.metrics.totalTicks);
        let earlyRushCount = 0;
        for (const tick of replay.trace) {
            const decision = isRed ? tick.redDecision : tick.blueDecision;
            const goal = decision.selectedGoal;
            // Count goal execution
            goals.set(goal, (goals.get(goal) || 0) + 1);
            // Classify goal type
            if (goal.includes('attack') || goal.includes('combat')) {
                rushCount += 1;
                if (tick.tickNumber < earlyGameTicks)
                    earlyRushCount += 1;
            }
            else if (goal.includes('gather') || goal.includes('resource')) {
                gatherCount += 1;
            }
            else if (goal.includes('defend')) {
                defendCount += 1;
            }
            else if (goal.includes('expand') || goal.includes('explore')) {
                expandCount += 1;
            }
            timeline.push({
                tick: tick.tickNumber,
                dominantGoal: goal,
            });
        }
        const totalTicks = replay.metrics.totalTicks;
        const earlyAggression = earlyRushCount / Math.max(1, earlyGameTicks);
        const gatheringFocus = gatherCount / totalTicks;
        const defenseFocus = defendCount / totalTicks;
        const expansionFocus = expandCount / totalTicks;
        let strategy = 'Mixed';
        let confidence = 0.5;
        // Classify based on patterns
        if (earlyAggression > 0.4 && rushCount > totalTicks * 0.3) {
            strategy = 'Rush';
            confidence = Math.min(1, earlyAggression + rushCount / totalTicks);
        }
        else if (gatheringFocus > 0.4 && expansionFocus > 0.2) {
            strategy = 'Fast Expand';
            confidence = Math.min(1, gatheringFocus + expansionFocus);
        }
        else if (defenseFocus > 0.35) {
            strategy = 'Turtle';
            confidence = defenseFocus;
        }
        else if (gatheringFocus > 0.3 && rushCount > totalTicks * 0.25) {
            strategy = 'Tech Rush';
            confidence = Math.min(1, gatheringFocus + rushCount / totalTicks * 0.5);
        }
        else {
            strategy = 'Mixed';
            confidence = 0.6;
        }
        return {
            strategy,
            confidence,
            traits: {
                earlyAggression,
                gatheringFocus,
                defenseFocus,
                expansionFocus,
            },
            goalsExecuted: Object.fromEntries(goals),
            timeline,
        };
    }
    static compareStrategies(redProfile, blueProfile) {
        // Simple matchup analysis
        const matchups = {
            'Rush': {
                'Rush': 'neutral',
                'Fast Expand': 'red',
                'Turtle': 'blue',
                'Tech Rush': 'red',
                'Mixed': 'red',
            },
            'Fast Expand': {
                'Rush': 'blue',
                'Fast Expand': 'neutral',
                'Turtle': 'red',
                'Tech Rush': 'blue',
                'Mixed': 'neutral',
            },
            'Turtle': {
                'Rush': 'red',
                'Fast Expand': 'blue',
                'Turtle': 'neutral',
                'Tech Rush': 'blue',
                'Mixed': 'red',
            },
            'Tech Rush': {
                'Rush': 'blue',
                'Fast Expand': 'red',
                'Turtle': 'red',
                'Tech Rush': 'neutral',
                'Mixed': 'blue',
            },
            'Mixed': {
                'Rush': 'blue',
                'Fast Expand': 'neutral',
                'Turtle': 'blue',
                'Tech Rush': 'red',
                'Mixed': 'neutral',
            },
        };
        const advantage = matchups[redProfile.strategy][blueProfile.strategy];
        const matchup = `${redProfile.strategy} vs ${blueProfile.strategy}`;
        const reasoning = this.explainMatchup(redProfile, blueProfile, advantage);
        return { matchup, advantage, reasoning };
    }
    static generateStrategyReport(replay) {
        const redStrategy = this.analyze(replay, 'red');
        const blueStrategy = this.analyze(replay, 'blue');
        const analysis = this.compareStrategies(redStrategy, blueStrategy);
        return { redStrategy, blueStrategy, analysis };
    }
    static explainMatchup(red, blue, advantage) {
        const reasons = [];
        if (red.strategy === 'Rush' && blue.strategy === 'Turtle') {
            reasons.push('Turtle defense can withstand early Rush');
        }
        else if (red.strategy === 'Rush' && blue.strategy === 'Fast Expand') {
            reasons.push('Rush disrupts early expansion');
        }
        else if (red.strategy === 'Fast Expand' && blue.strategy === 'Turtle') {
            reasons.push('Fast Expand can overwhelm Turtle with resource advantage');
        }
        else if (red.strategy === 'Tech Rush' && blue.strategy === 'Rush') {
            reasons.push('Tech Rush scales better against early aggression');
        }
        if (advantage === 'neutral') {
            reasons.push('Strategies are evenly matched');
        }
        return reasons.length > 0 ? reasons.join('; ') : 'Similar playstyle complexity';
    }
}
//# sourceMappingURL=strategy-analyzer.js.map