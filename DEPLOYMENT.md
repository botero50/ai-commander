# AI Commander Public Stream — Deployment Guide

**Version:** 1.0  
**Date:** 2026-07-10  
**Status:** Ready for Production  

---

## Quick Start

### 1. Install Dependencies
```bash
cd packages/zeroad-adapter
npm install
cd ../../apps/web
npm install
cd ../../
```

### 2. Build
```bash
npm run build
```

### 3. Launch Stream
```bash
npm run stream:launch
```

Stream will start on `http://localhost:3000` with infinite match rotation.

---

## Architecture Overview

### Backend Services (TypeScript/Node.js)

**PublicStreamLauncher** (Main Orchestrator)
- Manages ArenaController (match rotation)
- Manages BroadcastDataBridge (event streaming)
- Manages LiveMetricsHUD (real-time stats)
- Exposes REST API on port 3000

**ArenaController** (Match Engine)
- Runs LiveMatchRunner for real 0 A.D. matches
- Rotates through 9 maps randomly
- Rotates through 12 civilizations randomly
- Auto-recovers from crashes
- Tracks match statistics

**BroadcastDataBridge** (Event Pipeline)
- Subscribes to SessionEventBus
- Transforms game events to broadcast format
- Emits: observation, decision, command, victory events
- Caches last observation for reconnections

**LiveMetricsHUD** (Statistics)
- Tracks real-time player metrics
- Calculates military value
- Estimates resource rates
- Stores 100-update history
- Supports player comparison

### Frontend (React)

**BroadcastOverlay** Component
- Displays professional esports interface
- Polls metrics every 500ms
- Polls status every 1000ms
- Shows real-time player stats
- Shows health indicators
- Responsive on all devices

---

## Configuration

### Environment Variables

```bash
STREAM_PORT=3000              # REST API port (default: 3000)
STREAM_MATCHES=0              # Max matches, 0=infinite (default: 0)
STREAM_LOG_INTERVAL=300       # Status log interval in seconds (default: 300)
NODE_ENV=production           # Set to production for optimized builds
LOG_LEVEL=info                # Log level (debug/info/warn/error)
```

### Configuration Profiles

**Development (Local Testing)**
```bash
STREAM_PORT=3000 \
STREAM_MATCHES=3 \
STREAM_LOG_INTERVAL=30 \
npm run stream:launch
```

**Staging (Pre-Production)**
```bash
STREAM_PORT=3000 \
STREAM_MATCHES=50 \
STREAM_LOG_INTERVAL=60 \
npm run stream:launch
```

**Production (24/7 Stream)**
```bash
STREAM_PORT=3000 \
STREAM_MATCHES=0 \
STREAM_LOG_INTERVAL=300 \
NODE_ENV=production \
npm run stream:launch
```

---

## REST API Endpoints

All endpoints return JSON and are designed for broadcast overlay integration.

### Stream Status
**GET /stream/status**
```json
{
  "isRunning": true,
  "matchesCompleted": 42,
  "uptime": 151200,
  "currentMatch": {
    "number": 43,
    "startTime": "2026-07-10T14:30:00Z"
  },
  "broadcastActive": true,
  "metricsActive": true,
  "health": {
    "arena": "healthy",
    "broadcast": "healthy",
    "metrics": "healthy"
  }
}
```

### Arena Statistics
**GET /arena/stats**
```json
{
  "completionRate": 98.5,
  "health": "healthy",
  "uptimeFormatted": "42 hours 3 minutes"
}
```

### Arena Health
**GET /arena/health**
```json
{
  "failureRate": 1.5,
  "crashRestarts": 2,
  "lastError": null
}
```

### Real-Time Metrics
**GET /metrics/current**
```json
{
  "players": [
    {
      "playerId": 1,
      "playerName": "AI Player 1",
      "resources": {
        "wood": 500,
        "stone": 300,
        "food": 250,
        "metal": 50
      },
      "units": {
        "count": 25,
        "militaryValue": 250
      },
      "buildings": {
        "count": 8
      },
      "population": {
        "current": 45,
        "max": 300
      },
      "economy": {
        "woodRate": 5,
        "stoneRate": 3,
        "foodRate": 4
      }
    },
    {
      "playerId": 2,
      "playerName": "AI Player 2",
      ...
    }
  ],
  "timestamp": "2026-07-10T14:35:00.000Z"
}
```

### Metrics History
**GET /metrics/history?limit=20**
```json
{
  "history": [
    {
      "tick": 1000,
      "metrics": [...]
    },
    ...
  ]
}
```

