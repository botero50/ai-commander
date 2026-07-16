# EPIC 33: Streaming & Broadcast - IMPLEMENTATION PLAN

## Overview

Enable real-time tournament streaming with live standings, match progress, and spectator engagement features. Integrates EPIC 32 tournament engine with WebSocket-based broadcast infrastructure.

**Dependencies:** EPIC 32 (tournament engine complete)  
**Estimated Duration:** 2 sprints (2 weeks)  
**Team Size:** 1-2 developers  
**Risk Level:** MEDIUM (WebSocket coordination)

---

## Strategic Context

### Why This EPIC?

EPIC 32 runs tournaments, but results are batch-only (end-of-tournament). EPIC 33 enables:
- **Live streaming** of tournament progress
- **Real-time standings** updates during tournament
- **Spectator engagement** (viewer counts, commentary triggers)
- **Broadcasting workflows** (OBS/Twitch integration)
- **Analytics collection** for research platform

### What It Enables

Once EPIC 33 is complete:
- ✅ Stream tournaments live to viewers
- ✅ Real-time bracket/standings display
- ✅ Automated broadcast overlays
- ✅ Viewer statistics and engagement
- ✅ Archive and replay functionality
- ✅ Research data collection (EPIC 34)

---

## Success Criteria

### Definition of Done

- [ ] WebSocket server for real-time updates
- [ ] Tournament stream sends match events to subscribers
- [ ] Live standings broadcast after each match
- [ ] Multiple concurrent streams supported
- [ ] 100+ simultaneous connections handled
- [ ] Reconnection/recovery on dropped connections
- [ ] Stream state persistence (can resume after disconnect)
- [ ] Spectator statistics collection
- [ ] Archive recording of all streams
- [ ] Integration with EPIC 32 tournament executor
- [ ] 30+ tests with >75% coverage
- [ ] Latency < 500ms from match completion to broadcast

---

## Architecture Design

```
┌──────────────────────────────────────────────────────────┐
│                   Tournament Executor                     │
│              (EPIC 32 - Match Orchestration)             │
└────────────────┬─────────────────────────────────────────┘
                 │ (match events)
                 ↓
┌──────────────────────────────────────────────────────────┐
│               Stream Coordinator                          │
│  - Collect tournament events                             │
│  - Manage broadcast state                                │
│  - Track connected streams                               │
└────────────────┬─────────────────────────────────────────┘
                 │ (normalized events)
                 ↓
┌──────────────────────────────────────────────────────────┐
│            WebSocket Broadcast Hub                        │
│  - Maintain client connections                           │
│  - Distribute events to subscribers                      │
│  - Handle backpressure and reconnection                  │
└────────────────┬─────────────────────────────────────────┘
                 │ (real-time updates)
                 ↓
┌──────────────────────────────────────────────────────────┐
│              Broadcast Consumers                          │
│  - Web UI (live standings, leaderboard)                  │
│  - OBS websocket plugin (overlay data)                   │
│  - Archive system (record all events)                    │
│  - Analytics collector (spectator data)                  │
└──────────────────────────────────────────────────────────┘
```

## Stories

### Story 33.1: Stream Coordinator (3-4 days)

**Responsibility**: Collect tournament events and manage broadcast state

**Deliverables**:
- `stream-coordinator.ts` (250 lines)
- TournamentStreamCoordinator class
- Event collection from tournament executor
- Broadcast state management
- Subscriber registration/unregistration

**Interfaces**:
```typescript
interface TournamentStreamEvent {
  readonly type: 'tournament-start' | 'match-start' | 'match-complete' | 'tournament-end';
  readonly tournamentId: string;
  readonly timestamp: number;
  readonly data: any;
}

interface StreamCoordinator {
  registerSubscriber(id: string, handler: (event: TournamentStreamEvent) => void): void;
  unregisterSubscriber(id: string): void;
  publishEvent(event: TournamentStreamEvent): void;
  getStreamState(): StreamState;
}
```

**Tests**:
- Event publishing to subscribers
- Subscriber registration/unregistration
- Multiple concurrent subscribers
- Stream state tracking
- Error handling for subscriber callbacks

### Story 33.2: WebSocket Broadcast Hub (4-5 days)

**Responsibility**: Manage WebSocket connections and distribute events

**Deliverables**:
- `websocket-hub.ts` (300 lines)
- WebSocketHub class using ws library
- Client connection management
- Event broadcasting to all connected clients
- Backpressure handling
- Graceful disconnection

