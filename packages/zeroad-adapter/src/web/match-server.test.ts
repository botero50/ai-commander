/**
 * Test: Match Server
 *
 * Validates:
 * 1. Client registration and unregistration
 * 2. Event broadcasting to clients
 * 3. Connection management
 * 4. Dead client removal
 * 5. Viewer subscription handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchServer } from './match-server.ts';
import { MatchViewerManager, MatchViewer } from './match-viewer.js';
import type { MatchClient } from './match-server.js';

describe('Match Server', () => {
  let server: MatchServer;
  let viewerManager: MatchViewerManager;

  beforeEach(() => {
    viewerManager = new MatchViewerManager();
    server = new MatchServer(viewerManager, {
      port: 3000,
      host: 'localhost',
      enableLogging: false,
    });
  });

  it('should initialize with config', () => {
    const config = server.getConfig();
    expect(config.port).toBe(3000);
    expect(config.host).toBe('localhost');
  });

  it('should register a client', () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    const mockClient: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    server.registerClient('match1', mockClient);

    expect(server.getClientCount('match1')).toBe(1);
    expect(server.hasClients('match1')).toBe(true);
  });

  it('should track multiple clients', () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    const client1: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    const client2: MatchClient = {
      clientId: 'client2',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    server.registerClient('match1', client1);
    server.registerClient('match1', client2);

    expect(server.getClientCount('match1')).toBe(2);
    expect(server.getTotalClientCount()).toBe(2);
  });

  it('should unregister a client', () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    const client: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    server.registerClient('match1', client);
    expect(server.getClientCount('match1')).toBe(1);

    server.unregisterClient('match1', client);
    expect(server.getClientCount('match1')).toBe(0);
  });

  it('should send initial state on client registration', () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');
    viewer.updateState({ currentTick: 50 });

    const sentMessages: (string | Buffer)[] = [];

    const client: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: (data) => {
        sentMessages.push(data);
      },
      close: () => {},
    };

    server.registerClient('match1', client);

    expect(sentMessages).toHaveLength(1);
    const message = JSON.parse(sentMessages[0] as string);
    expect(message.type).toBe('initial_state');
    expect(message.data.currentTick).toBe(50);
  });

  it('should broadcast events to all clients', async () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    const messages1: (string | Buffer)[] = [];
    const messages2: (string | Buffer)[] = [];

    const client1: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: (data) => {
        messages1.push(data);
      },
      close: () => {},
    };

    const client2: MatchClient = {
      clientId: 'client2',
      matchId: 'match1',
      send: (data) => {
        messages2.push(data);
      },
      close: () => {},
    };

    server.registerClient('match1', client1);
    server.registerClient('match1', client2);

    // Clear initial state messages
    messages1.splice(0);
    messages2.splice(0);

    // Trigger an event
    viewer.updateState({ currentTick: 10 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Both clients should receive the event (after initial state)
    expect(messages1.length).toBeGreaterThan(0);
    expect(messages2.length).toBeGreaterThan(0);
  });

  it('should list active matches', () => {
    viewerManager.createViewer('match1', 'Brain1', 'Brain2');
    viewerManager.createViewer('match2', 'Brain3', 'Brain4');

    const client1: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    const client2: MatchClient = {
      clientId: 'client2',
      matchId: 'match2',
      send: () => {},
      close: () => {},
    };

    server.registerClient('match1', client1);
    server.registerClient('match2', client2);

    const activeMatches = server.getActiveMatches();
    expect(activeMatches).toHaveLength(2);
    expect(activeMatches).toContain('match1');
    expect(activeMatches).toContain('match2');
  });

  it('should disconnect all clients from a match', () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    let closed = 0;

    const client1: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {
        closed++;
      },
    };

    const client2: MatchClient = {
      clientId: 'client2',
      matchId: 'match1',
      send: () => {},
      close: () => {
        closed++;
      },
    };

    server.registerClient('match1', client1);
    server.registerClient('match1', client2);

    expect(server.getClientCount('match1')).toBe(2);

    server.disconnectMatch('match1');

    expect(server.getClientCount('match1')).toBe(0);
    expect(closed).toBe(2);
  });

  it('should handle clients on different matches independently', () => {
    viewerManager.createViewer('match1', 'Brain1', 'Brain2');
    viewerManager.createViewer('match2', 'Brain3', 'Brain4');

    const client1: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    const client2: MatchClient = {
      clientId: 'client2',
      matchId: 'match2',
      send: () => {},
      close: () => {},
    };

    server.registerClient('match1', client1);
    server.registerClient('match2', client2);

    expect(server.getClientCount('match1')).toBe(1);
    expect(server.getClientCount('match2')).toBe(1);

    server.unregisterClient('match1', client1);

    expect(server.getClientCount('match1')).toBe(0);
    expect(server.getClientCount('match2')).toBe(1);
  });

  it('should handle client send errors gracefully', async () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    let closed = 0;

    const goodClient: MatchClient = {
      clientId: 'good',
      matchId: 'match1',
      send: () => {}, // Works fine
      close: () => {},
    };

    const badClient: MatchClient = {
      clientId: 'bad',
      matchId: 'match1',
      send: () => {
        throw new Error('Send failed');
      },
      close: () => {
        closed++;
      },
    };

    server.registerClient('match1', goodClient);
    server.registerClient('match1', badClient);

    // Clear initial states
    goodClient.send = () => {};

    // Trigger event - bad client should be removed
    viewer.updateState({ currentTick: 5 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Bad client should be disconnected
    expect(server.getClientCount('match1')).toBe(1);
    expect(closed).toBe(1);
  });

  it('should cleanup subscriptions when last client disconnects', () => {
    const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');

    const client: MatchClient = {
      clientId: 'client1',
      matchId: 'match1',
      send: () => {},
      close: () => {},
    };

    server.registerClient('match1', client);
    expect(server.hasClients('match1')).toBe(true);

    server.unregisterClient('match1', client);
    expect(server.hasClients('match1')).toBe(false);

    // Verify no subscription still active (would broadcast to nothing)
    const activeMatches = server.getActiveMatches();
    expect(activeMatches).not.toContain('match1');
  });

  it('should support multiple matches with clients', () => {
    viewerManager.createViewer('match1', 'Brain1', 'Brain2');
    viewerManager.createViewer('match2', 'Brain3', 'Brain4');
    viewerManager.createViewer('match3', 'Brain5', 'Brain6');

    const clients = [
      { clientId: 'c1', matchId: 'match1' },
      { clientId: 'c2', matchId: 'match1' },
      { clientId: 'c3', matchId: 'match2' },
      { clientId: 'c4', matchId: 'match3' },
      { clientId: 'c5', matchId: 'match3' },
    ];

    for (const clientInfo of clients) {
      const client: MatchClient = {
        ...clientInfo,
        send: () => {},
        close: () => {},
      };
      server.registerClient(clientInfo.matchId, client);
    }

    expect(server.getTotalClientCount()).toBe(5);
    expect(server.getClientCount('match1')).toBe(2);
    expect(server.getClientCount('match2')).toBe(1);
    expect(server.getClientCount('match3')).toBe(2);
  });
});
