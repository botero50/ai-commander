# Dashboard Guide

The AI Commander browser dashboard provides real-time visualization of agent reasoning and execution.

## Starting the Dashboard

```bash
npm run demo
```

This launches `http://localhost:3000` with a live dashboard showing agent execution.

## Interface Overview

### Header
- **Status Badge** — Current execution state (running, paused, completed, stopped)
- **Controls** — Pause, Resume, Step, Stop buttons

### Left Column: Runtime
- Current tick count
- Elapsed execution time
- Execution mode (continuous, step, paused)
- Overall mission status

### Center Column: Mission State
- Current goal and status
- Progress bar with trend indicator (↑ improving, → stable, ↓ regressing)
- Plan progress (steps completed / total)
- Goal evaluation scores and selection reasoning
- Resource gathering progress (if applicable)

### Right Column: World State
- Friendly unit count
- Enemy unit count
- Current resources
- Last observation timestamp

### Bottom: Timeline
- Chronological list of execution events
- Color-coded by event type
- Click any event to inspect that tick

### Inspection Panel
- Appears when you click a timeline event
- Shows complete world state at that tick
- Displays goal candidates, plan steps, decisions
- Includes navigation: First, Previous, Next, Latest, Resume Live

## Event Types and Colors

| Event | Color | Icon |
|-------|-------|------|
| Resource detected | Purple | 🔍 |
| Goal selected | Gold | 👈 |
| Gathering started | Magenta | ⛏️ |
| Combat decision | Orange | ⚡ |
| Command executed | Cyan | ▶️ |
| Mission tick | Gray | ⏱️ |
| Mission completed | Green | 🏁 |
| Mission failed | Red | ❌ |

## Controls

### Playback
- **Pause** — Stop execution and enter inspection mode
- **Resume** — Continue execution from current tick
- **Step** — Execute one tick then pause
- **Stop** — Terminate execution

### Navigation (when paused)
- **First Tick** — Jump to tick 0
- **Previous** — Go to previous tick with events
- **Next** — Go to next tick with events
- **Latest** — Jump to current execution tick
- **Resume Live** — Exit inspection mode, follow live execution

## Usage Patterns

### Debugging a Decision
1. Pause execution near where you expect the issue
2. Click the relevant timeline event
3. Inspect the world state at that moment
4. See what the agent knew and why it decided that way
5. Step forward to see consequences

### Analyzing Progress
1. Watch the progress bar and trend indicator
2. Check if progress is improving, stable, or regressing
3. Inspect ticks with progress changes
4. Understand what world state changes trigger progress updates

### Comparing States
1. Pause at tick N
2. Inspect world state and decisions
3. Navigate to tick M
4. Compare how world state changed
5. Understand decision causality

## Performance

The dashboard runs with minimal overhead:
- Lives in browser process, not agent process
- Receives state updates via SSE (Server-Sent Events)
- No impact on agent execution speed
- Can handle 1000+ tick missions smoothly

## Limitations

- Dashboard requires local network (does not work over internet)
- Only one dashboard client can connect at a time
- State is lost on page reload during execution
- Suitable for interactive debugging, not production monitoring

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires JavaScript enabled

---

See also: [Execution Trace Guide](./EXECUTION_TRACE.md), [Debugger Guide](./DEBUGGER.md)
