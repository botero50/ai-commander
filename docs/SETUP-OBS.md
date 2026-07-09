# OBS Setup Guide for AI Commander Streaming

This guide explains how to set up OBS (Open Broadcaster Software) to stream AI Commander matches with the professional broadcast overlay.

## Prerequisites

1. **OBS Studio** (v28.0 or later) — Download from [obsproject.com](https://obsproject.com)
2. **AI Commander** running locally (on your computer or accessible via network)
3. **Modern browser** (Chrome, Firefox, Safari, or Edge)

## Step 1: Start AI Commander

1. Start the AI Commander application
2. Open your browser and navigate to `http://localhost:3000` (or your configured port)
3. Note the IP address where AI Commander is running (important for remote OBS)

## Step 2: Launch AI Commander in Stream Mode

1. In the browser, navigate to Settings or click the **Stream Mode** button
2. Press `Ctrl+Shift+S` to activate stream mode
3. You should see the professional broadcast overlay appear

**Tip:** Stream mode hides all developer tools and debug information, showing only spectator-relevant UI.

## Step 3: Add OBS Browser Source

1. **Open OBS Studio**
2. **Create a new scene** or use an existing one:
   - Right-click in the "Scenes" panel → "Add Scene"
   - Name it (e.g., "AI Commander Broadcast")
3. **Add a Browser Source**:
   - In the "Sources" panel, click the **+** button
   - Select "Browser"
   - Name it (e.g., "AI Commander Overlay")

## Step 4: Configure the Browser Source URL

In the Browser source properties:

1. **URL field:** Enter the following:
   ```
   http://localhost:3000/?obs=true
   ```

   **For remote setups** (if AI Commander is on a different computer):
   ```
   http://[IP_ADDRESS]:3000/?obs=true
   ```
   Replace `[IP_ADDRESS]` with the actual IP address of the machine running AI Commander.

2. **Width:** 1920
3. **Height:** 1080
4. **Uncheck** "Shutdown source when not visible" (optional, but recommended)

## Step 5: Position and Size the Source

1. In the OBS preview, you should see the broadcast overlay appear
2. Position and resize it to fit your scene:
   - Drag to reposition
   - Use corner handles to resize (hold Shift to maintain aspect ratio)
3. **Recommended:** Full-screen overlay covering the game footage

## Step 6: Test the Connection

1. In AI Commander, start a match
2. Watch the OBS preview — the overlay should update in real-time
3. **Check for updates:**
   - Player stats should update as game progresses
   - Timer should count up
   - If no updates appear, check connection (see Troubleshooting below)

## Step 7: Customize OBS Layout (Optional)

### Multi-Scene Setup
Create multiple scenes for different parts of your broadcast:

1. **"Game Overlay"** — Game footage + AI Commander overlay
2. **"Leaderboard"** — Fullscreen leaderboard view
3. **"AI Profile"** — Fullscreen AI player profile
4. **"Break"** — Static image or logo during breaks

Switch between scenes during your broadcast using Scene buttons or hotkeys.

### Add Chat and Alerts (Optional)
1. Add a Chat source (Twitch, YouTube, etc.)
2. Add Alerts (StreamElements, AlertBox, etc.)
3. Position them below or to the side of the AI Commander overlay

## Step 8: Configure Streaming Settings

1. **File → Settings**
2. **Stream**:
   - **Service:** Select your platform (Twitch, YouTube, etc.)
   - **Server:** Auto-detected for most platforms
   - **Stream Key:** Paste your streaming key
3. **Output**:
   - **Video Bitrate:** 6000-8000 kbps (recommended)
   - **Audio Bitrate:** 128-160 kbps
   - **Resolution:** 1920x1080 @ 60fps (recommended for esports)

## Step 9: Go Live!

1. Click the **"Start Streaming"** button
2. Wait for confirmation (check Twitch/YouTube dashboard)
3. Your broadcast should now be live with the AI Commander overlay!

---

## Troubleshooting

### Issue: Overlay doesn't appear in OBS

**Solution:**
1. Check that `http://localhost:3000` is accessible in your browser
2. Verify the browser source URL is correct
3. Check OBS logs: **Help → View Logs**
4. Try reloading the browser source (right-click → Reload)

### Issue: Overlay appears but doesn't update

**Possible causes:**
1. **Data connection issue** — The backend isn't sending updates
   - Check AI Commander console for errors
   - Verify match is running (not paused)
2. **WebSocket blocked** — Firewall may be blocking updates
   - Check Windows Firewall: Allow OBS through
   - Check router settings if using remote IP
3. **Stale data** — Data is >10 seconds old
   - Check AI Commander is still running
   - Restart the match

**Solution:**
1. Open AI Commander in browser console (F12 → Console)
2. Look for error messages about "WebSocket" or "connection failed"
3. If you see errors, restart AI Commander

### Issue: OBS says "Source failed to load"

**Solution:**
1. Verify AI Commander is running on the correct port
2. Check the URL format (no typos, no extra spaces)
3. If using remote IP, verify network connectivity:
   ```bash
   ping [IP_ADDRESS]  # Test connection
   ```
4. Restart OBS

### Issue: Connection drops during stream

**Solution:**
1. This can happen if AI Commander crashes or network interrupts
2. OBS will show **"Reconnecting..."** in the browser source
3. The overlay will automatically reconnect when AI Commander restarts
4. No manual action needed — just restart the match

---

## Performance Tips

### Optimize CPU Usage
1. **Reduce refresh rate:** In browser source, lower "Update interval" if it freezes
2. **Use hardware acceleration:** OBS Settings → General → Enable hardware acceleration
3. **Close unnecessary tabs/apps** running on your computer

### Optimize Network Bandwidth
1. If streaming remotely, use a wired connection (Ethernet) instead of WiFi
2. Reduce game resolution if bandwidth is limited
3. Limit number of browser sources in OBS

### Monitor Performance
- **OBS Stats:** View → Stats (shows CPU/GPU usage, FPS, network)
- **AI Commander:** Open DevTools (F12) and check Performance tab

---

## Advanced Configuration

### Multi-Match Broadcasting
To broadcast multiple AI matches simultaneously:

1. Open multiple AI Commander instances on different ports (3000, 3001, 3002, etc.)
2. Add separate browser sources for each match
3. Position them in a grid layout in OBS

### Custom Overlay Styling
The broadcast overlay can be customized (colors, fonts, layout):

1. In AI Commander, go to Settings
2. Select "Broadcast Customization"
3. Choose a theme: Dark (default), Light, Colorblind, Minimal
4. Save and reload OBS browser source

### Recording Without Streaming
To record broadcasts for editing later:

1. In OBS, click **"Start Recording"** (instead of "Start Streaming")
2. Choose output location: **Settings → Output → Recording**
3. Video will be saved as `.mkv` or `.mp4` file
4. Use video editor (DaVinci Resolve, Adobe Premiere, etc.) to add titles, music, transitions

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review AI Commander logs: **C:/Users/YourUsername/.claude/ai-commander/logs**
3. Open an issue on GitHub: [AI Commander Issues](https://github.com/anthropics/ai-commander/issues)

---

## Next Steps

- [User Guide](./USER-GUIDE.md) — How to use AI Commander features
- [Keyboard Shortcuts](./KEYBOARD-SHORTCUTS.md) — All broadcast hotkeys
- [Streaming Best Practices](./STREAMING-BEST-PRACTICES.md) — Tips for professional broadcasts