### Player Comparison
**GET /metrics/comparison?p1=1&p2=2**
```json
{
  "player1": "AI Player 1",
  "player2": "AI Player 2",
  "resourceLead": {
    "player1": 1050,
    "player2": 950
  },
  "militaryLead": {
    "player1": 250,
    "player2": 220
  },
  "populationLead": {
    "player1": 45,
    "player2": 40
  }
}
```

### Health Check
**GET /health**
```json
{
  "status": "ok",
  "uptime": 151200000
}
```

---

## Broadcast Overlay Integration

### React Component

```typescript
import BroadcastOverlay from '@ai-commander/web/components/BroadcastOverlay';

// Use with default localhost:3000
<BroadcastOverlay />

// Use with custom API URL
<BroadcastOverlay apiUrl="http://localhost:5000" />
```

### Polling Schedule

- **Metrics:** 500ms (real-time action tracking)
- **Status:** 1000ms (stream health monitoring)
- **Uptime:** 1000ms (per-second countdown)

### Styling

The overlay uses CSS modules with:
- Dark professional theme (esports standard)
- Red/Blue player colors
- Responsive breakpoints (1920px, 768px, 375px)
- Smooth animations and transitions
- Monospace font (Courier New)

---

## Monitoring & Observability

### Status Logs

Every 5 minutes (configurable via `STREAM_LOG_INTERVAL`), the stream logs:
```
📊 Stream Status
  matches: 42
  uptime: 42m3s
  broadcast: ✅
  metrics: ✅
```

### Health Indicators

The broadcast overlay displays three health items:
- **ARENA:** Game execution health
- **BROADCAST:** Event streaming health
- **METRICS:** Real-time statistics health

All should show green (healthy) for proper operation.

### Connection Status

The overlay shows a pulsing dot in the top-right:
- 🟢 **Green:** Connected to REST API
- 🔴 **Red:** Disconnected (retrying every 500ms)

### Uptime Tracking

Displayed at top-left as HH:MM:SS and automatically increments per second.

---

## Auto-Recovery

### Crash Recovery

If a 0 A.D. process crashes:
1. ArenaController detects the crash
2. Logs the error
3. Waits 5 seconds
4. Automatically starts the next match
5. Stream continues without manual intervention

### Network Recovery

If broadcast overlay loses connection:
1. Connection indicator turns red
2. Component retries every 500ms
3. Reconnects automatically when API available
4. No loss of match progress

### Error Scenarios Handled

✅ 0 A.D. process crash  
✅ RL Interface timeout  
✅ AI brain timeout  
✅ REST API unavailability  
✅ Broadcast overlay disconnect  
✅ Metrics update failure  
✅ Uncaught exceptions  
✅ Unhandled promise rejections  

---

## Performance Considerations

### Memory

- **Stream Launcher:** ~50MB base
- **Arena Controller:** ~100MB per match
- **Metrics History:** ~10MB (100 updates max)
- **Total:** ~200MB typical

### CPU

- **Arena (0 A.D. + RL Interface):** High during gameplay
- **Broadcast Bridge:** Low (event transformation)
- **Metrics HUD:** Low (stat tracking)
- **REST API:** Low (simple JSON responses)

### Network

- **Broadcast Overlay polling:** ~10KB every 500-1000ms
- **Total bandwidth:** <1 Mbps

---

## Troubleshooting

### Stream won't start
```bash
# Check port availability
lsof -i :3000

# Free port if needed
kill -9 <PID>

# Try different port
STREAM_PORT=4000 npm run stream:launch
```

### Broadcast overlay shows OFFLINE
```bash
# Verify stream is running
curl http://localhost:3000/health

# Check network connectivity
# Verify no firewall blocking

# Try refreshing overlay
# Stream will reconnect automatically
```

### Matches not rotating
```bash
# Check logs for errors
# Look for "Arena error" messages
# Verify 0 A.D. is installed
# Check RL Interface is running on :6379
```

### Metrics not updating
```bash
# Check LiveMetricsHUD is subscribed
# Verify game state observations flowing
# Check API /metrics/current endpoint
# Verify no metric calculation errors
```

### High CPU usage
```bash
# This is normal during gameplay
# 0 A.D. runs at high CPU
# Broadcast components are low-CPU
# Monitor total system usage
```

---

## Production Deployment Checklist