**Features**:
```typescript
interface WebSocketHub {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  broadcast(event: TournamentStreamEvent): void;
  getConnectedCount(): number;
  getConnectionStats(): { connected: number; total: number; avgLatency: number };
}
```

**Tests**:
- Connection accept/reject
- Event broadcast to multiple clients
- Client disconnection handling
- Reconnection logic
- Latency measurement
- Load handling (100+ concurrent connections)
- Memory cleanup on disconnect

### Story 33.3: Spectator Statistics (3-4 days)

**Responsibility**: Track viewer engagement and participation

**Deliverables**:
- `spectator-tracker.ts` (200 lines)
- SpectatorTracker class
- Connection/disconnection logging
- Session duration tracking
- View count history
- Peak viewer metrics

**Data Collected**:
```typescript
interface SpectatorMetrics {
  readonly streamId: string;
  readonly totalConnections: number;
  readonly peakViewers: number;
  readonly avgDuration: number;
  readonly totalViewMinutes: number;
  readonly bounceRate: number;
}
```

**Tests**:
- Connection tracking
- Session duration calculation
- Peak viewer detection
- Metrics aggregation
- Time-series data collection

### Story 33.4: Stream Persistence & Archive (4 days)

**Responsibility**: Record and archive streams for replay

**Deliverables**:
- `stream-archiver.ts` (200 lines)
- StreamArchiver class
- Event log writing
- Archive indexing
- Replay data retrieval
- Compression support

**Features**:
```typescript
interface StreamArchive {
  readonly tournamentId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly eventCount: number;
  readonly duration: number;
}

interface Archiver {
  recordEvent(event: TournamentStreamEvent): Promise<void>;
  getArchive(tournamentId: string): Promise<StreamArchive>;
  replayEvents(tournamentId: string): AsyncIterable<TournamentStreamEvent>;
}
```

**Tests**:
- Event logging
- Archive creation
- Replay retrieval
- Data integrity
- Large archive handling

### Story 33.5: Broadcast Callbacks Integration (2-3 days)

**Responsibility**: Integrate with EPIC 32 executor callbacks

**Deliverables**:
- Integration layer connecting TournamentExecutor callbacks to StreamCoordinator
- Event mapping from executor to broadcast events
- Real-time standings update emission
- Match progress tracking

**Integration Points**:
```typescript
const executorCallbacks = {
  onMatchStart: (match) => coordinator.publishEvent({
    type: 'match-start',
    data: match,
  }),
  onMatchComplete: (match) => {
    coordinator.publishEvent({
      type: 'match-complete',
      data: match,
    });
    // Update standings
  },
  onProgress: (completed, total) => {
    // Emit progress update
  },
};
```

**Tests**:
- Callback invocation mapping
- Event transformation
- Timing accuracy
- State consistency

### Story 33.6: Broadcasting Workflow & CLI (3-4 days)

**Responsibility**: End-to-end broadcast orchestration

**Deliverables**:
- `broadcast-cli.ts` (250 lines)
- BroadcastCLI class
- Tournament + stream unified startup
- Status monitoring
- Graceful shutdown

**Workflow**:
```
1. Start broadcast hub (WebSocket server)
2. Start tournament executor
3. Connect executor callbacks to stream coordinator
4. Wire coordinator to WebSocket hub
5. Start archiver (if enabled)
6. Start metrics collector (if enabled)
7. Monitor and report status
8. Graceful shutdown on completion or error
```

**Tests**:
- Full broadcast workflow
- Concurrent streaming and execution
- Error recovery
- Status reporting
- Resource cleanup

---

## Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| WebSocket | `ws` library | Native Node.js support, production-ready |
| Event Bus | Custom pub/sub | Lightweight, no external deps |
| Persistence | File-based JSON | Simplicity; upgrade to DB if needed |
| Compression | gzip | For archive storage |
| Testing | Vitest | Consistent with codebase |

---

## Type Definitions

