# Stream Monitoring & Health Dashboard

**Real-time monitoring for production stream operations.**

---

## Overview

The Stream Monitor tracks:
- ✅ Match performance metrics
- ✅ Error rates and recovery
- ✅ System resource usage
- ✅ API performance
- ✅ Stream health status
- ✅ Alert history and severity

---

## Monitoring API

### GET /stream/health
```bash
curl http://localhost:3000/stream/health | jq
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "matches_completed": 5,
  "error_count": 0,
  "recovery_count": 0,
  "cpu_usage": 35.5,
  "memory_usage_mb": 280,
  "api_response_time_ms": 45,
  "alerts": {
    "total": 0,
    "critical": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  }
}
```

### Status Values

| Status | Meaning | Action |
|--------|---------|--------|
| **healthy** | All systems normal | Continue monitoring |
| **degraded** | Multiple warnings | Investigate logs |
| **critical** | Critical alert fired | Immediate attention required |

---

## Performance Metrics

### Track via REST API

```bash
# Get current metrics
curl http://localhost:3000/stream/status | jq '.health'

# Watch metrics update
watch -n 1 'curl -s http://localhost:3000/stream/status | jq'
```

### Key Metrics

| Metric | Threshold | Alert Level |
|--------|-----------|------------|
| Error Rate | >10% | Critical |
| Memory Usage | >500MB | Warning |
| CPU Usage | >80% | Warning |
| API Latency | >100ms | Warning |
| Match Duration | >60 min | Warning |

---

## Alert Types

### Severity Levels

```
🚨 CRITICAL  → Immediate action required
❌ ERROR     → Problem detected
⚠️  WARNING  → Monitor closely
ℹ️  INFO     → Informational
```

### Categories

1. **Performance**
   - Slow API responses
   - Long match durations
   - High resource usage

2. **Error**
   - Crash recovery
   - Error rate threshold
   - Recovery success

3. **Resource**
   - High CPU usage
   - High memory usage
   - Resource exhaustion

4. **Connectivity**
   - API unavailable
   - Broadcast disconnected
   - Network issues

---

## Monitoring Examples

### Real-Time Dashboard

```bash
#!/bin/bash
# Monitor stream health in real-time

while true; do
  clear
  echo "╔════════════════════════════════════════════╗"
  echo "║     🎬 AI COMMANDER STREAM MONITOR        ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""
  
  curl -s http://localhost:3000/stream/status | jq '{
    uptime: .uptime,
    matches: .matchesCompleted,
    cpu: (.health.cpuUsage | tostring + "%"),
    memory: (.health.memoryUsage / 1024 / 1024 | tostring + "MB"),
    api_latency: (.health.apiResponseTime | tostring + "ms"),
    status: .health.status
  }'
  
  echo ""
  sleep 5
done
```

### Alert Monitoring

```bash
#!/bin/bash
# Stream alerts as they occur

while true; do
  curl -s http://localhost:3000/stream/health | jq '.alerts' | grep -E 'critical|error'
  sleep 2
done
```

### Performance Trend

```bash
# Log metrics every minute for 1 hour
for i in {1..60}; do
  echo "$(date): $(curl -s http://localhost:3000/stream/status | jq '{cpu: .health.cpuUsage, memory: .health.memoryUsage / 1024 / 1024}')"
  sleep 60
done
```

---

## Alert Responses

### When Alert Fires: Critical

```
ACTION: Investigate immediately
STEPS:
1. Check logs: LOG_LEVEL=debug
2. Monitor system resources
3. Check API endpoints
4. Review recent changes
5. Consider graceful shutdown and restart
```

### When Alert Fires: Error

```
ACTION: Review and respond
STEPS:
1. Check error context
2. Verify recovery succeeded
3. Monitor next few matches
4. Log for analysis
```

### When Alert Fires: Warning

```
ACTION: Monitor closely
STEPS:
1. Continue stream operation
2. Note threshold approach
3. Review trends over time
4. Plan optimization if trending up
```

### When Alert Fires: Info

```
ACTION: Log for reference
STEPS:
1. Note event occurrence
2. Continue normal operation
3. Include in end-of-session report
```

---

## Health Dashboard Setup

### With Grafana (Recommended)

1. **Add JSON API Data Source**
   - URL: `http://localhost:3000/stream/status`
   - Interval: 10s

2. **Create Dashboard Panels**
   - Uptime counter
   - Matches completed gauge
   - CPU/Memory line graph
   - API latency line graph
   - Health status indicator
   - Alert log table

3. **Set Alerts**
   - CPU > 80% → Alert
   - Memory > 500MB → Alert
   - API Latency > 100ms → Alert
   - Error Rate > 10% → Alert

