# OBS Integration Guide for EPIC 62 Trash Talk Broadcast

**Status:** Ready to implement  
**Difficulty:** Medium  

---

## What You Need

1. **OBS Studio** (free, open-source)
   - Download: https://obsproject.com/
   - Version: 29.0+ recommended

2. **OBS WebSocket Plugin** (for programmatic control)
   - Download: https://github.com/obsproject/obs-websocket/releases
   - Version: 5.0+ (supports WebSocket 5.1 protocol)

3. **Node.js script** to bridge streaming data to OBS
   - Connects to our broadcast server (port 8765)
   - Sends data to OBS WebSocket (port 4444)

---

## Step 1: Install OBS

1. Download OBS Studio: https://obsproject.com/download
2. Install normally
3. Launch OBS

---

## Step 2: Install OBS WebSocket Plugin

### On Windows:

1. Go to: https://github.com/obsproject/obs-websocket/releases
2. Download: `OBS-Studio-X.XX.X-Windows-Installer.exe` (the one with `obs-websocket`)
   - OR: Download just the plugin ZIP if you already have OBS

3. If you downloaded the plugin ZIP:
   - Extract to: `C:\Program Files\obs-studio\obs-plugins\`
   - Create folders if they don't exist

4. Restart OBS

5. Verify installation:
   - Go to **Tools → WebSocket Server Settings**
   - You should see port **4444** (or 4455 for newer versions)

---

## Step 3: Test the Streaming Connection

### Method A: Quick PowerShell Test

Run the test script we created:

```powershell
powershell -ExecutionPolicy Bypass -File test-websocket.ps1
```

**Expected output:**
```
🔌 Connecting to WebSocket on ws://localhost:8765...

✅ Connected to broadcast server!

Listening for messages (30 seconds)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Message Type: event
    Timestamp: 1720722730123
    Event: metrics_update
    Tick: 5200

[2] Message Type: chat
    Speaker: player1
    Message: Your economy is crumbling!

[3] Message Type: state_update
    Players: 2
...
```

If you see messages → **Your streaming is working!** ✅

---

## Step 4: Create OBS Scene for Broadcast

### In OBS:

1. **Create a new Scene:**
   - Click **+** next to "Scenes" (bottom left)
   - Name it: "Game Broadcast"

2. **Add Game Source:**
   - Click **+** next to "Sources"
   - Select "Game Capture" or "Display Capture"
   - Select your 0 A.D. window
   - Click "OK"

3. **Add Text Source for Trash Talk:**
   - Click **+** next to "Sources"
   - Select "Text (GDI+)"
   - Name it: "Trash Talk Feed"
   - Click "OK"
   - Set text: "Waiting for trash talk..."
   - Position: Bottom left of screen
   - Font: Bold, size 20+, color: Red or Yellow

4. **Add Text Source for Metrics:**
   - Click **+** next to "Sources"
   - Select "Text (GDI+)"
   - Name it: "Game Metrics"
   - Set text: "P1: 0 units | P2: 0 units"
   - Position: Top left of screen
   - Font: Monospace, size 14, color: White

---

## Step 5: Bridge Streaming Data to OBS (Node.js Script)

Create a new file: `packages/zeroad-adapter/src/broadcast/obs-bridge.ts`

```typescript
import WebSocket from 'ws';
import { Logger } from '../config/logger.js';

/**
 * OBS Bridge — Connects to arena broadcast server and updates OBS
 * 
 * Flow:
 * Arena Loop (port 8765)
 *   ↓
 * obs-bridge (listens on 8765, connects to OBS on 4444)
 *   ↓
 * OBS (updates text sources in real-time)
 */

interface BroadcastMessage {
  type: 'chat' | 'state_update' | 'event';
  timestamp: number;
  payload: any;
}

interface OBSRequest {
  requestType: string;
  requestData: any;
}

export class OBSBridge {
  private logger: Logger;
  private broadcastWs: WebSocket | null = null;
  private obsWs: WebSocket | null = null;
  private obsPort: number;
  private broadcastUrl: string;

  constructor(logger: Logger, broadcastUrl = 'ws://localhost:8765', obsPort = 4444) {
    this.logger = logger;
    this.broadcastUrl = broadcastUrl;
    this.obsPort = obsPort;
  }

  /**
   * Start the bridge
   */
  async start(): Promise<void> {
    this.logger.info(`🎬 OBS Bridge starting...`);

    // Connect to OBS
    await this.connectToOBS();

    // Connect to Broadcast Server
    this.connectToBroadcast();
  }

