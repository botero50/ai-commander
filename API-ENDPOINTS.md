# API Endpoints Documentation

All endpoints run on **port 8080** and are available while the arena loop is running.

---

## Tournament & Rankings

### GET `/api/rankings`
Get all brains ranked by ELO rating.

**Example:**
```powershell
curl http://localhost:8080/api/rankings | ConvertFrom-Json
```

**Response:**
```json
[
  {
    "rank": 1,
    "brainId": "ollama:mistral",
    "name": "ollama:mistral",
    "rating": 1632,
    "highestRating": 1664,
    "lowestRating": 1600,
    "averageRating": 1616,
    "matches": 99,
    "trend": "down"
  },
  {
    "rank": 2,
    "brainId": "ollama:tinyllama",
    "name": "ollama:tinyllama",
    "rating": 1568,
    "highestRating": 1600,
    "lowestRating": 1500,
    "averageRating": 1550,
    "matches": 99,
    "trend": "up"
  }
]
```

**Response Fields:**
- `rank` - Position in rankings (1 = best)
- `brainId` - Internal ID (format: `provider:model`)
- `name` - Display name
- `rating` - Current ELO rating
- `highestRating` - Peak rating in history
- `lowestRating` - Minimum rating in history
- `averageRating` - Mean rating across all matches
- `matches` - Total matches played (counts all games, not capped)
- `trend` - "up" if recent rating > previous rating, "down" otherwise

---

### GET `/api/rankings/{brainId}`
Get detailed stats for a specific brain.

**Example:**
```powershell
curl http://localhost:8080/api/rankings/ollama:mistral | ConvertFrom-Json
```

**Response:**
```json
{
  "brainId": "ollama:mistral",
  "rating": 1632,
  "ratingHistory": [1600, 1608, 1616, ..., 1632],
  "matchCount": 99,
  "highestRating": 1664,
  "lowestRating": 1600,
  "averageRating": 1616
}
```

---

## Match History

### GET `/api/match-history`
Get history of recent matches.

**Example:**
```powershell
curl http://localhost:8080/api/match-history | ConvertFrom-Json
```

**Response:**
```json
{
  "totalMatches": 150,
  "recentMatches": [
    {
      "matchId": "match_1234567890_abc123",
      "player1": {
        "brainId": "ollama:mistral",
        "name": "ollama:mistral",
        "rating": 1640,
        "ratingChange": 8
      },
      "player2": {
        "brainId": "ollama:tinyllama",
        "name": "ollama:tinyllama",
        "rating": 1560,
        "ratingChange": -8
      },
      "winner": "player1",
      "tick": 4250,
      "timestamp": 1721016000000
    }
  ]
}
```

---

## Metrics

### GET `/api/metrics`
Get current tournament metrics and statistics.

**Example:**
```powershell
curl http://localhost:8080/api/metrics | ConvertFrom-Json
```

**Response:**
```json
{
  "totalMatches": 150,
  "totalTicks": 637500,
  "averageTicksPerMatch": 4250,
  "activeBrains": 4,
  "topBrain": {
    "brainId": "ollama:mistral",
    "rating": 1640
  },
  "lowestRating": 1450,
  "highestRating": 1720,
  "uptime": 3600000
}
```

**Response Fields:**
- `totalMatches` - Number of matches completed
- `totalTicks` - Sum of all match ticks
- `averageTicksPerMatch` - Mean match length
- `activeBrains` - Number of AI models in tournament
- `topBrain` - Current leader
- `lowestRating` - Lowest ELO in tournament
- `highestRating` - Highest ELO in tournament
- `uptime` - Time arena has been running (milliseconds)

---

## Broadcasting

### GET `/api/broadcast/current`
Get current game state (while match is running).

**Example:**
```powershell
curl http://localhost:8080/api/broadcast/current | ConvertFrom-Json
```

**Response:**
```json
{
  "matchId": "match_1234567890_abc123",
  "tick": 2500,
  "player1": {
    "name": "ollama:mistral",
    "units": 45,
    "buildings": 18,
    "population": 120,
    "phase": "City"
  },
  "player2": {
    "name": "ollama:tinyllama",
    "units": 32,
    "buildings": 14,
    "population": 95,
    "phase": "Town"
  }
}
```

---

### GET `/api/broadcast/chat`
Get recent trash talk and chat messages.

**Example:**
```powershell
curl http://localhost:8080/api/broadcast/chat | ConvertFrom-Json
```

**Response:**
```json
{
  "recentMessages": [
    {
      "speaker": "Ollama",
      "message": "Your army is falling apart!",
      "tick": 2400,
      "audioFile": "/api/broadcast/audio/trash_talk_1234567890_abc123.wav"
    },
    {
      "speaker": "Petra",
      "message": "Not so fast!",
      "tick": 2350,
      "audioFile": "/api/broadcast/audio/trash_talk_1234567890_xyz789.wav"
    }
  ]
}
```