### With Prometheus (Optional)

Export metrics endpoint:
```
GET /metrics/prometheus
```

Scrape configuration:
```yaml
scrape_configs:
  - job_name: 'ai-commander'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics/prometheus'
    scrape_interval: 10s
```

### With ELK Stack (Optional)

Stream logs to Elasticsearch:
```bash
npm run stream:launch | \
  jq -R 'fromjson | {timestamp: now, message: .}' | \
  nc elasticsearch 9200
```

---

## Performance Baselines

### Expected Performance

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Memory | 250 MB | 400 MB | 500 MB |
| CPU | 35% | 60% | 80% |
| API Latency | 20ms | 60ms | 100ms |
| Match Duration | 25 min | 45 min | 60 min |
| Error Rate | 0% | 5% | 10% |

### Resource Scaling

As match count increases:
- **Memory:** +10-15 MB per 100 matches
- **CPU:** Varies with game state complexity
- **Network:** <1 Mbps (polling bandwidth)

---

## Troubleshooting via Monitoring

### High Memory Usage

**Alert:** Memory usage > 500MB

**Steps:**
1. Check match count: `curl http://localhost:3000/stream/status | jq '.matchesCompleted'`
2. Review metrics history: `curl http://localhost:3000/metrics/history`
3. If trending up, may need deployment update
4. Options: increase server RAM, reduce polling frequency

### High CPU Usage

**Alert:** CPU usage > 80%

**Steps:**
1. Normal during active gameplay (expected)
2. Check if persisting between matches
3. Monitor API latency simultaneously
4. If API latency high, check database/query performance
5. May need query optimization

### High API Latency

**Alert:** API response > 100ms

**Steps:**
1. Check concurrent requests
2. Verify no slow queries
3. Monitor network latency
4. Check for broadcast overlay polling storms
5. Consider request batching

### High Error Rate

**Alert:** Errors > 10%

**Steps:**
1. Check error logs: `LOG_LEVEL=debug npm run stream:launch`
2. Review recent match failures
3. Check recovery count (should be high)
4. Verify auto-recovery is working
5. Consider match timeout adjustment

---

## Log Integration

### Stream Log Format

```
[Component:LEVEL] message { context }
```

Example:
```
[StreamMonitor:INFO] Match recorded { matchNumber: 1, duration: 1800s, winner: "Player 1" }
[StreamMonitor:WARNING] High memory usage: 520MB { memory: 544857088 }
[StreamMonitor:ERROR] Error rate exceeded threshold: 12.5% { errorRate: 0.125, context: "test" }
```

### Parsing for Monitoring

```bash
# Extract all warnings and errors
grep -E '\[.*:WARNING\]|\[.*:ERROR\]|\[.*:CRITICAL\]' stream.log

# Count alerts by type
grep '\[StreamMonitor:' stream.log | cut -d: -f2 | sort | uniq -c

# Find match with longest duration
grep 'Match recorded' stream.log | jq -s 'max_by(.duration)'
```

---

## Production Setup Checklist

- [ ] Monitoring system integrated
- [ ] Health endpoint tested
- [ ] Alerts configured
- [ ] Dashboards setup
- [ ] Log aggregation enabled
- [ ] Alerting configured (email/Slack)
- [ ] Baselines documented
- [ ] Runbook created
- [ ] On-call training completed
- [ ] Regular review scheduled

---

## Useful Commands

```bash
# Monitor everything
watch -n 1 'curl -s http://localhost:3000/stream/status | jq'

# Check only health
curl http://localhost:3000/stream/health | jq '.status'

# Monitor alerts
curl http://localhost:3000/stream/status | jq '.alerts'

# Get performance report
curl http://localhost:3000/stream/status | jq '.performance'

# Watch error rate
watch -n 5 'curl -s http://localhost:3000/stream/status | jq ".errorRate"'

# Monitor resource usage
watch -n 2 'curl -s http://localhost:3000/stream/status | jq "{cpu: .cpuUsage, memory: .memoryUsage}"'

# Stream alerts to file
while true; do curl -s http://localhost:3000/stream/status | jq '.alerts' >> alerts.log; sleep 10; done

# Generate hourly report
for i in {1..60}; do
  echo "=== $(date) ===" >> report.log
  curl -s http://localhost:3000/stream/status | jq . >> report.log
  sleep 60
done
```

---

## Summary

The Stream Monitor provides **complete observability** for production stream operations with:

✅ Real-time health monitoring  
✅ Performance metrics tracking  
✅ Alert generation and management  
✅ Historical data preservation  
✅ REST API integration  
✅ JSON reporting  
✅ Production-ready thresholds  

Ready for production deployment with full observability!
