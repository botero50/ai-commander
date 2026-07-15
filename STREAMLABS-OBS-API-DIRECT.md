# StreamLabs OBS - Direct API Integration (No HTML Files)

Use StreamLabs OBS's native features to pull data directly from API endpoints.

---

## Option 1: Text Source (Simplest)

StreamLabs OBS can display text from URLs or use custom scripts.

### Display Resources (Units, Buildings, Population)

**Method 1A: Using StreamLabs Text Source Plugin**

1. Add **Text Source** to your scene
2. Click **Settings (gear icon)**
3. In the text field, click the **URL icon** (if available)
4. Enter API endpoint:
   ```
   http://localhost:8080/api/broadcast/current
   ```
5. The source will try to display the JSON response

**Better: Parse JSON with Custom Script**

StreamLabs OBS supports custom scripts. Create a simple text source that pulls and formats data.

---

## Option 2: Browser Source (Recommended - Still Simple)

Instead of a full HTML file, use a minimal HTML that just formats the API response.

### One-Liner HTML for Resources

Save as `C:\StreamLabs\simple-resources.html`:

```html
<body style="background: transparent; color: #00ff00; font-family: Arial; text-shadow: 2px 2px 4px #000; margin: 0; padding: 10px;">
<div id="data" style="font-size: 16px; line-height: 1.8;"></div>
<script>
fetch('http://localhost:8080/api/broadcast/current').then(r => r.json()).then(d => {
  document.getElementById('data').innerHTML = `
    <b style="color: #ff6b6b;">P1: ${d.player1.name}</b><br>
    Units: ${d.player1.units} | Buildings: ${d.player1.buildings} | Pop: ${d.player1.population}<br>
    <b style="color: #4ecdc4;">P2: ${d.player2.name}</b><br>
    Units: ${d.player2.units} | Buildings: ${d.player2.buildings} | Pop: ${d.player2.population}
  `;
  setTimeout(arguments.callee, 500);
}).catch(() => document.getElementById('data').innerHTML = 'Waiting...');
</script>
</body>
```

---

## Option 3: Use StreamLabs "Custom JSON" (Native)

StreamLabs OBS has a **Custom JSON** source for pulling API data directly.

### Steps:

1. Add **Browser Source** 
2. URL: Leave blank initially
3. **Right-click → Properties**
4. Enable **Use Custom JSON**
5. Paste endpoint: `http://localhost:8080/api/broadcast/current`
6. Configure how to display the response

---

## Option 4: WebSocket Source (Real-Time)

If you want truly real-time updates without polling, you can create a WebSocket endpoint.

For now, the **API polling** (Option 2) is simpler and works great.

---

## The Easiest Way: Just Use URLs Directly

### In StreamLabs OBS - No Code Needed:

**For Text Overlay:**
1. Add **Text Source**
2. Enable "Read from file" or "Custom text"
3. Manually check and copy-paste from:
   ```
   http://localhost:8080/api/broadcast/current
   http://localhost:8080/api/broadcast/chat
   http://localhost:8080/api/match-history
   ```

**Problem:** Manual updates (not real-time)

**Better:** Use Browser Source with minimal HTML (Option 2)

---

## Recommended Setup (Minimal Code)

Create these simple HTML files that are just wrappers around the API:

### 1. Resources Display

**File:** `C:\StreamLabs\api-resources.html`

```html
<style>body { background: transparent; color: #fff; font-family: monospace; font-size: 14px; margin: 0; padding: 10px; text-shadow: 2px 2px #000; }</style>
<pre id="data">Loading...</pre>
<script>
async function update() {
  try {
    const r = await fetch('http://localhost:8080/api/broadcast/current');
    const d = await r.json();
    document.getElementById('data').textContent = 
      `P1: ${d.player1.name}\nUnits: ${d.player1.units} | Buildings: ${d.player1.buildings}\nPopulation: ${d.player1.population} | Phase: ${d.player1.phase}\n\n` +
      `P2: ${d.player2.name}\nUnits: ${d.player2.units} | Buildings: ${d.player2.buildings}\nPopulation: ${d.player2.population} | Phase: ${d.player2.phase}`;
  } catch(e) { document.getElementById('data').textContent = 'Waiting for match...'; }
}
setInterval(update, 500);
update();
</script>
```

