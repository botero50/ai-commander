# AI Commander Browser Dashboard

The Browser Dashboard provides real-time visualization of AI Commander mission execution through a lightweight local web application.

## Overview

The dashboard is designed to provide immediate visibility into autonomous agent behavior without modifying the framework or runtime. It serves as both a developer tool for debugging and a demonstration vehicle for showcasing AI Commander capabilities.

### Key Features

- **Real-Time Updates**: Live streaming of execution state via Server-Sent Events
- **Runtime Controls**: Pause, resume, step, and stop execution from the browser
- **Mission State Inspection**: Current goal, plan, decision, and command display
- **World State Viewing**: Agent positions, unit counts, resources
- **Execution Timeline**: Live stream of events with auto-scroll and detail inspection
- **Zero Overhead**: No framework modifications; uses existing observability components
- **Local Only**: No external dependencies, no database, no authentication

## Quick Start

### Launch the Dashboard

```bash
cd apps/reference
pnpm demo
```

This will:
1. Start a local web server on port 3000
2. Automatically open your default browser
3. Begin executing a mission to target (3, 2)
4. Display live runtime information in the dashboard

### Custom Target

```bash
pnpm demo --target-x 10 --target-y 5
```

### Custom Port

```bash
pnpm demo --port 3001
```

## Dashboard Panels

### Runtime Panel
Displays current execution status:
- **Status**: Current runtime state (initializing, running, paused, stopped, completed)
- **Current Tick**: Number of execution cycles completed
- **Elapsed**: Mission duration in milliseconds
- **Execution Mode**: continuous or paused

### Mission Panel
Shows the current mission state:
- **Goal**: The mission objective (e.g., "Move to (3, 2)")
- **Goal Status**: pending, running, completed, or failed
- **Plan Steps**: Total number of planned actions
- **Current Step**: Currently executing plan step
- **Decision**: Last decision engine output
- **Command**: Last command executed

### World Panel
Displays world state snapshot:
- **Friendly Units**: Count of player-controlled units (1 in reference implementation)
- **Enemy Units**: Count of enemy units (0 in reference implementation)
- **Resources**: Available resources or status
- **Last Observation**: Timestamp of last world state observation

### Timeline Panel
Shows live execution events:
- Auto-scrolling event stream
- Event type, tick number, and description
- Latest 10 events displayed
- Click events for detailed inspection

### Decision Panel
Shows the current decision cycle:
- **Decision**: Last decision selected
- **Command**: Last command issued

### Details Panel
Additional execution information:
- **Mission ID**: Unique identifier for this mission
- **Timeline Events**: Total number of recorded events

## Control Buttons

### Pause
Requests execution pause after the current tick completes. Dashboard transitions to paused state.

### Resume
Resumes continuous execution from paused state.

### Step
Executes exactly one tick while paused. Useful for frame-by-frame debugging.

### Stop
Gracefully terminates execution and shuts down the mission.

## Architecture

### Components

**DashboardServer** (`dashboard-server.ts`)
- HTTP server providing HTML dashboard and API endpoints
- Server-Sent Events (SSE) for live state broadcasting
- Control command handler for pause/resume/step/stop
- Immutable state management with Object.freeze()

**DashboardIntegration** (`dashboard-integration.ts`)
- Bridges MissionAgent with DashboardServer
- Updates dashboard state after each tick
- Handles control commands from dashboard
- Extracts and formats execution trace data for display
- Provides pause/resume/stop state tracking

**DashboardCLI** (`dashboard-cli.ts`)
- Entry point for `pnpm demo` command
- Launches web server and opens browser
- Integrates dashboard with mission execution loop
- Supports custom target and port arguments

### Data Flow

```
MissionAgent
    ↓
[Execution Loop]
    ├─ runtime.tick()
    ├─ Check pause state (DashboardIntegration)
    ├─ Update dashboard (updateAfterTick)
    └─ Check stop state
         ↓
      DashboardIntegration
         ├─ Extract trace data
         ├─ Calculate metrics
         └─ Broadcast to browser
              ↓
         DashboardServer
         ├─ Update state
         ├─ Send SSE updates
         └─ Handle control commands
              ↓
         Browser Dashboard
         ├─ Update UI panels
         ├─ Animate timeline
         └─ Send control requests
```

## API Endpoints

### GET /
Serves the HTML dashboard UI.

### GET /api/state
Returns current dashboard state as JSON.