### Pre-Launch
- [ ] Dependencies installed
- [ ] Build completes cleanly
- [ ] Tests pass (npm run test)
- [ ] Environment variables configured
- [ ] Port 3000 available (or alternate port)
- [ ] 0 A.D. installed on target machine
- [ ] RL Interface running on :6379
- [ ] Broadcast overlay HTML prepared

### Launch
- [ ] Start stream: `npm run stream:launch`
- [ ] Verify startup banner displays
- [ ] Check health indicators green
- [ ] Confirm first match starts
- [ ] Open broadcast overlay
- [ ] Verify metrics updating (500ms poll)
- [ ] Check status updating (1000ms poll)

### During Streaming
- [ ] Monitor status logs every 5 minutes
- [ ] Watch for error messages
- [ ] Verify auto-recovery if crash occurs
- [ ] Check uptime counter incrementing
- [ ] Verify matches counter incrementing
- [ ] Monitor system resources
- [ ] Check for network issues

### Shutdown
- [ ] Graceful shutdown: Ctrl+C
- [ ] Verify all components stop
- [ ] Check for any outstanding errors
- [ ] Clean exit code (0)

---

## Docker Deployment (Optional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install 0 A.D. dependencies
RUN apk add --no-cache \
  build-essential \
  python3 \
  libxml2 \
  libxslt

# Copy source
COPY . .

# Install dependencies
RUN npm install

# Build
RUN npm run build

# Expose API port
EXPOSE 3000

# Start stream
ENV STREAM_PORT=3000
ENV STREAM_MATCHES=0
ENV STREAM_LOG_INTERVAL=300

CMD ["npm", "run", "stream:launch"]
```

### Docker Compose
```yaml
version: '3'

services:
  ai-commander-stream:
    build: .
    ports:
      - "3000:3000"
    environment:
      STREAM_PORT: 3000
      STREAM_MATCHES: 0
      STREAM_LOG_INTERVAL: 300
      NODE_ENV: production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## Stream Statistics

Once running, the stream provides:

- **Uptime:** Total continuous operation time
- **Matches Completed:** Total match count
- **Match Duration:** Time per match (avg ~30 minutes)
- **Resource Usage:** CPU, memory, network
- **Health Status:** Arena, broadcast, metrics
- **Connection Status:** API availability
- **Error Rate:** Failures / total operations

---

## Support & Debugging

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm run stream:launch
```

### Monitor with Curl
```bash
# Watch status updates every second
watch -n 1 'curl -s http://localhost:3000/stream/status | jq'

# Watch metrics updates
watch -n 0.5 'curl -s http://localhost:3000/metrics/current | jq'

# Watch health
curl http://localhost:3000/health
```

### Log File Monitoring
```bash
tail -f logs/stream.log | grep -E "error|ERROR|Alert"
```

---

## Performance Baseline

Expected performance on standard hardware:

| Metric | Value |
|--------|-------|
| Memory Usage | 200-300 MB |
| CPU Usage | 30-50% (varies with 0 A.D.) |
| Match Duration | ~20-40 minutes |
| API Response Time | <10ms |
| Overlay Poll Latency | <100ms |
| Auto-Recovery Time | <10 seconds |
| MTBF (Mean Time Between Failures) | >48 hours |

---

## Success Criteria

The stream is running successfully when:

✅ StreamLaunch displays startup banner  
✅ All health indicators show green  
✅ Connection indicator pulsing green  
✅ Uptime counter incrementing  
✅ Matches counter incrementing  
✅ Broadcast overlay showing player stats  
✅ Status logs appearing every 5 minutes  
✅ No error messages in logs  
✅ API endpoints responding  
✅ Overlay metrics updating every 500ms  

---

## Next Steps

1. **Launch the stream**
   ```bash
   npm run stream:launch
   ```

2. **Open broadcast in streaming software**
   - URL: http://localhost:3000
   - Or embed BroadcastOverlay component

3. **Configure streaming platform**
   - OBS, XSplit, Streamlabs, etc.
   - Set stream key
   - Start broadcast

4. **Monitor continuously**
   - Watch status logs
   - Track uptime
   - Watch for errors
   - Monitor health indicators

5. **Scale if needed**
   - Adjust match timeout
   - Configure logging interval
   - Tune resource allocation
   - Monitor performance

---

## Deployment Complete

The AI Commander public stream is ready for:
- ✅ 24/7 continuous operation
- ✅ Automatic failure recovery
- ✅ Real-time broadcast display
- ✅ Professional esports presentation
- ✅ Production monitoring

🎬 **Ready to stream!**
