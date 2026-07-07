export class WorldMapper {
    static mapToObservation(gameState, playerName) {
        const player = gameState.players.find((p) => p.name === playerName);
        if (!player)
            throw new Error(`Player not found: ${playerName}`);
        const friendlyUnits = gameState.units.filter((u) => u.owner === playerName);
        const enemyUnits = gameState.units.filter((u) => u.owner !== playerName);
        const friendlyBuildings = gameState.buildings.filter((b) => b.owner === playerName);
        const mainStructure = friendlyBuildings.find((b) => ["ConYard", "BarracksN", "WarFactory"].includes(b.type));
        return {
            tick: gameState.tick,
            timestamp: gameState.timestamp,
            missionId: gameState.mapName,
            agentId: playerName,
            agentName: playerName,
            agentPosition: mainStructure ? { x: mainStructure.x, y: mainStructure.y } : { x: 0, y: 0 },
            agentHealth: this.calculatePlayerHealth(friendlyBuildings),
            friendlyUnits: friendlyUnits.map((u) => ({
                id: u.id,
                name: u.type,
                type: u.type,
                position: { x: u.x, y: u.y },
                health: u.health,
            })),
            enemyUnits: enemyUnits.map((u) => ({
                id: u.id,
                type: u.type,
                position: { x: u.x, y: u.y },
                health: u.health,
                threat: u.health > 50 ? 1 : 0,
            })),
            resources: {
                ore: player.credits,
                gas: 0,
                totalSpent: 0,
            },
            structures: friendlyBuildings.map((b) => ({
                id: b.id,
                type: b.type,
                position: { x: b.x, y: b.y },
                health: b.health,
                owner: "friendly",
            })),
            visibility: {
                explored: Math.floor(gameState.mapWidth * gameState.mapHeight * 0.8),
                visible: enemyUnits.length,
                totalMap: gameState.mapWidth * gameState.mapHeight,
            },
        };
    }
    static calculatePlayerHealth(buildings) {
        if (buildings.length === 0)
            return 0;
        const totalHealth = buildings.reduce((sum, b) => sum + b.health, 0);
        const totalMaxHealth = buildings.reduce((sum, b) => sum + b.maxHealth, 0);
        return totalMaxHealth === 0 ? 0 : Math.round((totalHealth / totalMaxHealth) * 100);
    }
}
//# sourceMappingURL=world-mapper.js.map