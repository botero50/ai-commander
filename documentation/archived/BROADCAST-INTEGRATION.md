# Camera Broadcast Integration Guide

External tools can subscribe to camera position updates from the AI Commander arena loop for automated broadcasting, overlays, and data visualization.

## Quick Start

### 1. Check Camera Position

```bash
curl http://localhost:3001/camera/current
```

Response:
```json
{
  "x": 619.8,
  "z": 804.2,
  "reason": "gathering",
  "score": 60,
  "timestamp": 1783730687706
}
```

### 2. Subscribe to Live Updates (Server-Sent Events)

```bash
curl --no-buffer http://localhost:3001/camera/stream
```

Continuous stream of events:
```
data: {"x":619.8,"z":804.2,"reason":"gathering","score":60,"timestamp":1783730687706}

data: {"x":605.6,"z":800.2,"reason":"gathering","score":60,"timestamp":1783730687800}

data: {"x":579.25,"z":810.375,"reason":"gathering","score":60,"timestamp":1783730687850}
```

## Integration Examples

### JavaScript/Node.js

```javascript
// Subscribe to camera updates
async function streamCamera() {
  const response = await fetch('http://localhost:3001/camera/stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const camera = JSON.parse(line.slice(6));
        console.log(`Camera at (${camera.x.toFixed(1)}, ${camera.z.toFixed(1)}) - ${camera.reason}`);
        
        // Update OBS source or broadcast overlay
        updateCameraOverlay(camera);
      }
    }
  }
}

streamCamera().catch(console.error);
```

### Python

```python
import requests
import json

def stream_camera():
    """Subscribe to camera updates via SSE"""
    response = requests.get('http://localhost:3001/camera/stream', stream=True)
    
    for line in response.iter_lines():
        if line and line.startswith(b'data: '):
            camera_json = line[6:].decode('utf-8')
            camera = json.loads(camera_json)
            
            print(f"Camera at ({camera['x']:.1f}, {camera['z']:.1f}) - {camera['reason']}")
            
            # Update visualization
            update_broadcast_overlay(camera)

if __name__ == '__main__':
    stream_camera()
```

### OBS Studio Integration

#### Method 1: Browser Source with Overlay

Create an HTML file that subscribes to camera feed:

```html
<!DOCTYPE html>
<html>
<head>
    <title>AI Commander Camera</title>
    <style>
        body {
            margin: 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            font-family: monospace;
        }
        #camera-display {
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        .coordinates { color: #00ff00; }
        .gathering { color: #ffff00; }
        .combat { color: #ff0000; }
        .expansion { color: #0080ff; }
        .movement { color: #ff8000; }
    </style>
</head>
<body>
    <div id="camera-display">
        <div>🎥 Camera System</div>
        <div class="coordinates" id="position">--:-- --:--</div>
        <div id="activity">--</div>
        <div id="confidence">--</div>
    </div>

    <script>
        const display = document.getElementById('camera-display');
        const position = document.getElementById('position');
        const activity = document.getElementById('activity');
        const confidence = document.getElementById('confidence');

        async function streamCamera() {
            const response = await fetch('http://localhost:3001/camera/stream');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const camera = JSON.parse(line.slice(6));
                            
                            position.textContent = 
                                `${camera.x.toFixed(1)} , ${camera.z.toFixed(1)}`;
                            position.className = 'coordinates ' + camera.reason;
                            
                            activity.textContent = camera.reason.toUpperCase();
                            activity.className = camera.reason;
                            
                            confidence.textContent = 
                                `Confidence: ${camera.score}/100`;
                            
                            // Update border color
                            display.style.borderLeft = 
                                `4px solid hsl(${camera.score * 1.2}, 100%, 50%)`;
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        }

        streamCamera().catch(console.error);
    </script>
</body>
</html>
```

In OBS Studio:
1. Add Browser Source (1920x200px recommended)
2. Set URL to local file: `file:///path/to/camera-overlay.html`
3. Enable "Refresh browser when scene becomes active"

#### Method 2: Custom Plugin

