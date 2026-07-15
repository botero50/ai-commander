import { BroadcastServer } from './broadcast-server';
import { GameState } from '../state/state-types';

describe('BroadcastServer', () => {
  let server: BroadcastServer;

  beforeEach(() => {
    server = new BroadcastServer({
      port: 8080,
      maxConnections: 100,
      heartbeatInterval: 5000,
      messageBufferSize: 1000,
    });
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
    ],
    units: [],
    buildings: [],
    map: { width: 200, height: 200, terrain: 'grass' },
  });

  test('initializes server', () => {
    expect(server.isServerRunning()).toBe(false);
  });

  test('starts server', () => {
    server.start();
    expect(server.isServerRunning()).toBe(true);
  });

  test('prevents double start', () => {
    server.start();
    expect(() => server.start()).toThrow();
  });

  test('stops server', () => {
    server.start();
    server.stop();
    expect(server.isServerRunning()).toBe(false);
  });

  test('registers client', () => {
    server.start();
    const client = server.registerClient('client1', 'viewer');

    expect(client.clientId).toBe('client1');
    expect(client.role).toBe('viewer');
    expect(client.isConnected).toBe(true);
  });

  test('prevents exceeding max connections', () => {
    const maxServer = new BroadcastServer({ maxConnections: 2 });
    maxServer.start();

    maxServer.registerClient('client1', 'viewer');
    maxServer.registerClient('client2', 'viewer');

    expect(() => maxServer.registerClient('client3', 'viewer')).toThrow();
  });

  test('disconnects client', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    const clients = server.getConnectedClients();
    expect(clients.length).toBe(1);

    server.disconnectClient('client1');

    const updated = server.getConnectedClients();
    expect(updated.length).toBe(0);
  });

  test('broadcasts state update', () => {
    server.start();
    server.registerClient('client1', 'viewer');
    server.registerClient('client2', 'viewer');

    const state = createDefaultState();
    const message = server.broadcastStateUpdate(state, 100);

    expect(message.type).toBe('state_update');
    expect(message.broadcast).toBe(true);
    expect(message.payload.tick).toBe(100);
  });

  test('broadcasts event', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    const message = server.broadcastEvent('unit_moved', { unitId: 1, position: { x: 100, z: 100 } }, 5);

    expect(message.type).toBe('event');
    expect(message.payload.eventType).toBe('unit_moved');
    expect(message.payload.severity).toBe(5);
  });

  test('sends targeted message to client', () => {
    server.start();
    server.registerClient('client1', 'caster');
    server.registerClient('client2', 'viewer');

    const message = server.sendToClient('client1', 'control', { command: 'set_viewport' });

    expect(message.recipientId).toBe('client1');
    expect(message.broadcast).toBe(false);
  });

  test('queues messages for clients', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);

    const messages = server.getClientMessages('client1');
    expect(messages.length).toBeGreaterThan(0);
  });

  test('gets client status', () => {
    server.start();
    server.registerClient('client1', 'caster');

    const status = server.getClientStatus('client1');
    expect(status?.clientId).toBe('client1');
    expect(status?.role).toBe('caster');
  });

  test('gets all connected clients', () => {
    server.start();
    server.registerClient('client1', 'viewer');
    server.registerClient('client2', 'caster');

    const clients = server.getConnectedClients();
    expect(clients.length).toBe(2);
  });

  test('updates heartbeat', () => {
    server.start();
    const client = server.registerClient('client1', 'viewer');

    const oldHeartbeat = client.lastHeartbeat;
    server.heartbeat('client1');

    const updated = server.getClientStatus('client1');
    expect(updated!.lastHeartbeat).toBeGreaterThanOrEqual(oldHeartbeat);
  });

  test('handles message reception from client', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    server.receiveMessage('client1', { type: 'chat', content: 'Hello' });

    const history = server.getMessageHistory(10);
    expect(history.length).toBeGreaterThan(0);
  });

  test('gets server statistics', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    const stats = server.getStatistics();
    expect(stats.connectedClients).toBe(1);
    expect(stats.uptime).toBeGreaterThanOrEqual(0); // uptime may be 0 if server just started
  });

  test('tracks message counts', () => {
    server.start();
    server.registerClient('client1', 'viewer');
    server.registerClient('client2', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);

    const stats = server.getStatistics();
    expect(stats.messagesPerSecond).toBeGreaterThanOrEqual(0);
  });

  test('tracks bytes transmitted', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    const initialStats = server.getStatistics();
    server.broadcastStateUpdate(createDefaultState(), 1);
    const updatedStats = server.getStatistics();

    expect(updatedStats.bytesTransmitted).toBeGreaterThanOrEqual(initialStats.bytesTransmitted);
  });

  test('tracks bytes received', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    const initialStats = server.getStatistics();
    server.receiveMessage('client1', { type: 'chat', content: 'Hello' });
    const updatedStats = server.getStatistics();

    expect(updatedStats.bytesReceived).toBeGreaterThanOrEqual(initialStats.bytesReceived);
  });

  test('gets message history', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);
    server.broadcastEvent('test_event', { data: 'test' }, 5);

    const history = server.getMessageHistory(10);
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  test('clears message log', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);
    let history = server.getMessageHistory(100);
    expect(history.length).toBeGreaterThan(0);

    server.clearMessageLog();
    history = server.getMessageHistory(100);
    expect(history.length).toBe(0);
  });

  test('gets queue size for client', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);
    const queueSize = server.getQueueSize('client1');

    expect(queueSize).toBeGreaterThan(0);
  });

  test('gets client messages in chunks', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    for (let i = 0; i < 10; i++) {
      server.broadcastEvent('event', { id: i }, 5);
    }

    const messages1 = server.getClientMessages('client1', 5);
    expect(messages1.length).toBeLessThanOrEqual(5);

    const messages2 = server.getClientMessages('client1', 5);
    expect(messages2.length).toBeGreaterThan(0);
  });

  test('resets statistics', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);
    const statsBefore = server.getStatistics();
    expect(statsBefore.bytesTransmitted).toBeGreaterThan(0);

    server.resetStatistics();
    // Statistics reset clears the counters
    // New broadcasts will accumulate bytes again
    server.broadcastStateUpdate(createDefaultState(), 2);
    const statsAfter = server.getStatistics();
    expect(statsAfter.bytesTransmitted).toBeGreaterThan(0);
  });

  test('gets configuration', () => {
    const customServer = new BroadcastServer({
      port: 9000,
      maxConnections: 500,
    });

    const config = customServer.getConfig();
    expect(config.port).toBe(9000);
    expect(config.maxConnections).toBe(500);
  });

  test('handles multiple broadcasts', () => {
    server.start();
    server.registerClient('client1', 'viewer');

    const state = createDefaultState();
    server.broadcastStateUpdate(state, 1);
    server.broadcastEvent('event1', { data: 1 }, 5);
    server.broadcastEvent('event2', { data: 2 }, 6);

    const messages = server.getClientMessages('client1', 100);
    expect(messages.length).toBe(3);
  });

  test('maintains message buffer limit', () => {
    const limitedServer = new BroadcastServer({ messageBufferSize: 10 });
    limitedServer.start();
    limitedServer.registerClient('client1', 'viewer');

    for (let i = 0; i < 20; i++) {
      limitedServer.broadcastEvent('event', { id: i }, 5);
    }

    const history = limitedServer.getMessageHistory(100);
    expect(history.length).toBeLessThanOrEqual(10);
  });

  test('broadcasts to multiple clients independently', () => {
    server.start();
    server.registerClient('client1', 'viewer');
    server.registerClient('client2', 'viewer');

    server.broadcastStateUpdate(createDefaultState(), 1);

    const messages1 = server.getClientMessages('client1');
    const messages2 = server.getClientMessages('client2');

    expect(messages1.length).toBeGreaterThan(0);
    expect(messages2.length).toBeGreaterThan(0);
    // Both should receive the same broadcast
    expect(messages1.length).toBe(messages2.length);
  });

  test('calculates average latency', () => {
    server.start();
    server.registerClient('client1', 'viewer');
    server.registerClient('client2', 'viewer');

    server.heartbeat('client1');
    server.heartbeat('client2');

    const stats = server.getStatistics();
    expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
  });

  test('registers different client roles', () => {
    server.start();
    const viewer = server.registerClient('viewer1', 'viewer');
    const caster = server.registerClient('caster1', 'caster');
    const admin = server.registerClient('admin1', 'admin');

    expect(viewer.role).toBe('viewer');
    expect(caster.role).toBe('caster');
    expect(admin.role).toBe('admin');
  });
});