---

### GET `/api/broadcast/audio/{filename}`
Get synthesized voice audio file.

**Example:**
```powershell
curl http://localhost:8080/api/broadcast/audio/trash_talk_1234567890_abc123.wav -o audio.wav
```

**Response:** Binary WAV file (audio/wav)

**Filename Format:** `trash_talk_TIMESTAMP_RANDOM.wav`

---

### GET `/api/dashboard`
Get complete dashboard with current match and recent history.

**Example:**
```powershell
curl http://localhost:8080/api/dashboard | ConvertFrom-Json
```

**Response:**
```json
{
  "currentMatch": {
    "matchId": "match_1234567890_abc123",
    "tick": 2500,
    "player1": {...},
    "player2": {...}
  },
  "recentMessages": [...],
  "rankings": [...],
  "metrics": {...}
}
```

---

## Debug Endpoints

### GET `/api/debug/camera-position`
Get current camera position in game world.

**Example:**
```powershell
curl http://localhost:8080/api/debug/camera-position | ConvertFrom-Json
```

---

### GET `/api/debug/raw-game-state`
Get raw game state (unprocessed).

**Example:**
```powershell
curl http://localhost:8080/api/debug/raw-game-state | ConvertFrom-Json
```

---

### GET `/api/debug/world-state`
Get processed world state data.

**Example:**
```powershell
curl http://localhost:8080/api/debug/world-state | ConvertFrom-Json
```

---

### GET `/api/debug/camera-test`
Test camera functionality.

**Example:**
```powershell
curl http://localhost:8080/api/debug/camera-test
```

---

## Usage Examples

### PowerShell

```powershell
# Get all rankings
curl http://localhost:8080/api/rankings | ConvertFrom-Json

# Get specific brain stats
curl http://localhost:8080/api/rankings/ollama:mistral | ConvertFrom-Json

# Get metrics
curl http://localhost:8080/api/metrics | ConvertFrom-Json

# Get match history
curl http://localhost:8080/api/match-history | ConvertFrom-Json

# Get current game state
curl http://localhost:8080/api/broadcast/current | ConvertFrom-Json

# Get chat messages with audio
curl http://localhost:8080/api/broadcast/chat | ConvertFrom-Json

# Download audio file
curl http://localhost:8080/api/broadcast/audio/trash_talk_1234567890_abc123.wav -o audio.wav

# Get dashboard
curl http://localhost:8080/api/dashboard | ConvertFrom-Json
```

### Bash/Linux

```bash
# Get all rankings
curl http://localhost:8080/api/rankings | jq

# Get specific brain stats
curl http://localhost:8080/api/rankings/ollama:mistral | jq

# Get metrics
curl http://localhost:8080/api/metrics | jq

# Get match history
curl http://localhost:8080/api/match-history | jq

# Download audio file
curl http://localhost:8080/api/broadcast/audio/trash_talk_1234567890_abc123.wav -o audio.wav
```

---

## Common Use Cases

### Monitor Rankings While Tournament Runs
```powershell
# Poll every 10 seconds
while ($true) {
  Clear-Host
  curl http://localhost:8080/api/rankings | ConvertFrom-Json | Format-Table
  Start-Sleep -Seconds 10
}
```

### Get Current Match Info
```powershell
curl http://localhost:8080/api/broadcast/current | ConvertFrom-Json | Format-List
```

### Download All Audio Files
```powershell
$messages = curl http://localhost:8080/api/broadcast/chat | ConvertFrom-Json
foreach ($msg in $messages.recentMessages) {
  if ($msg.audioFile) {
    curl $msg.audioFile -o "trash_talk_$([System.IO.Path]::GetFileName($msg.audioFile))"
  }
}
```

### Stream Rankings Every 30 Seconds
```powershell
while ($true) {
  Write-Host "=== Rankings ===" -ForegroundColor Green
  curl http://localhost:8080/api/rankings | ConvertFrom-Json | 
    Select-Object rank, brainId, rating, matches, trend | 
    Format-Table
  Write-Host ""
  Start-Sleep -Seconds 30
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success - Data returned |
| 404 | Not found - Invalid endpoint |
| 500 | Server error |

---

## Notes

- **Port:** 8080 (runs on same machine as arena loop)
- **Format:** JSON for data endpoints, binary for audio
- **Availability:** Only while arena loop is running
- **CORS:** Not configured (local use only)
- **Rate Limiting:** None (safe to poll frequently)

---

## Integration Examples

### Browser Fetch
```javascript
fetch('http://localhost:8080/api/rankings')
  .then(r => r.json())
  .then(data => console.log(data))
```

### Python Requests
```python
import requests
response = requests.get('http://localhost:8080/api/rankings')
data = response.json()
print(data)
```

### Node.js
```javascript
const http = require('http');
http.get('http://localhost:8080/api/rankings', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
```

