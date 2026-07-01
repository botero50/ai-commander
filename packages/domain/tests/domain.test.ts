import { describe, it, expect } from 'vitest';
import {
  createEntityId,
  createPlayerId,
  createTeamId,
  createGameId,
  createPosition,
  createGameMap,
  createTick,
  createPhase,
  createGameTime,
  createResourceType,
  createResource,
  createResourcePool,
  createPlayer,
  createTeam,
  createAgent,
  createAgentSnapshot,
  AgentState,
  isAgentActive,
  isPlayerControlled,
  createWorldState,
  getAgent,
  getPlayerAgents,
  createActionId,
  createCommand,
  createActionSuccess,
  createActionFailure,
  isActionSuccess,
  isActionFailure,
  createEventId,
  createEventType,
  createPublicEvent,
  createPrivateEvent,
  canObserveEvent,
  createPositionVisibility,
  VisibilityState,
  createFogOfWar,
  createObservation,
  createCapability,
  isCapabilityReady,
  canUseCapability,
  createGoal,
  createObjective,
} from '../src/index.js';

describe('Domain Model', () => {
  describe('Identity Types', () => {
    it('should create and use entity IDs', () => {
      const id = createEntityId('entity-1');
      expect(id).toBe('entity-1');
    });

    it('should create player IDs', () => {
      const id = createPlayerId('player-1');
      expect(id).toBe('player-1');
    });

    it('should throw on empty IDs', () => {
      expect(() => createEntityId('')).toThrow();
      expect(() => createPlayerId('')).toThrow();
    });
  });

  describe('Spatial Types', () => {
    it('should create positions', () => {
      const pos = createPosition('0,0', 'North wall');
      expect(pos.id).toBe('0,0');
      expect(pos.description).toBe('North wall');
      expect(Object.isFrozen(pos)).toBe(true);
    });

    it('should create game maps', () => {
      const pos1 = createPosition('0,0', 'Tile 1');
      const pos2 = createPosition('0,1', 'Tile 2');
      const map = createGameMap('map-1', 'Test Map', [pos1, pos2], 2, 1);
      expect(map.positions.length).toBe(2);
      expect(map.width).toBe(2);
      expect(map.height).toBe(1);
      expect(Object.isFrozen(map.positions)).toBe(true);
    });

    it('should reject map with no positions', () => {
      expect(() => createGameMap('map-1', 'Test Map', [])).toThrow();
    });
  });

  describe('Temporal Types', () => {
    it('should create ticks', () => {
      const tick = createTick(0);
      expect(tick.number).toBe(0);
      expect(Object.isFrozen(tick)).toBe(true);
    });

    it('should create phases', () => {
      const tick = createTick(5);
      const phase = createPhase('perception', 'Perception Phase', 0, tick);
      expect(phase.id).toBe('perception');
      expect(phase.tick.number).toBe(5);
    });

    it('should create game time', () => {
      const tick = createTick(10);
      const time = createGameTime(tick, null, 'Day 1, Morning');
      expect(time.elapsedTicks).toBe(10);
      expect(time.displayTime).toBe('Day 1, Morning');
    });
  });

  describe('Resource Types', () => {
    it('should create resource types', () => {
      const goldType = createResourceType('gold', 'Gold', 'economy', 0, 1000);
      expect(goldType.id).toBe('gold');
      expect(goldType.name).toBe('Gold');
      expect(goldType.min).toBe(0);
      expect(goldType.max).toBe(1000);
    });

    it('should create resources', () => {
      const goldType = createResourceType('gold', 'Gold', 'economy');
      const gold = createResource(goldType, 100, 0);
      expect(gold.amount).toBe(100);
      expect(gold.type.id).toBe('gold');
    });

    it('should create resource pools', () => {
      const goldType = createResourceType('gold', 'Gold', 'economy');
      const gold = createResource(goldType, 100);
      const pool = createResourcePool([gold], [goldType]);
      expect(pool.getAmount('gold')).toBe(100);
      expect(pool.hasEnough('gold', 50)).toBe(true);
      expect(pool.hasEnough('gold', 150)).toBe(false);
    });

    it('should reject invalid resource amounts', () => {
      const goldType = createResourceType('gold', 'Gold', 'economy', 0, 100);
      expect(() => createResource(goldType, 150)).toThrow();
      expect(() => createResource(goldType, -1)).toThrow();
    });
  });

  describe('Player and Team Types', () => {
    it('should create players', () => {
      const playerId = createPlayerId('player-1');
      const player = createPlayer(playerId, 'Alice');
      expect(player.name).toBe('Alice');
      expect(player.isHuman).toBe(false);
      expect(Object.isFrozen(player)).toBe(true);
    });

    it('should create teams', () => {
      const playerId = createPlayerId('player-1');
      const teamId = createTeamId('team-1');
      const team = createTeam(teamId, 'Team A', [playerId]);
      expect(team.name).toBe('Team A');
      expect(team.playerIds).toContain(playerId);
      expect(Object.isFrozen(team.playerIds)).toBe(true);
    });

    it('should reject team with no players', () => {
      const teamId = createTeamId('team-1');
      expect(() => createTeam(teamId, 'Team A', [])).toThrow();
    });
  });

  describe('Agent Types', () => {
    it('should create agent snapshots', () => {
      const agent = createAgent('agent-1');
      const playerId = createPlayerId('player-1');
      const goldType = createResourceType('gold', 'Gold', 'economy');
      const resources = createResourcePool([], [goldType]);

      const snapshot = createAgentSnapshot(agent, playerId, AgentState.Idle, resources);
      expect(snapshot.agentId).toBe(agent);
      expect(snapshot.state).toBe(AgentState.Idle);
      expect(isPlayerControlled(snapshot)).toBe(true);
    });

    it('should track agent state', () => {
      const agent = createAgent('agent-1');
      const goldType = createResourceType('gold', 'Gold', 'economy');
      const resources = createResourcePool([], [goldType]);
      const active = createAgentSnapshot(agent, null, AgentState.Acting, resources);
      const defeated = createAgentSnapshot(agent, null, AgentState.Defeated, resources);

      expect(isAgentActive(active)).toBe(true);
      expect(isAgentActive(defeated)).toBe(false);
    });
  });

  describe('Actions and Commands', () => {
    it('should create commands', () => {
      const agent = createAgent('agent-1');
      const tick = createTick(5);
      const command = createCommand(
        createActionId('cmd-1'),
        agent,
        'move',
        { target: '0,1' },
        tick,
        1
      );

      expect(command.actionType).toBe('move');
      expect(command.priority).toBe(1);
    });

    it('should create action results', () => {
      const agent = createAgent('agent-1');
      const tick = createTick(5);
      const command = createCommand(
        createActionId('cmd-1'),
        agent,
        'move',
        { target: '0,1' },
        tick
      );

      const success = createActionSuccess(command, tick, { moved: true });
      expect(isActionSuccess(success)).toBe(true);
      expect(isActionFailure(success)).toBe(false);

      const failure = createActionFailure(command, 'Path blocked', tick);
      expect(isActionFailure(failure)).toBe(true);
    });
  });

  describe('Events', () => {
    it('should create public events', () => {
      const agent = createAgent('agent-1');
      const tick = createTick(5);
      const eventId = createEventId('event-1');
      const eventType = createEventType('move', 'Agent Moved', 'movement', true);

      const event = createPublicEvent(eventId, eventType, agent, tick, { from: '0,0', to: '0,1' });
      expect(event.eventType.id).toBe('move');
      expect(canObserveEvent(event, 'any-player')).toBe(true);
    });

    it('should create private events', () => {
      const agent = createAgent('agent-1');
      const tick = createTick(5);
      const eventId = createEventId('event-1');
      const eventType = createEventType('hidden', 'Hidden Action', 'secret', false);

      const event = createPrivateEvent(eventId, eventType, agent, tick, ['player-1'], {
        secret: true,
      });
      expect(canObserveEvent(event, 'player-1')).toBe(true);
      expect(canObserveEvent(event, 'player-2')).toBe(false);
    });
  });

  describe('Perception', () => {
    it('should track position visibility', () => {
      const agent = createAgent('agent-1');
      const pos = createPosition('0,0', 'Tile');
      const vis = createPositionVisibility(pos, VisibilityState.Visible, null, 5);

      expect(vis.state).toBe(VisibilityState.Visible);
      expect(vis.lastSeenTick).toBe(5);
    });

    it('should create fog of war', () => {
      const agent = createAgent('agent-1');
      const pos = createPosition('0,0', 'Tile');
      const vis = createPositionVisibility(pos, VisibilityState.Visible);
      const fog = createFogOfWar(agent, [vis], 5);

      expect(fog.visionRange).toBe(5);
    });

    it('should create observations', () => {
      const agent = createAgent('agent-1');
      const goldType = createResourceType('gold', 'Gold', 'economy');
      const resources = createResourcePool([], [goldType]);
      const agentSnapshot = createAgentSnapshot(agent, null, AgentState.Acting, resources);

      const pos = createPosition('0,0', 'Tile');
      const vis = createPositionVisibility(pos, VisibilityState.Visible);
      const fog = createFogOfWar(agent, [vis]);

      const observation = createObservation(agent, [agentSnapshot], fog, []);
      expect(observation.visibleAgents.length).toBe(1);
    });
  });

  describe('Capabilities and Goals', () => {
    it('should create capabilities', () => {
      const cap = createCapability('move', 'Move', 'movement', true, { energy: 1 }, 0, 0);
      expect(isCapabilityReady(cap)).toBe(true);
    });

    it('should check capability readiness', () => {
      const cap = createCapability('attack', 'Attack', 'combat', true, {}, 5, 5);
      expect(isCapabilityReady(cap)).toBe(false);
    });

    it('should check resource requirements for capabilities', () => {
      const cap = createCapability('cast', 'Cast Spell', 'magic', true, { mana: 50 });
      expect(canUseCapability(cap, { mana: 100 })).toBe(true);
      expect(canUseCapability(cap, { mana: 25 })).toBe(false);
    });

    it('should create goals', () => {
      const goal = createGoal('goal-1', 'Defeat the enemy', 'combat', 10, true);
      expect(goal.active).toBe(true);
      expect(goal.priority).toBe(10);
    });

    it('should create objectives', () => {
      const obj = createObjective(
        'obj-1',
        'Move to position',
        'move-to-position',
        'goal-1',
        false,
        20
      );
      expect(obj.parentGoalId).toBe('goal-1');
      expect(obj.completed).toBe(false);
    });
  });

  describe('World State Integration', () => {
    it('should create complete world state', () => {
      const playerId = createPlayerId('player-1');
      const player = createPlayer(playerId, 'Alice');

      const pos = createPosition('0,0', 'Spawn');
      const map = createGameMap('map-1', 'Main Map', [pos]);

      const agent = createAgent('agent-1');
      const goldType = createResourceType('gold', 'Gold', 'economy');
      const resources = createResourcePool([], [goldType]);
      const agentSnapshot = createAgentSnapshot(agent, playerId, AgentState.Idle, resources);

      const tick = createTick(0);
      const time = createGameTime(tick, null, 'Turn 1');

      const world = createWorldState(time, map, [player], [], [agentSnapshot]);
      expect(world.agents.length).toBe(1);
      expect(getPlayerAgents(world, playerId).length).toBe(1);
    });
  });

  describe('Immutability', () => {
    it('should freeze all created objects', () => {
      const pos = createPosition('0,0', 'Test');
      expect(Object.isFrozen(pos)).toBe(true);

      const tick = createTick(0);
      expect(Object.isFrozen(tick)).toBe(true);
    });

    it('should freeze collections', () => {
      const pos1 = createPosition('0,0', 'A');
      const pos2 = createPosition('0,1', 'B');
      const map = createGameMap('m', 'Map', [pos1, pos2]);
      expect(Object.isFrozen(map.positions)).toBe(true);
    });
  });
});