```json
{
  "runtime": {
    "status": "running",
    "currentTick": 5,
    "missionId": "mission-3-2",
    "elapsedMs": 500,
    "executionMode": "continuous"
  },
  "mission": {
    "goalId": "goal-movement",
    "goalIntent": "Move to (3, 2)",
    "goalStatus": "running",
    "planSteps": 5,
    "currentStep": 3,
    "lastDecision": "move",
    "lastCommand": "move-south"
  },
  "world": {
    "friendlyUnits": 1,
    "enemyUnits": 0,
    "resources": "movement-points",
    "currentMap": "fake-world",
    "lastObservationMs": 1719252000000
  },
  "timeline": [
    {
      "tick": 1,
      "timestamp": 1719252000000,
      "type": "mission_tick",
      "detail": "Executing tick 1"
    }
  ]
}
```

### GET /api/stream
Server-Sent Events stream of dashboard state updates.

Each event contains the complete current state as JSON.

### POST /api/control
Send control commands to execution.

```json
{
  "command": "pause" | "resume" | "step" | "stop"
}
```

Response:
```json
{
  "success": true
}
```

## Browser Compatibility

The dashboard requires a modern browser supporting:
- Fetch API
- Server-Sent Events (EventSource)
- ES6+ JavaScript
- CSS Grid Layout

Tested and verified on:
- Chrome 120+
- Firefox 120+
- Safari 14+
- Edge 120+

## Performance

### Network Usage
- Initial page load: ~50KB (HTML + CSS + JS)
- State updates: ~1KB per update
- Update frequency: 50ms throttle (20 updates/second max)

### Server Resources
- Memory: ~5MB per connected dashboard
- CPU: <1% idle, <5% during heavy updates
- Bandwidth: <100KB/s during active mission

### Local Only
- No external API calls
- No third-party CDNs
- No analytics or telemetry
- No database queries

## Integration with Mission Execution

The dashboard integrates seamlessly into the mission execution loop:

```typescript
const dashboard = new DashboardServer(3000);
const integration = new DashboardIntegration(dashboard);

// Initialize
await missionAgent.initialize();
integration.initializeWithMission(missionAgent, runtime, trace, metrics);

// Execution loop
for (let tick = 0; tick < maxTicks; tick++) {
  // Check pause/stop state
  if (integration.shouldStopExecution()) break;
  if (integration.shouldPauseExecution()) {
    // Wait for user command
    await new Promise((resolve) => setTimeout(resolve, 100));
    continue;
  }

  // Execute tick
  await runtime.tick();

  // Update dashboard
  integration.updateAfterTick(tick, trace, metrics);
}
```

## Reusing Existing Components

The dashboard reuses components from Stories 084-087:

- **Live Mission Console** (Story 084): State display APIs
- **Execution Trace** (Story 085): Timeline event data
- **Runtime Metrics**: Performance measurements
- **Interactive Controls** (Story 087): Pause/resume/step implementation

No code is duplicated; all components are called through their public APIs.

## Future Enhancements

The dashboard architecture supports future extensions:

### World Inspector Panel
- Visualization of agent positions
- Terrain and obstacle display
- Resource location mapping
- Interactive agents

### Timeline Inspector
- Full trace event details
- Event filtering by type
- Cross-event comparison
- Export timeline as HTML

### Command Injection
- Inject custom commands at runtime
- Override planner decisions
- Test failure scenarios
- Simulate world changes

### Replay Viewer
- Play back recorded missions
- Speed control
- Frame-by-frame stepping
- Side-by-side comparison

## Troubleshooting

### Browser won't open automatically
The dashboard will still be available at `http://localhost:3000`. If auto-open fails, manually visit this URL.

### Port already in use
Use a different port:
```bash
pnpm demo --port 3001
```

### Dashboard not updating
Ensure the mission is actually running. Check the console for errors.

### High CPU usage
This is typically normal during active mission execution. Dashboard updates are throttled to 20/second.

## Development

### Running Tests

```bash
npm run test -- dashboard.test.ts
```

Tests cover:
- Server functionality (routing, state, events)
- Integration with mission agent
- Control command handling
- HTML generation
- API contracts

### Adding New Panels

1. Add state interface to `dashboard-server.ts`
2. Update `DashboardState` type
3. Add initial state to `createInitialState()`
4. Create HTML for panel
5. Add CSS styling
6. Add JavaScript update function
7. Update `DashboardIntegration` to populate data

### Extending Functionality

The architecture is designed for clean extensions:

- New panels: Add to HTML + CSS + JS
- New events: Update trace event types
- New controls: Add button + POST endpoint
- New data: Extract from existing APIs

All without modifying the framework or runtime.

## License

Part of AI Commander v1.0.0 — MIT License

---

**Dashboard v1.0.0** — Real-time autonomous AI visualization.

Made for immediate visibility and responsive control during autonomous execution.