```typescript
// Stream events
type TournamentStreamEvent =
  | TournamentStartEvent
  | MatchStartEvent
  | MatchCompleteEvent
  | TournamentEndEvent;

interface TournamentStartEvent {
  readonly type: 'tournament-start';
  readonly tournamentId: string;
  readonly tournamentName: string;
  readonly playerCount: number;
  readonly totalMatches: number;
  readonly timestamp: number;
}

interface MatchStartEvent {
  readonly type: 'match-start';
  readonly matchId: string;
  readonly white: string;
  readonly black: string;
  readonly round: number;
  readonly timestamp: number;
}

interface MatchCompleteEvent {
  readonly type: 'match-complete';
  readonly matchId: string;
  readonly result: 'white-win' | 'black-win' | 'draw';
  readonly moveCount: number;
  readonly standings: readonly PlayerStandings[];
  readonly timestamp: number;
}

interface TournamentEndEvent {
  readonly type: 'tournament-end';
  readonly tournamentId: string;
  readonly finalStandings: readonly PlayerStandings[];
  readonly duration: number;
  readonly totalMatches: number;
  readonly timestamp: number;
}

// Stream state
interface StreamState {
  readonly isActive: boolean;
  readonly currentTournament: TournamentConfig | null;
  readonly matchesCompleted: number;
  readonly totalMatches: number;
  readonly connectedViewers: number;
}
```

---

## Implementation Order

1. **Week 1**:
   - Story 33.1: Stream Coordinator (events and state)
   - Story 33.2: WebSocket Hub (server and connections)

2. **Week 2**:
   - Story 33.3: Spectator Statistics
   - Story 33.4: Stream Persistence
   - Story 33.5: Executor Integration
   - Story 33.6: CLI and Workflow

---

## Testing Strategy

### Unit Tests by Story

**Story 33.1 (Coordinator)**:
- Event publishing to subscribers
- Subscriber registration
- Duplicate subscriber rejection
- Unregistration
- Stream state accuracy
- 15+ tests

**Story 33.2 (Hub)**:
- WebSocket server startup
- Client connection handling
- Event broadcasting
- Disconnection handling
- Load testing (100+ connections)
- Latency measurement
- 20+ tests

**Story 33.3 (Spectator)**:
- Connection/disconnection tracking
- Session duration
- Peak viewer detection
- Metrics aggregation
- 15+ tests

**Story 33.4 (Archive)**:
- Event logging
- Archive retrieval
- Replay accuracy
- Data integrity
- 15+ tests

**Story 33.5 (Integration)**:
- Callback mapping
- Event transformation
- Timing accuracy
- State consistency
- 10+ tests

**Story 33.6 (CLI)**:
- Workflow startup
- Status reporting
- Graceful shutdown
- Error recovery
- 10+ tests

**Total**: 85+ tests

### Integration Tests
- Full tournament broadcast from start to finish
- Multiple concurrent tournaments
- Viewer connection during active stream
- Archive replay accuracy

---

## Success Metrics

- ✅ 85+ tests passing with >75% coverage
- ✅ WebSocket broadcasts within 500ms of match completion
- ✅ Support 100+ simultaneous viewers
- ✅ Tournament and streaming run concurrently
- ✅ Stream can resume after client disconnect
- ✅ Archive recorded accurately
- ✅ Spectator metrics collected and reported
- ✅ Zero data loss on graceful shutdown

---

## Files to Create

```
packages/tournament/src/
├── stream-coordinator.ts        (Story 33.1)
├── websocket-hub.ts             (Story 33.2)
├── spectator-tracker.ts         (Story 33.3)
├── stream-archiver.ts           (Story 33.4)
└── broadcast-cli.ts             (Story 33.6)

Test files:
├── test-stream-coordinator.ts
├── test-websocket-hub.ts
├── test-spectator-tracker.ts
├── test-stream-archiver.ts
└── test-broadcast-cli.ts
```

---

## Dependencies

### New NPM Packages
- `ws` - WebSocket server (if not already installed)

### Framework Dependencies
- Tournament types from EPIC 32
- Executor from EPIC 32

---

## Risk Mitigation

1. **WebSocket Complexity**: Use battle-tested `ws` library, not custom implementation
2. **Memory Leaks**: Explicit cleanup on client disconnect, connection pooling limits
3. **Data Loss**: Archive all events before broadcasting
4. **Backpressure**: Implement flow control, drop old connections if queue grows
5. **Concurrency**: Use async/await throughout, no blocking operations

---

## Success = EPIC 32 + EPIC 33

After both epics complete:
- ✅ Run tournaments automatically (EPIC 32)
- ✅ Stream tournaments live to viewers (EPIC 33)
- ✅ Collect viewership and performance data
- ✅ Archive all matches for replay
- ✅ Foundation for research platform (EPIC 34)
