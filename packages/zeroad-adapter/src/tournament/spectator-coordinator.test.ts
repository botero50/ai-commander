import { SpectatorCoordinator } from './spectator-coordinator';
import { GameState, Unit, Building } from '../state/state-types';

describe('SpectatorCoordinator', () => {
  let coordinator: SpectatorCoordinator;

  beforeEach(() => {
    coordinator = new SpectatorCoordinator('broadcast_1');
  });

  const createDefaultState = (): GameState => ({
    tick: 0,
    timestamp: 0,
    players: [
      {
        id: 1,
        name: 'Alice',
        civ: 'Britons',
        color: 'blue',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 2: 'neutral' },
      },
      {
        id: 2,
        name: 'Bob',
        civ: 'Athenians',
        color: 'red',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 1: 'neutral' },
      },
    ],
    units: [],
    buildings: [],
    map: { width: 200, height: 200, terrain: 'grass' },
  });

  test('initializes coordinator', () => {
    const state = coordinator.getBroadcastState();
    expect(state.broadcastId).toBe('broadcast_1');
    expect(state.isLive).toBe(false);
    expect(state.spectatorCount).toBe(0);
  });

  test('registers spectator', () => {
    const session = coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    expect(session.spectatorId).toBe('spec1');
    expect(session.name).toBe('Viewer 1');
    expect(session.role).toBe('viewer');
    expect(session.isActive).toBe(true);
  });

  test('tracks spectator count', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    let state = coordinator.getBroadcastState();
    expect(state.spectatorCount).toBe(1);

    coordinator.registerSpectator('spec2', 'Viewer 2', 'viewer');
    state = coordinator.getBroadcastState();
    expect(state.spectatorCount).toBe(2);
  });

  test('registers caster with proper role', () => {
    coordinator.registerSpectator('caster1', 'Caster 1', 'caster');
    const state = coordinator.getBroadcastState();
    expect(state.casterSpectators).toContain('caster1');
  });

  test('removes spectator', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    expect(coordinator.getBroadcastState().spectatorCount).toBe(1);

    coordinator.removeSpectator('spec1');
    expect(coordinator.getBroadcastState().spectatorCount).toBe(0);
  });

  test('updates viewport', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');

    const viewport = coordinator.updateViewport('spec1', { x: 100, z: 100 }, 1.5);
    expect(viewport.position.x).toBe(100);
    expect(viewport.position.z).toBe(100);
    expect(viewport.zoom).toBe(1.5);
  });

  test('clamps viewport values', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');

    const viewport = coordinator.updateViewport('spec1', { x: 300, z: 300 }, 5.0);
    expect(viewport.position.x).toBe(200); // max = 200
    expect(viewport.position.z).toBe(200);
    expect(viewport.zoom).toBe(3.0); // max = 3.0
  });

  test('sets viewport mode', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.setViewportMode('spec1', 'cinematic');

    const session = coordinator.getSession('spec1');
    expect(session?.viewportMode).toBe('cinematic');
  });

  test('follows player', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.followPlayer('spec1', 1);

    const session = coordinator.getSession('spec1');
    expect(session?.viewportMode).toBe('follow_player');
    expect(session?.focusedPlayerId).toBe(1);
  });

  test('records broadcast events', () => {
    const event = coordinator.recordEvent('unit_moved', Date.now(), { x: 100, z: 100 }, 5, 'Unit moved');

    expect(event.type).toBe('unit_moved');
    expect(event.severity).toBe(5);
  });

  test('records events with severity bounds', () => {
    const event1 = coordinator.recordEvent('test', Date.now(), { x: 0, z: 0 }, 20, 'High severity');
    expect(event1.severity).toBe(10); // clamped to max

    const event2 = coordinator.recordEvent('test', Date.now(), { x: 0, z: 0 }, -5, 'Low severity');
    expect(event2.severity).toBe(1); // clamped to min
  });

  test('maintains event queue limit', () => {
    for (let i = 0; i < 1100; i++) {
      coordinator.recordEvent('test', Date.now() + i, { x: 0, z: 0 }, 5, `Event ${i}`);
    }

    const history = coordinator.getEventHistory();
    expect(history.length).toBeLessThanOrEqual(1000);
  });

  test('starts and stops broadcast', () => {
    let state = coordinator.getBroadcastState();
    expect(state.isLive).toBe(false);

    coordinator.startBroadcast(true);
    state = coordinator.getBroadcastState();
    expect(state.isLive).toBe(true);
    expect(state.recordingActive).toBe(true);

    coordinator.stopBroadcast();
    state = coordinator.getBroadcastState();
    expect(state.isLive).toBe(false);
  });

  test('gets session information', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer', 15);

    const session = coordinator.getSession('spec1');
    expect(session?.bandwidth).toBe(15);
    expect(session?.quality).toBe('high');
  });

  test('gets all sessions', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.registerSpectator('spec2', 'Viewer 2', 'caster');

    const sessions = coordinator.getAllSessions();
    expect(sessions.length).toBe(2);
  });

  test('gets viewport state', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.updateViewport('spec1', { x: 100, z: 100 }, 1.5);

    const viewport = coordinator.getViewport('spec1');
    expect(viewport?.position.x).toBe(100);
    expect(viewport?.zoom).toBe(1.5);
  });

  test('generates view update', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    const state = createDefaultState();

    const update = coordinator.generateViewUpdate('spec1', state);
    expect(update.spectatorId).toBe('spec1');
    expect(update.gameState).toBeDefined();
    expect(update.broadcastState).toBeDefined();
    expect(update.viewportState).toBeDefined();
  });

  test('adjusts quality based on bandwidth', () => {
    const session = coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer', 10);
    expect(session.quality).toBe('high');

    coordinator.adjustQuality('spec1', 1);
    const updated = coordinator.getSession('spec1');
    expect(updated?.quality).toBe('low');
  });

  test('updates latency', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.updateLatency('spec1', 100);

    const session = coordinator.getSession('spec1');
    expect(session?.latency).toBe(100);
  });

  test('gets event history', () => {
    const now = Date.now();
    coordinator.recordEvent('event1', now - 1000, { x: 0, z: 0 }, 5, 'Old event');
    coordinator.recordEvent('event2', now, { x: 0, z: 0 }, 5, 'New event');

    const allEvents = coordinator.getEventHistory();
    expect(allEvents.length).toBe(2);

    const recentEvents = coordinator.getEventHistory(now - 500);
    expect(recentEvents.length).toBe(1);
  });

  test('gets statistics', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer', 10);
    coordinator.registerSpectator('spec2', 'Caster 1', 'caster', 20);

    const stats = coordinator.getStatistics();
    expect(stats.totalSpectators).toBe(2);
    expect(stats.casters).toBe(1);
    expect(stats.avgBandwidth).toBeGreaterThan(0);
  });

  test('broadcasts caster viewport to viewers', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.registerSpectator('caster1', 'Caster 1', 'caster');

    coordinator.updateViewport('caster1', { x: 150, z: 150 }, 2.0);

    const broadcastState = coordinator.getBroadcastState();
    expect(broadcastState.targetViewport?.position.x).toBe(150);
  });

  test('handles multiple spectator viewports independently', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.registerSpectator('spec2', 'Viewer 2', 'viewer');

    coordinator.updateViewport('spec1', { x: 100, z: 100 }, 1.0);
    coordinator.updateViewport('spec2', { x: 150, z: 150 }, 2.0);

    const viewport1 = coordinator.getViewport('spec1');
    const viewport2 = coordinator.getViewport('spec2');

    expect(viewport1?.position.x).toBe(100);
    expect(viewport2?.position.x).toBe(150);
  });

  test('follows player and generates appropriate viewport', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.followPlayer('spec1', 1);

    const state = createDefaultState();
    const update = coordinator.generateViewUpdate('spec1', state);

    expect(update.viewportState.zoom).toBe(1.5); // Follow mode zoom
  });

  test('resets coordinator state', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.startBroadcast();
    coordinator.recordEvent('test', Date.now(), { x: 0, z: 0 }, 5);

    coordinator.reset();

    const state = coordinator.getBroadcastState();
    expect(state.spectatorCount).toBe(0);
    expect(state.isLive).toBe(false);
    expect(state.eventQueue.length).toBe(0);
  });

  test('tracks spectator join times', () => {
    const before = Date.now();
    const session = coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    const after = Date.now();

    expect(session.joinedAt).toBeGreaterThanOrEqual(before);
    expect(session.joinedAt).toBeLessThanOrEqual(after);
  });

  test('handles analyst role', () => {
    coordinator.registerSpectator('analyst1', 'Analyst 1', 'analyst');
    const state = coordinator.getBroadcastState();
    expect(state.casterSpectators).toContain('analyst1');
  });

  test('handles admin role', () => {
    const session = coordinator.registerSpectator('admin1', 'Admin 1', 'admin');
    expect(session.role).toBe('admin');
  });

  test('broadcast state reflects active spectators', () => {
    coordinator.registerSpectator('spec1', 'Viewer 1', 'viewer');
    coordinator.registerSpectator('spec2', 'Viewer 2', 'viewer');

    let state = coordinator.getBroadcastState();
    expect(state.activeSpectators.length).toBe(2);

    coordinator.removeSpectator('spec1');
    state = coordinator.getBroadcastState();
    expect(state.activeSpectators.length).toBe(1);
  });
});
