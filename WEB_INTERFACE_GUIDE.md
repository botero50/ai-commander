# AI Commander Web Interface Guide

## Quick Start

The AI Commander has a **full React web interface** for visualizing matches and tournaments.

### Option 1: Web Interface Only
```bash
cd apps/web
npm run dev
# Opens at http://localhost:5173
```

### Option 2: Chess Games + Web Interface (Recommended)
Run in two terminal windows:

**Terminal 1 - Start the chess arena:**
```bash
npm run chess
# Runs the chess games with Ollama vs Ollama
# Displays board positions in terminal
```

**Terminal 2 - Start the web dashboard:**
```bash
cd apps/web
npm run dev
# Opens at http://localhost:5173
```

## Web Interface Features

### Available Components
- **MatchViewer** - View match details and board state
- **DecisionTimeline** - Real-time AI decision stream
- **ReplayControls** - Play/pause/rewind match replays
- **TournamentDashboard** - Tournament standings and statistics
- **StreamingOverlay** - Broadcast overlay for streaming

### What You Can See
1. **Live Match Display** - Watch pieces moving on an interactive board
2. **AI Decision Timeline** - See what each AI is thinking/planning
3. **Match Statistics** - Duration, move count, capture count
4. **Tournament Rankings** - Win/loss records, ELO ratings, trends
5. **Game Replays** - Rewind and analyze past games

## Architecture

```
apps/web/
├── src/
│   ├── components/        # React components for UI
│   ├── providers/         # Data providers (match data, etc)
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript definitions
│   └── styles/           # CSS/styling
├── dist/                 # Built web app (ready to serve)
├── vite.config.ts        # Vite bundler config
└── package.json          # Dependencies
```

## How to Connect Chess Games to Web UI

The web interface needs to:
1. **Subscribe to WebSocket** - Real-time game updates from chess arena
2. **Fetch Game History** - Previous games and matches
3. **Stream Board Updates** - Current position after each move

### WebSocket Connection
The chess arena broadcasts game events on **port 9000**:
```javascript
const ws = new WebSocket('ws://localhost:9000');
ws.onmessage = (event) => {
  const gameState = JSON.parse(event.data);
  // Update board, decision timeline, etc
};
```

### Sample Game Event Format
```json
{
  "type": "move",
  "move": "e4",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "player": "Ollama",
  "latencyMs": 450,
  "events": ["capture", "check"]
}
```

## Development

### Build the Web App
```bash
cd apps/web
npm run build
# Outputs to dist/ folder
```

### Run in Production Mode
```bash
cd apps/web
npm run preview
# Serves the built dist/ folder
```

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
# Then restart: npm run dev
```

**Components not showing?**
- Check browser console for errors (F12)
- Ensure mock data is loaded (for testing)
- Verify WebSocket connection if live data expected

**Slow performance?**
- Reduce board update frequency
- Optimize component re-renders
- Check for memory leaks in DevTools

## Future Enhancements

- [ ] Connect to live Ollama game events via WebSocket
- [ ] Add interactive board clicking
- [ ] Implement move/undo buttons
- [ ] Add engine evaluation graph
- [ ] Export games as PGN files
- [ ] Multi-game tournament view

## Related Files

- `chess.js` - Game execution engine
- `arena.js` - Tournament management
- `broadcast-service.js` - Event streaming
- `board-display.js` - ASCII board display
