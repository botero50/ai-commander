/**
 * EPIC 61.2 Integration Example
 *
 * Shows how to wire BroadcastState to Arena loop for real-time broadcast data.
 *
 * Usage:
 *   const broadcastState = new BroadcastState(logger);
 *   await broadcastState.initialize({
 *     arena,
 *     matchPersistence,
 *     brain,
 *     commentary,
 *     eventBus,
 *   });
 *
 *   // Build state when match starts
 *   const state = await broadcastState.buildState(matchId);
 *
 *   // Subscribe to updates
 *   broadcastState.onStateUpdated((state) => {
 *     console.log('New broadcast state:', state.match.players[0].resources);
 *   });
 */

import { BroadcastState, BroadcastStreamState } from './broadcast-state.js';
import { Logger } from '../config/logger.js';

// === EXAMPLE: Wire to Arena Loop ===

export async function integrateWithArenaLoop(
  logger: Logger,
  config: {
    arena: any;
    matchPersistence: any;
    brain: any;
    commentary: any;
    eventBus: any;
  }
): Promise<BroadcastState> {
  const broadcastState = new BroadcastState(logger);

  // Initialize with all data sources
  await broadcastState.initialize({
    arena: config.arena,
    matchPersistence: config.matchPersistence,
    brain: config.brain,
    commentary: config.commentary,
    eventBus: config.eventBus,
  });

  // Subscribe to state updates
  broadcastState.onStateUpdated((state: BroadcastStreamState) => {
    logger.info('📺 Broadcast state updated', {
      matchId: state.match.matchId,
      tick: state.match.currentTick,
      players: state.match.players.map(p => ({
        name: p.name,
        resources: `W:${p.resources.wood} S:${p.resources.stone}`,
        units: p.units,
      })),
    });

    // Send to broadcast overlay via WebSocket
    broadcastToBrowserSource(state);
  });

  return broadcastState;
}

// === EXAMPLE: Use with Real Arena Match ===

export async function broadcastArenaMatch(
  logger: Logger,
  config: any,
  matchId: string
): Promise<void> {
  const broadcastState = await integrateWithArenaLoop(logger, config);

  try {
    // Build initial state
    const initialState = await broadcastState.buildState(matchId);

    logger.info('🎬 Match broadcast started', {
      match: initialState.match.matchId,
      map: initialState.match.map.displayName,
      players: initialState.match.players.map(p => p.name),
    });

    // Periodically rebuild state (every 5 seconds for demo)
    const stateRefreshInterval = setInterval(async () => {
      try {
        const state = await broadcastState.buildState(matchId);

        if (state.match.state === 'ended') {
          logger.info('🏁 Match ended, stopping broadcast', {
            winner: state.match.result?.winner.name,
          });
          clearInterval(stateRefreshInterval);
          broadcastState.disconnect();
        }
      } catch (error) {
        logger.error('Failed to refresh broadcast state', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 5000);
  } catch (error) {
    logger.error('Failed to start broadcast', {
      error: error instanceof Error ? error.message : String(error),
    });
    broadcastState.disconnect();
  }
}

// === EXAMPLE: WebSocket to Browser Source ===

function broadcastToBrowserSource(state: BroadcastStreamState): void {
  // In real scenario, send via WebSocket to OBS Browser Source
  // For now, log what would be sent

  const broadcastPayload = {
    match: {
      id: state.match.matchId,
      map: state.match.map.displayName,
      state: state.match.state,
      tick: state.match.currentTick,
    },
    players: state.match.players.map(p => ({
      id: p.id,
      name: p.name,
      civilization: p.civilization,
      faction: p.faction,
      resources: {
        wood: p.resources.wood,
        stone: p.resources.stone,
        food: p.resources.food,
        metal: p.resources.metal,
      },
      units: p.units,
      buildings: p.buildings,
      population: p.population,
      militaryValue: p.militaryValue,
      objective: p.objective,
      confidence: p.confidence,
      trashTalk: p.currentTrashTalk?.message,
    })),
    events: state.recentEvents,
    timestamp: state.timestamp,
  };

  // console.log('📡 Broadcasting to OBS:', broadcastPayload);
  // ws.send(JSON.stringify(broadcastPayload));
}

// === EXAMPLE: Build Dashboard from Broadcast State ===

export function formatBroadcastStateForDashboard(
  state: BroadcastStreamState
): string {
  const match = state.match;

  let dashboard = `
╔═══════════════════════════════════════════════════════════════╗
║                    AI COMMANDER BROADCAST                    ║
╚═══════════════════════════════════════════════════════════════╝

Match: ${match.matchId}
Map: ${match.map.displayName} (${match.map.players}p)
Status: ${match.state.toUpperCase()}
Tick: ${match.currentTick} / ~${match.estimatedDuration || '?'}s

`;

  // Player stats
  for (const player of match.players) {
    dashboard += `
Player ${player.id}: ${player.name} (${player.civilization})
├─ Resources: W:${player.resources.wood} S:${player.resources.stone} F:${player.resources.food} M:${player.resources.metal}
├─ Units: ${player.units} | Buildings: ${player.buildings} | Population: ${player.population}
├─ Military Value: ${player.militaryValue}
├─ Objective: ${player.objective || 'Unknown'}
├─ Confidence: ${player.confidence ? (player.confidence * 100).toFixed(0) + '%' : 'N/A'}
└─ Trash Talk: "${player.currentTrashTalk?.message || 'Silence...'}"

`;
  }

  // Match result if ended
  if (match.result) {
    dashboard += `
RESULT:
├─ Winner: ${match.result.winner.name} (${match.result.winner.civilization})
├─ Duration: ${match.result.duration}s
└─ Reason: ${match.result.reason}
`;
  }

  return dashboard;
}

// === EXAMPLE: Export for React Component ===

export function getBroadcastDataForReact(
  state: BroadcastStreamState
): Record<string, any> {
  return {
    matchId: state.match.matchId,
    map: {
      name: state.match.map.displayName,
      players: state.match.map.players,
    },
    players: state.match.players.map(p => ({
      id: p.id,
      name: p.name,
      civilization: p.civilization,
      faction: p.faction,
      resources: p.resources,
      units: p.units,
      buildings: p.buildings,
      population: p.population,
      militaryValue: p.militaryValue,
      ai: {
        objective: p.objective,
        confidence: p.confidence,
        provider: p.provider,
        model: p.model,
        latency: p.latency,
      },
      trashTalk: p.currentTrashTalk,
    })),
    state: state.match.state,
    currentTick: state.match.currentTick,
    result: state.match.result,
    recentEvents: state.recentEvents,
  };
}