### 2. Trash Talk Display

**File:** `C:\StreamLabs\api-trash-talk.html`

```html
<style>body { background: transparent; color: #fff; font-family: Arial; font-size: 14px; margin: 0; padding: 10px; text-shadow: 2px 2px #000; }</style>
<div id="data" style="max-height: 200px; overflow-y: auto;"></div>
<script>
async function update() {
  try {
    const r = await fetch('http://localhost:8080/api/broadcast/chat');
    const d = await r.json();
    if (!d.recentMessages) return;
    document.getElementById('data').innerHTML = d.recentMessages.slice(-3)
      .map(m => `<p style="margin: 5px 0;"><b>${m.speaker}:</b> "${m.message}"</p>`)
      .join('');
  } catch(e) { document.getElementById('data').innerHTML = '<p>Waiting...</p>'; }
}
setInterval(update, 1000);
update();
</script>
```

### 3. Match History

**File:** `C:\StreamLabs\api-matches.html`

```html
<style>body { background: transparent; color: #fff; font-family: monospace; font-size: 12px; margin: 0; padding: 10px; text-shadow: 2px 2px #000; }</style>
<pre id="data">Loading...</pre>
<script>
async function update() {
  try {
    const r = await fetch('http://localhost:8080/api/match-history');
    const d = await r.json();
    if (!d.recentMatches) return;
    document.getElementById('data').textContent = d.recentMatches.slice(-5)
      .map(m => `${m.player1.brainId} ${m.winner === 'player1' ? '✓ WIN' : '✗'} vs ${m.player2.brainId} ${m.winner === 'player2' ? '✓ WIN' : '✗'}`)
      .join('\n');
  } catch(e) { document.getElementById('data').textContent = 'Waiting...'; }
}
setInterval(update, 2000);
update();
</script>
```

---

## Adding to StreamLabs OBS

1. **Add Browser Source**
2. Name: `Resources`
3. URL: `file:///C:/StreamLabs/api-resources.html`
4. Size: 400x250
5. **Add Source**

Repeat for trash-talk and matches.

---

## Alternative: Pure API Endpoints in Custom Fields

Some StreamLabs plugins support direct JSON paths:

1. Add **Browser Source**
2. Use a plugin like **"API Widget"** or **"JSON Display"**
3. Point directly to: `http://localhost:8080/api/broadcast/current`
4. Configure JSON path: `player1.units`, `player2.buildings`, etc.

Check your StreamLabs OBS marketplace for available plugins.

---

## The Absolute Simplest: Just Raw API

If you want to see raw API data in a text overlay:

1. Open `http://localhost:8080/api/broadcast/current` in browser
2. Copy the JSON
3. Paste into a **Text Source** in OBS
4. Manually refresh as needed

**Not real-time, but works.**

---

## Comparison

| Method | Setup Time | Real-Time | Customization |
|--------|-----------|-----------|---------------|
| Text Source (Manual) | 2 min | ❌ No | None |
| Browser + HTML Files | 10 min | ✅ Yes | Full |
| Browser + Simple HTML | 5 min | ✅ Yes | Moderate |
| API Widget Plugin | 5 min | ✅ Yes | Full |
| Raw JSON Copy-Paste | 1 min | ❌ No | None |

---

## Recommended Path

1. **Use the simple HTML files** (5 min setup)
   - Just 3 small files that wrap the API
   - Real-time updates
   - Easy to customize

2. **If no HTML needed**, ask StreamLabs OBS support about:
   - JSON display widgets
   - API plugins
   - Direct endpoint binding

---

## Quick Test

Before adding to OBS, test the API in your browser:

```
http://localhost:8080/api/broadcast/current
http://localhost:8080/api/broadcast/chat
http://localhost:8080/api/match-history
```

Copy the JSON you see and that's what OBS will display.

---

## Summary

**Best approach:**
1. Create minimal HTML files (just API wrappers)
2. Point OBS Browser Sources to them
3. They auto-fetch and display data
4. Real-time updates every 500ms-2s
5. Done!

No complex code needed - just small HTML files that call the API you already have.

