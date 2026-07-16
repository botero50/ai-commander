"use strict";
/**
 * Match Statistics Analyzer
 * Orchestrates statistical analysis via specialized metric and trend analyzers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsAnalyzer = void 0;
const metrics_calculator_js_1 = require("./metrics-calculator.js");
const trend_analyzer_js_1 = require("./trend-analyzer.js");
/**
 * Analyzes match statistics and trends
 */
class StatisticsAnalyzer {
    snapshots = [];
    previousState = null;
    unitCounts = {};
    techHistory = {};
    eventCounts = {};
    metricsCalculator;
    trendAnalyzer;
    unitValueMap = {
        Cavalry: 15,
        Cataphract: 20,
        Archer: 10,
        Spearman: 8,
        Chariot: 18,
        Elephant: 25,
        Legion: 12,
        Phalanx: 10,
    };
    constructor() {
        this.metricsCalculator = new metrics_calculator_js_1.MetricsCalculator();
        this.trendAnalyzer = new trend_analyzer_js_1.TrendAnalyzer();
    }
    /**
     * Update statistics with new game state
     */
    update(state) {
        // Create snapshots every 10 ticks (skip tick 0)
        if (state.tick % 10 !== 0 || state.tick === 0) {
            this.previousState = state;
            return;
        }
        for (const player of state.players) {
            const snapshot = this.createSnapshot(state, player.id);
            this.snapshots.push(snapshot);
        }
        this.previousState = state;
    }
    /**
     * Create statistics snapshot for a player
     */
    createSnapshot(state, playerId) {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) {
            throw new Error(`Player ${playerId} not found`);
        }
        // Use metric calculator for all metrics
        const economy = this.metricsCalculator.calculateEconomy(player, state);
        const military = this.metricsCalculator.calculateMilitary(playerId, state, this.unitValueMap);
        // Handle tech tracking
        if (!this.techHistory[playerId]) {
            this.techHistory[playerId] = new Set();
        }
        const currentTechs = this.extractTechs(state, playerId);
        const newTechs = currentTechs.filter((t) => !this.techHistory[playerId].has(t));
        for (const tech of newTechs) {
            this.techHistory[playerId].add(tech);
        }
        const tech = this.metricsCalculator.calculateTech(this.techHistory[playerId].size, state.timestamp);
        tech.techTree = Array.from(this.techHistory[playerId]);
        const activity = this.metricsCalculator.calculateActivity(playerId, state);
        const gameTime = state.timestamp / 1000;
        const pace = this.metricsCalculator.calculateGamePace(gameTime, state.units.length, state.buildings.length);
        return {
            tick: state.tick,
            timestamp: state.timestamp,
            playerId,
            economy,
            military,
            tech,
            activity,
            pace,
        };
    }
    /**
     * Get all statistics
     */
    getStatistics() {
        const playerStats = {};
        // Organize snapshots by player
        for (const snapshot of this.snapshots) {
            if (!playerStats[snapshot.playerId]) {
                playerStats[snapshot.playerId] = [];
            }
            playerStats[snapshot.playerId].push(snapshot);
        }
        // Use trend analyzer for trends and comparatives
        const trends = this.trendAnalyzer.analyzeTrends(playerStats);
        const comparativeMetrics = this.trendAnalyzer.calculateComparativeMetrics(playerStats);
        const lastSnapshot = this.snapshots[this.snapshots.length - 1];
        const matchDuration = lastSnapshot ? lastSnapshot.timestamp / 1000 : 0;
        return {
            matchDuration: Math.round(matchDuration),
            totalSnapshots: this.snapshots.length,
            playerStats,
            trends,
            comparativeMetrics,
        };
    }
    /**
     * Get player statistics
     */
    getPlayerStatistics(playerId) {
        return this.snapshots.filter((s) => s.playerId === playerId);
    }
    /**
     * Get trend analysis
     */
    getTrendAnalysis(playerId) {
        const stats = this.getPlayerStatistics(playerId);
        return this.trendAnalyzer.generateTrendReport(stats);
    }
    /**
     * Helper: extract tech names from buildings
     */
    extractTechs(state, playerId) {
        const techs = [];
        const buildings = state.buildings.filter((b) => b.owner === playerId);
        const techBuildings = {
            'Blacksmith': 'Iron Working',
            'University': 'Philosophy',
            'Market': 'Trade',
            'Temple': 'Religion',
            'Siege Workshop': 'Siege Engineering',
        };
        for (const building of buildings) {
            if (techBuildings[building.type]) {
                techs.push(techBuildings[building.type]);
            }
        }
        return techs;
    }
    /**
     * Reset analyzer
     */
    reset() {
        this.snapshots = [];
        this.previousState = null;
        this.unitCounts = {};
        this.techHistory = {};
        this.eventCounts = {};
    }
}
exports.StatisticsAnalyzer = StatisticsAnalyzer;
//# sourceMappingURL=statistics-analyzer.js.map