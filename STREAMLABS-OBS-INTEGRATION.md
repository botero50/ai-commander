# StreamLabs OBS Integration Guide

Complete guide to integrate AI Commander data into StreamLabs OBS for live streaming.

---

## What We'll Display

1. **Resources Panel** - Player economies (gold, wood, etc)
2. **Toxic Chat** - Live trash talk messages
3. **Top 5 Matches** - Match history with winners

---

## Part 1: Create Custom Browser Sources

StreamLabs OBS uses Browser Sources to display web content. We'll create HTML files that pull data from the API and update live.

### Step 1: Create Resources Display HTML

Create this file anywhere on your computer (e.g., `C:\StreamLabs\resources.html`):

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: transparent;
            font-family: Arial, sans-serif;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
        
        .container {
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #00ff00;
            padding: 15px;
            border-radius: 8px;
            min-width: 300px;
        }
        
        .title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            color: #00ff00;
        }
        
        .player {
            margin-bottom: 15px;
            border-left: 3px solid #00ff00;
            padding-left: 10px;
        }
        
        .player-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .stat {
            font-size: 14px;
            margin: 4px 0;
            display: flex;
            justify-content: space-between;
        }
        
        .label {
            color: #cccccc;
        }
        
        .value {
            color: #00ff00;
            font-weight: bold;
        }
        
        .p1 { border-left-color: #ff6b6b; }
        .p1 .player-name { color: #ff6b6b; }
        
        .p2 { border-left-color: #4ecdc4; }
        .p2 .player-name { color: #4ecdc4; }
    </style>
</head>
<body>
    <div class="container">
        <div class="title">⚔️ RESOURCES</div>
        
        <div id="player1" class="player p1">
            <div class="player-name">Player 1: --</div>
            <div class="stat">
                <span class="label">Units:</span>
                <span class="value" id="p1-units">0</span>
            </div>
            <div class="stat">
                <span class="label">Buildings:</span>
                <span class="value" id="p1-buildings">0</span>
            </div>
            <div class="stat">
                <span class="label">Population:</span>
                <span class="value" id="p1-population">0</span>
            </div>
            <div class="stat">
                <span class="label">Phase:</span>
                <span class="value" id="p1-phase">--</span>
            </div>
        </div>
        
        <div id="player2" class="player p2">
            <div class="player-name">Player 2: --</div>
            <div class="stat">
                <span class="label">Units:</span>
                <span class="value" id="p2-units">0</span>
            </div>
            <div class="stat">
                <span class="label">Buildings:</span>
                <span class="value" id="p2-buildings">0</span>
            </div>
            <div class="stat">
                <span class="label">Population:</span>
                <span class="value" id="p2-population">0</span>
            </div>
            <div class="stat">
                <span class="label">Phase:</span>
                <span class="value" id="p2-phase">--</span>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'http://localhost:8080/api/broadcast/current';
        
        function updateResources() {
            fetch(API_URL)
                .then(r => r.json())
                .then(data => {
                    // Player 1
                    document.getElementById('p1-units').textContent = data.player1.units || 0;
                    document.getElementById('p1-buildings').textContent = data.player1.buildings || 0;
                    document.getElementById('p1-population').textContent = data.player1.population || 0;
                    document.getElementById('p1-phase').textContent = data.player1.phase || '--';
                    
                    // Player 2
                    document.getElementById('p2-units').textContent = data.player2.units || 0;
                    document.getElementById('p2-buildings').textContent = data.player2.buildings || 0;
                    document.getElementById('p2-population').textContent = data.player2.population || 0;
                    document.getElementById('p2-phase').textContent = data.player2.phase || '--';
                })
                .catch(e => console.log('Waiting for match...'));
        }
        
        // Update every 500ms
        setInterval(updateResources, 500);
        updateResources();
    </script>
</body>
</html>
```

Save this as: **`C:\StreamLabs\resources.html`**

---

### Step 2: Create Toxic Chat Display HTML

Create this file:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 15px;
            background: transparent;
            font-family: Arial, sans-serif;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
        
        .container {
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #ff6b6b;
            padding: 15px;
            border-radius: 8px;
            max-width: 500px;
            min-height: 100px;
        }
        
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 12px;
            text-align: center;
            color: #ff6b6b;
        }
        
        .messages {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .message {
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-left: 3px solid #ff6b6b;
            border-radius: 4px;
            animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .speaker {
            font-weight: bold;
            color: #ff6b6b;
            font-size: 14px;
        }
        
        .text {
            font-size: 13px;
            margin-top: 4px;
            color: #ffffff;
        }
        
        .speaker.ollama { color: #ff6b6b; }
        .speaker.petra { color: #4ecdc4; }
    </style>
</head>
<body>
    <div class="container">
        <div class="title">💬 TRASH TALK</div>
        <div class="messages" id="messages"></div>
    </div>

    <script>
        const API_URL = 'http://localhost:8080/api/broadcast/chat';
        const MAX_MESSAGES = 5;
        
        function updateChat() {
            fetch(API_URL)
                .then(r => r.json())
                .then(data => {
                    const messagesDiv = document.getElementById('messages');
                    
                    if (!data.recentMessages || data.recentMessages.length === 0) {
                        messagesDiv.innerHTML = '<p style="text-align: center; color: #888;">Waiting for trash talk...</p>';
                        return;
                    }
                    
                    // Show last 5 messages, newest at bottom
                    const messages = data.recentMessages.slice(-MAX_MESSAGES);
                    messagesDiv.innerHTML = messages.map(msg => `
                        <div class="message">
                            <div class="speaker ${msg.speaker.toLowerCase()}">${msg.speaker}</div>
                            <div class="text">"${msg.message}"</div>
                        </div>
                    `).join('');
                })
                .catch(e => {
                    document.getElementById('messages').innerHTML = 
                        '<p style="text-align: center; color: #888;">Loading...</p>';
                });
        }
        
        // Update every 1 second
        setInterval(updateChat, 1000);
        updateChat();
    </script>
</body>
</html>
```

Save this as: **`C:\StreamLabs\trash-talk.html`**

---

### Step 3: Create Match History Display HTML

Create this file:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 15px;
            background: transparent;
            font-family: Arial, sans-serif;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
        
        .container {
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #4ecdc4;
            padding: 15px;
            border-radius: 8px;
            max-width: 600px;
        }
        
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 12px;
            text-align: center;
            color: #4ecdc4;
        }
        
        .match-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .match-item {
            margin-bottom: 10px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            border-left: 3px solid #4ecdc4;
            animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-10px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .match-number {
            font-size: 12px;
            color: #888;
        }
        
        .match-result {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        
        .player {
            flex: 1;
        }
        
        .player-name {
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .rating-change {
            font-size: 12px;
            margin-top: 2px;
        }
        
        .winner {
            color: #00ff00;
            font-weight: bold;
            padding: 0 5px;
        }
        
        .vs {
            color: #888;
            margin: 0 10px;
        }
        
        .p1 .player-name { color: #ff6b6b; }
        .p2 .player-name { color: #4ecdc4; }
        
        .positive { color: #00ff00; }
        .negative { color: #ff6b6b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="title">🏆 TOP 5 MATCHES</div>
        <div class="match-list" id="matches"></div>
    </div>

    <script>
        const API_URL = 'http://localhost:8080/api/match-history';
        
        function updateMatches() {
            fetch(API_URL)
                .then(r => r.json())
                .then(data => {
                    const matchesDiv = document.getElementById('matches');
                    
                    if (!data.recentMatches || data.recentMatches.length === 0) {
                        matchesDiv.innerHTML = '<p style="text-align: center; color: #888;">No matches yet...</p>';
                        return;
                    }
                    
                    // Show last 5 matches
                    const matches = data.recentMatches.slice(-5).reverse();
                    matchesDiv.innerHTML = matches.map((match, idx) => {
                        const p1 = match.player1;
                        const p2 = match.player2;
                        const winner = match.winner === 'player1' ? p1.brainId : p2.brainId;
                        const p1Won = match.winner === 'player1';
                        
                        return `
                            <div class="match-item">
                                <div class="match-number">Match ${data.totalMatches - matches.length + idx + 1}</div>
                                <div class="match-result">
                                    <div class="player p1">
                                        <div class="player-name">${p1.brainId}</div>
                                        <div class="rating-change">
                                            <span class="${p1.ratingChange >= 0 ? 'positive' : 'negative'}">
                                                ${p1.ratingChange >= 0 ? '+' : ''}${p1.ratingChange}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="vs">
                                        ${p1Won ? '<span class="winner">✓ WIN</span>' : '<span style="color: #ff6b6b;">✗</span>'}
                                    </div>
                                    <div class="player p2">
                                        <div class="player-name">${p2.brainId}</div>
                                        <div class="rating-change">
                                            <span class="${p2.ratingChange >= 0 ? 'positive' : 'negative'}">
                                                ${p2.ratingChange >= 0 ? '+' : ''}${p2.ratingChange}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                })
                .catch(e => {
                    document.getElementById('matches').innerHTML = 
                        '<p style="text-align: center; color: #888;">Loading...</p>';
                });
        }
        
        // Update every 2 seconds
        setInterval(updateMatches, 2000);
        updateMatches();
    </script>
</body>
</html>
```

Save this as: **`C:\StreamLabs\match-history.html`**

---

## Part 2: Add to StreamLabs OBS

### Step 1: Open StreamLabs OBS

Launch StreamLabs OBS and open your scene.

### Step 2: Add Browser Sources

**For Resources Panel:**
1. Click **"+"** in the Sources panel
2. Select **"Browser Source"**
3. Name it: `Resources Display`
4. URL: `file:///C:/StreamLabs/resources.html`
5. Width: `400` Height: `300`
6. Click **Add Source**

**For Trash Talk:**
1. Click **"+"** in the Sources panel
2. Select **"Browser Source"**
3. Name it: `Trash Talk`
4. URL: `file:///C:/StreamLabs/trash-talk.html`
5. Width: `600` Height: `400`
6. Click **Add Source**

**For Match History:**
1. Click **"+"** in the Sources panel
2. Select **"Browser Source"**
3. Name it: `Match History`
4. URL: `file:///C:/StreamLabs/match-history.html`
5. Width: `650` Height: `350`
6. Click **Add Source**

### Step 3: Position Your Panels

Drag each source to your desired position on the canvas:
- Resources: Top left or right
- Trash Talk: Center bottom
- Match History: Top or bottom (wherever fits)

---

## Part 3: Optional - Add Text Overlays

You can also display individual stats with text sources:

1. Add **Text Source**
2. Name: `P1 Rating`
3. Add this URL in a custom script field (if supported):
   ```
   Use /api/rankings endpoint to fetch and display
   ```

Or use **Browser Source** with simplified HTML for each stat.

---

## Part 4: Auto-Update Without Reloading

The HTML files automatically update every 500ms-2s. No manual refresh needed!

### If data stops updating:
1. Right-click the source
2. Select **Refresh Cache**
3. Or restart the browser source

---

## Troubleshooting

### "Localhost not found" error
- Make sure arena loop is running: `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts`
- Verify it says `HTTP server listening on port 8080`

### Data not updating
- Check browser console (F12 in browser source)
- Verify API is responding: Open `http://localhost:8080/api/broadcast/current` in browser

### Images/styling looks wrong
- Right-click source → **Refresh Cache**
- Check file paths are correct (`C:\StreamLabs\`)

---

## Customization

### Change Update Frequency
In any HTML file, find:
```javascript
setInterval(updateResources, 500);  // Update every 500ms
```

Change `500` to:
- `1000` = 1 second
- `2000` = 2 seconds
- `5000` = 5 seconds

### Change Colors
Edit the CSS `<style>` section:
- `color: #00ff00` = Green
- `color: #ff6b6b` = Red
- `color: #4ecdc4` = Cyan
- `background: rgba(0, 0, 0, 0.7)` = Opacity

### Change Font Size
Find `font-size: 14px` and adjust the number.

---

## Advanced: Custom Widgets

You can create custom HTML files to display:
- **ELO Ratings** - From `/api/rankings`
- **Match Timer** - From `/api/broadcast/current`
- **Winner Announcements** - From `/api/match-history`
- **Leaderboard** - Top 10 players

Just follow the same pattern:
1. Create HTML file
2. Add `<script>` to fetch from API
3. Update DOM elements
4. Add as Browser Source in OBS

---

## Next Steps

1. **Create the 3 HTML files** in `C:\StreamLabs\`
2. **Add Browser Sources** to StreamLabs OBS
3. **Start arena loop** - Data will auto-populate
4. **Position sources** on your scene
5. **Go live!** 🎮

---

## API Reference

The HTML files use these endpoints:
- `GET /api/broadcast/current` - Live resources
- `GET /api/broadcast/chat` - Trash talk
- `GET /api/match-history` - Match results

See [API-ENDPOINTS.md](API-ENDPOINTS.md) for complete reference.

