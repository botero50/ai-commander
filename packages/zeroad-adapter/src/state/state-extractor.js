export class StateExtractor {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    extract(rawState) {
        const startTime = Date.now();
        try {
            const gameState = {
                tick: rawState.tick,
                timestamp: rawState.timestamp,
                players: this.extractPlayers(rawState.players),
                units: this.extractUnits(rawState.units),
                buildings: this.extractBuildings(rawState.buildings),
                map: rawState.map,
            };
            const duration = Date.now() - startTime;
            if (duration > 50) {
                this.logger.warn('State extraction took longer than 50ms', { duration });
            }
            return gameState;
        }
        catch (err) {
            this.logger.error('Failed to extract state', err);
            throw err;
        }
    }
    extractPlayers(rawPlayers) {
        return rawPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            civ: p.civ,
            color: p.color,
            resources: {
                food: p.resources.food,
                wood: p.resources.wood,
                stone: p.resources.stone,
                metal: p.resources.metal,
            },
            populationCurrent: p.population.current,
            populationMax: p.population.max,
            diplomacy: this.normalizeDiplomacy(p.diplomacy),
        }));
    }
    extractUnits(rawUnits) {
        return rawUnits.map((u) => ({
            id: u.id,
            owner: u.owner,
            type: u.type,
            position: { x: u.position.x, z: u.position.z },
            health: u.health,
            maxHealth: u.maxHealth,
            stance: u.stance,
            orders: u.orders,
        }));
    }
    extractBuildings(rawBuildings) {
        return rawBuildings.map((b) => ({
            id: b.id,
            owner: b.owner,
            type: b.type,
            position: { x: b.position.x, z: b.position.z },
            health: b.health,
            maxHealth: b.maxHealth,
            production: b.production,
            garrisoned: b.garrisoned,
        }));
    }
    normalizeDiplomacy(diplomacy) {
        const normalized = {};
        for (const [key, value] of Object.entries(diplomacy)) {
            const playerId = parseInt(key, 10);
            if (!isNaN(playerId)) {
                normalized[playerId] = value;
            }
        }
        return normalized;
    }
}
//# sourceMappingURL=state-extractor.js.map