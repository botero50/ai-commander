"use strict";
/**
 * Metrics Calculator
 *
 * Stateless metric computation for economy, military, tech, activity, and pace.
 * Separates calculation logic from state management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCalculator = void 0;
class MetricsCalculator {
    /**
     * Calculate economy metrics from game state
     */
    calculateEconomy(player, state) {
        const resources = player.resources;
        const totalResources = resources.food + resources.wood + resources.stone + resources.metal;
        // Estimate income based on buildings
        const settlements = state.buildings.filter((b) => b.owner === player.id && b.type === 'Civic Centre');
        const baseIncome = 50;
        const settlementIncome = settlements.length * baseIncome;
        const foodIncome = Math.max(10, settlementIncome * 0.3);
        const woodIncome = Math.max(10, settlementIncome * 0.25);
        const stoneIncome = Math.max(10, settlementIncome * 0.25);
        const metalIncome = Math.max(5, settlementIncome * 0.2);
        const totalIncome = foodIncome + woodIncome + stoneIncome + metalIncome;
        return {
            foodIncome,
            woodIncome,
            stoneIncome,
            metalIncome,
            totalIncome,
            resourceSpent: totalResources > 1000 ? Math.random() * 500 : 0,
            economyScore: Math.min(10, Math.floor(totalIncome / 50)),
        };
    }
    /**
     * Calculate military metrics from game state
     */
    calculateMilitary(playerId, state, unitValueMap) {
        const units = state.units.filter((u) => u.owner === playerId);
        const militaryUnits = units.filter((u) => this.isMilitaryUnit(u.type));
        let militaryValue = 0;
        let totalHealth = 0;
        for (const unit of militaryUnits) {
            militaryValue += unitValueMap[unit.type] || 5;
            totalHealth += unit.health;
        }
        const unitCount = militaryUnits.length;
        const avgUnitHealth = unitCount > 0 ? Math.round(totalHealth / unitCount) : 0;
        const casualtyRate = Math.random() * 0.5;
        const militaryScore = Math.max(1, Math.min(10, Math.floor(unitCount / 5) + (avgUnitHealth > 70 ? 3 : 0) + (unitCount > 0 ? 1 : 0)));
        return {
            unitCount,
            militaryValue: Math.round(militaryValue),
            casualtyRate,
            avgUnitHealth,
            militaryScore,
        };
    }
    /**
     * Calculate technology metrics
     */
    calculateTech(techsUnlocked, gameTime) {
        const techProgressRate = gameTime > 0 ? (techsUnlocked / gameTime) * 60000 : 0;
        const avgTechTiming = techsUnlocked > 0 ? gameTime / techsUnlocked : 0;
        return {
            techsUnlocked,
            techProgressRate: Math.round(techProgressRate * 100) / 100,
            avgTechTiming: Math.round(avgTechTiming),
            techTree: [],
        };
    }
    /**
     * Calculate activity metrics
     */
    calculateActivity(playerId, state) {
        const expansions = state.buildings.filter((b) => b.owner === playerId && b.type === 'Civic Centre')
            .length;
        const militaryBuildings = state.buildings.filter((b) => b.owner === playerId && (b.type === 'Barracks' || b.type === 'Stable')).length;
        const attacks = militaryBuildings > 0 ? Math.floor(Math.random() * militaryBuildings) : 0;
        const buildEvents = expansions + militaryBuildings;
        return {
            expansions,
            attacks,
            defenses: 0,
            buildEvents,
            activityScore: Math.min(10, Math.floor(buildEvents / 2) + 1),
        };
    }
    /**
     * Calculate game pace metrics
     */
    calculateGamePace(gameTime, unitCount, buildingCount) {
        let phase = 'early';
        if (gameTime > 300)
            phase = 'mid';
        if (gameTime > 600)
            phase = 'late';
        const totalEntities = unitCount + buildingCount;
        const eventDensity = gameTime > 0 ? totalEntities / (gameTime / 60) : 0;
        const paceScore = Math.min(10, Math.max(1, Math.floor(eventDensity / 2)));
        return {
            phase,
            paceScore,
            gameTime: Math.round(gameTime),
            eventDensity: Math.round(eventDensity * 100) / 100,
        };
    }
    /**
     * Check if unit type is military
     */
    isMilitaryUnit(type) {
        const militaryTypes = ['Cavalry', 'Cataphract', 'Archer', 'Spearman', 'Chariot', 'Elephant', 'Legion', 'Phalanx'];
        return militaryTypes.some((t) => type.includes(t));
    }
}
exports.MetricsCalculator = MetricsCalculator;
//# sourceMappingURL=metrics-calculator.js.map