  /**
   * Connect to OBS WebSocket
   */
  private async connectToOBS(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.obsWs = new WebSocket(`ws://localhost:${this.obsPort}`);

        this.obsWs.on('open', () => {
          this.logger.info(`✅ Connected to OBS on port ${this.obsPort}`);
          resolve();
        });

        this.obsWs.on('error', (error: any) => {
          this.logger.error('OBS connection error:', error.message);
          reject(error);
        });

        this.obsWs.on('message', (data: any) => {
          // OBS responses (for future use)
        });
      } catch (error) {
        this.logger.error('Failed to connect to OBS:', error);
        reject(error);
      }
    });
  }

  /**
   * Connect to Broadcast Server
   */
  private connectToBroadcast(): void {
    try {
      this.broadcastWs = new WebSocket(this.broadcastUrl);

      this.broadcastWs.on('open', () => {
        this.logger.info(`✅ Connected to broadcast server on ${this.broadcastUrl}`);
      });

      this.broadcastWs.on('message', (data: any) => {
        try {
          const message: BroadcastMessage = JSON.parse(data.toString());
          this.handleBroadcastMessage(message);
        } catch (error) {
          this.logger.debug('Failed to parse broadcast message:', error);
        }
      });

      this.broadcastWs.on('error', (error: any) => {
        this.logger.warn('Broadcast connection error:', error.message);
      });

      this.broadcastWs.on('close', () => {
        this.logger.info('Broadcast connection closed, reconnecting in 5s...');
        setTimeout(() => this.connectToBroadcast(), 5000);
      });
    } catch (error) {
      this.logger.error('Failed to connect to broadcast:', error);
    }
  }

  /**
   * Handle incoming broadcast message
   */
  private handleBroadcastMessage(message: BroadcastMessage): void {
    if (!this.obsWs || this.obsWs.readyState !== WebSocket.OPEN) {
      return;
    }

    switch (message.type) {
      case 'chat':
        this.updateTrashTalkText(message.payload);
        break;
      case 'state_update':
        this.updateGameStateText(message.payload);
        break;
      case 'event':
        if (message.payload.eventType === 'metrics_update') {
          this.updateMetricsText(message.payload.metrics);
        }
        break;
    }
  }

  /**
   * Update trash talk text source in OBS
   */
  private updateTrashTalkText(payload: any): void {
    const { speaker, message } = payload;
    const text = `${speaker === 'player1' ? '🔴' : '🔵'} ${speaker}: "${message}"`;

    this.sendOBSRequest({
      requestType: 'SetSourceFilterSettings',
      requestData: {
        sourceName: 'Trash Talk Feed',
        filterName: 'Text Gdiplus Filter',
        filterSettings: {
          text: text,
        },
      },
    });
  }

  /**
   * Update game state text source in OBS
   */
  private updateGameStateText(payload: any): void {
    if (!payload.players || payload.players.length < 2) return;

    const p1 = payload.players[0];
    const p2 = payload.players[1];

    const text =
      `P1 (${p1.name}): ${p1.units} units | Wood: ${p1.resources.wood}\n` +
      `P2 (${p2.name}): ${p2.units} units | Wood: ${p2.resources.wood}`;

    this.sendOBSRequest({
      requestType: 'SetSourceFilterSettings',
      requestData: {
        sourceName: 'Game Metrics',
        filterName: 'Text Gdiplus Filter',
        filterSettings: {
          text: text,
        },
      },
    });
  }

  /**
   * Update metrics text source in OBS
   */
  private updateMetricsText(metrics: any): void {
    const p1 = metrics.player1;
    const p2 = metrics.player2;

    const text =
      `P1: ${p1.unitCount} units (${p1.trend}) | Resources: ${p1.totalResources}\n` +
      `P2: ${p2.unitCount} units (${p2.trend}) | Resources: ${p2.totalResources}\n` +
      `Winner: ${metrics.gameProgress.provisionalWinner}`;

    this.sendOBSRequest({
      requestType: 'SetSourceFilterSettings',
      requestData: {
        sourceName: 'Game Metrics',
        filterName: 'Text Gdiplus Filter',
        filterSettings: {
          text: text,
        },
      },
    });
  }

  /**
   * Send request to OBS
   */
  private sendOBSRequest(request: OBSRequest): void {
    if (!this.obsWs || this.obsWs.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.obsWs.send(JSON.stringify(request));
    } catch (error) {
      this.logger.debug('Failed to send OBS request:', error);
    }
  }

  /**
   * Stop the bridge
   */
  stop(): void {
    if (this.broadcastWs) {
      this.broadcastWs.close();
    }
    if (this.obsWs) {
      this.obsWs.close();
    }
  }
}
```

---

## Step 6: Start OBS Bridge (When Ready)

Add to arena loop startup:

```typescript
import { OBSBridge } from '../broadcast/obs-bridge.js';

// After BroadcastServer starts:
const obsBridge = new OBSBridge(logger);
obsBridge.start().catch(err => {
  logger.warn('OBS bridge not available:', err.message);
  // Game continues without OBS
});
```

---

## Step 7: Stream to Twitch

### In OBS:

1. Go to **Settings → Stream**
2. Select **Service: Twitch**
3. Paste your **Twitch Stream Key**
4. Click **Start Streaming**

---

## What You'll See

**On your OBS scene:**

```
[Game Window - Full Screen]

🎨 Top Left (Metrics):
   P1: 22 units (up) | Resources: 1770
   P2: 15 units (stable) | Resources: 1290
   Winner: player1

🎤 Bottom Left (Trash Talk):
   🔴 player1: "Your economy is crumbling!"
   (updates every 500 ticks)
```

**On Twitch (viewers see):**
- Full game footage
- Live trash talk overlay
- Live metrics overlay
- Professional broadcast appearance

---

## Troubleshooting

### "Cannot connect to OBS"
- Make sure OBS WebSocket plugin is installed
- Check port 4444 is correct (newer versions use 4455)
- Restart OBS after plugin install

### "No trash talk appearing"
- Check that game is actually generating trash talk
- Verify Ollama is running: `ollama serve`
- Check arena loop is running

### "Text updates too slow"
- Increase update frequency in obs-bridge.ts
- Reduce other background processes
- Use wired internet (not WiFi)

---

## Next Steps

1. ✅ Test WebSocket connection (use test-websocket.ps1)
2. ✅ Install OBS + WebSocket plugin
3. ✅ Create OBS scene with text sources
4. ✅ Run OBS bridge when ready
5. ✅ Stream to Twitch

---

**When everything is set up, you can broadcast live Ollama vs Ollama matches with real-time trash talk directly to Twitch!** 🎮📺💬
