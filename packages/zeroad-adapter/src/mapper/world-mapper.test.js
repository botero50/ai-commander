import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { WorldMapper } from './world-mapper.js';
import { Logger } from '../config/logger.js';
import { AgentState } from '@ai-commander/domain';
const logger = new Logger('error');
const createMockGameState = () => ({
    tick: 100,
    timestamp: Date.now(),
    players: [
        {
            id: 1,
            name: 'Player 1',
            civ: 'brit',
            color: 'FF0000',
            resources: { food: 1000, wood: 500, stone: 200, metal: 100 },
            populationCurrent: 30,
            populationMax: 60,
            diplomacy: { 2: 'enemy' },
        },
    ],
    units: [
        {
            id: 1,
            owner: 1,
            type: 'infantry',
            position: { x: 100, z: 200 },
            health: 45,
            maxHealth: 60,
            stance: 'aggressive',
            orders: ['move'],
        },
    ],
    buildings: [
        {
            id: 101,
            owner: 1,
            type: 'barracks',
            position: { x: 50, z: 100 },
            health: 100,
            maxHealth: 100,
            production: ['unit_inf'],
        },
    ],
    map: { width: 256, height: 256, terrain: 'temperate' },
});
test('WorldMapper - map basic game state', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    const worldState = mapper.map(gameState);
    assert.equal(worldState.players.length, 1);
    assert.equal(worldState.agents.length, 2); // 1 unit + 1 building
    assert.equal(worldState.time.currentTick.number, 100);
});
test('WorldMapper - map player correctly', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    const worldState = mapper.map(gameState);
    const player = worldState.players[0];
    assert.equal(player.name, 'Player 1');
    assert.equal(player.isHuman, false);
    assert.equal(player.customData.civilization, 'brit');
    assert.deepEqual(player.customData.resources, {
        food: 1000,
        wood: 500,
        stone: 200,
        metal: 100,
    });
});
test('WorldMapper - map unit as agent', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    const worldState = mapper.map(gameState);
    const unitAgent = worldState.agents.find((a) => a.agentId.includes('unit-1'));
    assert(unitAgent);
    assert.equal(unitAgent.state, AgentState.Acting);
    assert.equal(unitAgent.customData.type, 'infantry');
    assert.equal(unitAgent.customData.health, 45);
    assert.deepEqual(unitAgent.customData.orders, ['move']);
});
test('WorldMapper - map building as agent', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    const worldState = mapper.map(gameState);
    const buildingAgent = worldState.agents.find((a) => a.agentId.includes('building-101'));
    assert(buildingAgent);
    assert.equal(buildingAgent.state, AgentState.Acting);
    assert.equal(buildingAgent.customData.type, 'barracks');
    assert.equal(buildingAgent.customData.health, 100);
});
test('WorldMapper - determine unit state for idle unit', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    gameState.units[0].orders = [];
    const worldState = mapper.map(gameState);
    const unitAgent = worldState.agents.find((a) => a.agentId.includes('unit-1'));
    assert(unitAgent);
    assert.equal(unitAgent.state, AgentState.Idle);
});
test('WorldMapper - determine unit state for dead unit', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    gameState.units[0].health = 0;
    const worldState = mapper.map(gameState);
    const unitAgent = worldState.agents.find((a) => a.agentId.includes('unit-1'));
    assert(unitAgent);
    assert.equal(unitAgent.state, AgentState.Defeated);
});
test('WorldMapper - world state is immutable', () => {
    const mapper = new WorldMapper(logger);
    const gameState = createMockGameState();
    const worldState = mapper.map(gameState);
    assert.throws(() => {
        worldState.players = [];
    });
    assert.throws(() => {
        worldState.players[0].name = 'Modified';
    });
});
//# sourceMappingURL=world-mapper.test.js.map