```lua
-- OBS Lua script
local json = require('cjson')
local http = require('socket.http')

-- Poll camera position every 100ms
obs.obs_enum_sources(function(source)
    local name = obs.obs_source_get_name(source)
    if name == "AI Commander Camera" then
        obs.remove_current_callback()
    end
end)

local timer_id = obs.add_timer(function()
    local response = http.request("http://localhost:3001/camera/current")
    if response then
        local camera = json.decode(response)
        -- Update OBS source position based on camera.x and camera.z
        -- Map 0 A.D. coordinates to OBS canvas coordinates
        local obs_x = (camera.x / 1024) * 1920  -- Assume 1024x1024 map
        local obs_y = (camera.z / 1024) * 1080
        
        -- Update source position
        -- ... OBS API calls
    end
end, 100)
```

### Web Dashboard

```javascript
// React component for camera dashboard
import React, { useEffect, useState } from 'react';

export function CameraDashboard() {
  const [camera, setCamera] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const streamCamera = async () => {
      const response = await fetch('http://localhost:3001/camera/stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const cam = JSON.parse(line.slice(6));
              setCamera(cam);
              setHistory(h => [cam, ...h.slice(0, 9)]);
            } catch (e) {
              // Skip
            }
          }
        }
      }
    };

    streamCamera();
  }, []);

  if (!camera) return <div>Waiting for camera feed...</div>;

  return (
    <div className="camera-dashboard">
      <h2>🎥 Camera System</h2>
      <div className="position">
        Position: ({camera.x.toFixed(1)}, {camera.z.toFixed(1)})
      </div>
      <div className={`activity ${camera.reason}`}>
        {camera.reason.toUpperCase()}
      </div>
      <div className="score">
        Confidence: {camera.score}/100
      </div>
      
      <h3>Recent Updates</h3>
      <div className="history">
        {history.map((cam, i) => (
          <div key={i} className={`entry ${cam.reason}`}>
            ({cam.x.toFixed(1)}, {cam.z.toFixed(1)}) {cam.reason}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Camera Position Format

Each update contains:

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | World X coordinate (0-1024) |
| `z` | number | World Z coordinate (0-1024) |
| `reason` | string | Activity type: 'gathering', 'combat', 'expansion', 'movement' |
| `score` | number | Confidence score (0-100) |
| `timestamp` | number | Unix milliseconds when detected |

## Activity Types and Scores

| Activity | Score | What It Means |
|----------|-------|---------------|
| **Combat** | 90 | Multiple units from different players fighting |
| **Expansion** | 80 | New buildings being constructed |
| **Gathering** | 60 | Resource gathering operations (3+ units) |
| **Movement** | 50 | Large army group moving (4+ units) |

Higher scores = more interesting for broadcasting.

## Performance Considerations

### Server-Sent Events (Recommended)

```
GET /camera/stream
```

- **Pros:** Low latency, real-time updates, efficient
- **Cons:** Unidirectional (server → client only)
- **Use for:** Live overlays, streaming software

### Polling (Fallback)

```bash
# Poll every 100ms
while true; do
  curl http://localhost:3001/camera/current
  sleep 0.1
done
```

- **Pros:** Simple, works everywhere, no persistent connections
- **Cons:** Higher latency, more bandwidth, CPU overhead
- **Use for:** Testing, stateless integrations

## Troubleshooting

### Connection Refused

```bash
# Check if broadcast server is running
curl http://localhost:3001/camera/current
# Error: Connection refused

# Solution: Start arena loop
npm run dev
```

### No Updates Received

Check if game is running and arena loop is active:

```bash
# Check process
ps aux | grep pyrogenesis
ps aux | grep tsx

# Check logs
npm run dev 2>&1 | grep "camera:target"
```

### Outdated Coordinates

Camera positions update only when activities are detected. If score = 0:
- Camera is idle
- No interesting activities in current game state
- Position is last known good location

## Security Notes

The broadcast server listens on `localhost:3001` only and serves no sensitive information. Broadcasting coordinates of gathering/combat locations is intentional for spectator broadcasts.

## Next Steps

1. Start AI Commander: `npm run dev`
2. Choose integration method above
3. Test with `curl http://localhost:3001/camera/current`
4. Update your broadcast tool/overlay
5. Monitor live camera updates during matches

## Support

For issues with:
- **Camera detection:** See [CAMERA-SYSTEM.md](./CAMERA-SYSTEM.md)
- **Arena loop:** See [INSTALLATION.md](./INSTALLATION.md)
- **Integration:** Check example code above or create an issue
