/**
 * Dashboard Server: Lightweight local web server for AI Commander runtime visualization.
 *
 * Serves a real-time browser dashboard showing:
 * - Runtime status and execution progress
 * - Current mission state (goal, plan, decision, command)
 * - World state and agents
 * - Live timeline of execution events
 * - Runtime controls (pause, resume, step, stop)
 *
 * Uses Server-Sent Events (SSE) for live updates.
 * No authentication, no database, local-only operation.
 */

import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { DashboardDebugger } from './dashboard-debugger.js';
import { TimelineInspector } from './timeline-inspector.js';
import type { ExecutionTrace } from './execution-trace.js';
import type { RuntimeMetrics } from './runtime-metrics.js';

export interface DashboardRuntimeState {
  readonly status: 'initializing' | 'running' | 'paused' | 'stopped' | 'completed';
  readonly currentTick: number;
  readonly missionId: string;
  readonly elapsedMs: number;
  readonly executionMode: 'continuous' | 'step' | 'paused';
}

export interface DashboardGoalCandidate {
  readonly goalId: string;
  readonly intent: string;
  readonly score: number;
  readonly priorityFactor: number;
  readonly statusFactor: number;
  readonly urgencyFactor: number;
  readonly feasibilityFactor: number;
  readonly reasoning: string;
  readonly isSelected: boolean;
}

export interface DashboardGoalLifecycle {
  readonly goalId: string;
  readonly intent: string;
  readonly lifecycleState: 'Queued' | 'Candidate' | 'Selected' | 'Executing' | 'Completed' | 'Failed' | 'Blocked' | 'Cancelled';
  readonly createdAtTick: number;
  readonly selectedAtTick?: number;
  readonly completedAtTick?: number;
  readonly failedAtTick?: number;
  readonly transitions: readonly {
    readonly tick: number;
    readonly from: string;
    readonly to: string;
  }[];
}

export interface DashboardMissionState {
  readonly goalId: string;
  readonly goalIntent: string;
  readonly goalStatus: string;
  readonly planSteps: number;
  readonly currentStep: number;
  readonly lastDecision: string;
  readonly lastCommand: string;
  readonly progress?: {
    readonly percent: number;
    readonly trend: 'improving' | 'stable' | 'regressing';
    readonly reason: string;
    readonly evidence: {
      readonly currentX?: number;
      readonly currentY?: number;
      readonly targetX?: number;
      readonly targetY?: number;
      readonly currentDistance?: number;
      readonly initialDistance?: number;
      readonly distanceCovered?: number;
    };
    readonly measurements: readonly {
      readonly tick: number;
      readonly percent: number;
    }[];
  };
  readonly goalCandidates?: readonly DashboardGoalCandidate[];
  readonly goalSelectionReasoning?: string;
  readonly goalLifecycles?: readonly DashboardGoalLifecycle[];
  readonly lastGoalAdaptation?: {
    readonly tick: number;
    readonly from: string;
    readonly to: string;
    readonly worldStateChange: string;
    readonly scoreImprovement: number;
    readonly reasoning: string;
  };
  readonly gatheringProgress?: {
    readonly fieldId: string;
    readonly resourceType: string;
    readonly targetAmount: number;
    readonly amountCollected: number;
    readonly amountRemaining: number;
    readonly percentComplete: number;
    readonly status: 'traveling' | 'gathering' | 'returning' | 'complete';
    readonly gatheringRate: number;
    readonly estimatedCompletionTick: number | undefined;
    readonly detectedAtTick: number;
    readonly selectedAtTick: number;
    readonly startedAtTick: number;
  };
}

export interface DashboardWorldState {
  readonly friendlyUnits: number;
  readonly enemyUnits: number;
  readonly resources: string;
  readonly currentMap: string;
  readonly lastObservationMs: number;
}

export interface DashboardTimelineEvent {
  readonly tick: number;
  readonly timestamp: number;
  readonly type: string;
  readonly detail: string;
}

export interface DashboardState {
  readonly runtime: DashboardRuntimeState;
  readonly mission: DashboardMissionState;
  readonly world: DashboardWorldState;
  readonly timeline: readonly DashboardTimelineEvent[];
  readonly debugger?: {
    readonly mode: 'live' | 'inspection' | 'comparison';
    readonly selectedTick: number | null;
    readonly inspection?: unknown;
    readonly comparison?: unknown;
  };
}

export interface DashboardControlEvent {
  readonly command: 'pause' | 'resume' | 'step' | 'stop';
}

/**
 * DashboardServer: HTTP server for real-time dashboard visualization.
 */
export class DashboardServer {
  private server: http.Server;
  private port: number;
  private state: DashboardState;
  private controlCallbacks: Map<string, (cmd: string) => Promise<void>> = new Map();
  private stateChangeCallbacks: Map<string, (state: DashboardState) => void> = new Map();
  private debugger: DashboardDebugger = new DashboardDebugger();
  private inspector: TimelineInspector = new TimelineInspector();

  constructor(port: number = 3000) {
    this.port = port;
    this.state = this.createInitialState();
    this.server = this.createHttpServer();
  }

  /**
   * Start the dashboard server.
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  /**
   * Stop the dashboard server.
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all SSE connections
      this.clients.forEach((client) => {
        client.end();
      });
      this.clients = [];

      // Close server
      this.server.close(() => {
        resolve();
      });
    });
  }

  /**
   * Get the dashboard URL.
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Register a control callback handler.
   */
  onControl(callback: (command: string) => Promise<void>): void {
    this.controlCallbacks.set('handler', callback);
  }

  /**
   * Register a state change callback handler.
   */
  onStateChange(callback: (state: DashboardState) => void): void {
    this.stateChangeCallbacks.set('handler', callback);
  }

  /**
   * Initialize debugger with trace data.
   */
  initializeDebugger(trace: ExecutionTrace, metrics: RuntimeMetrics): void {
    this.inspector.initialize(trace, metrics);
    this.debugger.initialize(trace, metrics);
    this.debugger.onStateChange(() => {
      this.updateDebuggerState();
    });
    this.updateDebuggerState();
  }

  /**
   * Update dashboard state and broadcast to all connected clients.
   */
  updateState(newState: Partial<DashboardState>): void {
    this.state = Object.freeze({
      ...this.state,
      ...newState,
    });
    const callback = this.stateChangeCallbacks.get('handler');
    if (callback) {
      callback(this.state);
    }
  }

  /**
   * Add a timeline event and broadcast.
   */
  addTimelineEvent(event: DashboardTimelineEvent): void {
    const timeline = [...this.state.timeline, event];
    this.state = Object.freeze({
      ...this.state,
      timeline,
    });
    // Only broadcast the new event, not the entire timeline
    const eventData = JSON.stringify({ timeline: [event] });
    this.clients.forEach((client) => {
      client.write(`data: ${eventData}\n\n`);
    });
  }

  /**
   * Update mission progress and broadcast.
   */
  updateProgress(progress: DashboardMissionState['progress']): void {
    const mission = this.state.mission;
    this.state = Object.freeze({
      ...this.state,
      mission: Object.freeze({
        ...mission,
        progress,
      }),
    });
  }

  /**
   * Update goal candidates and selection reasoning.
   */
  updateGoalCandidates(
    candidates: readonly DashboardGoalCandidate[],
    reasoning: string
  ): void {
    const mission = this.state.mission;
    this.state = Object.freeze({
      ...this.state,
      mission: Object.freeze({
        ...mission,
        goalCandidates: candidates,
        goalSelectionReasoning: reasoning,
      }),
    });
  }

  updateGoalLifecycles(lifecycles: readonly DashboardGoalLifecycle[]): void {
    const mission = this.state.mission;
    this.state = Object.freeze({
      ...this.state,
      mission: Object.freeze({
        ...mission,
        goalLifecycles: lifecycles,
      }),
    });
  }

  updateGoalAdaptation(adaptation: {
    tick: number;
    from: string;
    to: string;
    worldStateChange: string;
    scoreImprovement: number;
    reasoning: string;
  }): void {
    const mission = this.state.mission;
    this.state = Object.freeze({
      ...this.state,
      mission: Object.freeze({
        ...mission,
        lastGoalAdaptation: adaptation,
      }),
    });
  }

  updateGatheringProgress(progress: {
    fieldId: string;
    resourceType: string;
    targetAmount: number;
    amountCollected: number;
    amountRemaining: number;
    percentComplete: number;
    status: 'traveling' | 'gathering' | 'returning' | 'complete';
    gatheringRate: number;
    estimatedCompletionTick?: number;
    detectedAtTick: number;
    selectedAtTick: number;
    startedAtTick: number;
  }): void {
    const mission = this.state.mission;
    this.state = Object.freeze({
      ...this.state,
      mission: Object.freeze({
        ...mission,
        gatheringProgress: progress,
      }),
    });
  }

  /**
   * Update debugger state and broadcast.
   */
  private updateDebuggerState(): void {
    const debuggerState = this.debugger.getState();
    const inspection =
      debuggerState.selectedTick !== null
        ? this.debugger.getSelectedTickInspection()
        : null;
    const comparison =
      debuggerState.mode === 'comparison'
        ? this.debugger.getComparison()
        : null;

    this.updateState({
      debugger: {
        mode: debuggerState.mode,
        selectedTick: debuggerState.selectedTick,
        inspection,
        comparison,
      },
    });
  }

  /**
   * Broadcast current state to all SSE clients.
   */
  private broadcastState(): void {
    const data = JSON.stringify(this.state);
    this.clients.forEach((client) => {
      client.write(`data: ${data}\n\n`);
    });
  }

  /**
   * Create the HTTP server with routing.
   */
  private createHttpServer(): http.Server {
    return http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Routing
      const url = req.url || '';

      if (url === '/' && req.method === 'GET') {
        this.handleRootRequest(res);
      } else if (url === '/api/state' && req.method === 'GET') {
        this.handleStateRequest(res);
      } else if (url === '/api/control' && req.method === 'POST') {
        this.handleControlRequest(req, res);
      } else if (url.startsWith('/api/debugger/select-tick/') && req.method === 'POST') {
        const tick = parseInt(url.split('/').pop() || '', 10);
        this.debugger.selectTick(tick);
        this.updateDebuggerState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/debugger/next-tick' && req.method === 'POST') {
        this.debugger.nextTick();
        this.updateDebuggerState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/debugger/prev-tick' && req.method === 'POST') {
        this.debugger.previousTick();
        this.updateDebuggerState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/debugger/first-tick' && req.method === 'POST') {
        this.debugger.firstTick();
        this.updateDebuggerState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/debugger/latest-tick' && req.method === 'POST') {
        this.debugger.latestTick();
        this.updateDebuggerState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/debugger/resume-live' && req.method === 'POST') {
        this.debugger.resumeLive();
        this.updateDebuggerState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
  }

  /**
   * Handle root request (serve HTML dashboard).
   */
  private handleRootRequest(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(this.getHtml());
  }

  /**
   * Handle state request (return current state as JSON).
   */
  private handleStateRequest(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.state));
  }

  /**
   * Handle SSE stream request.
   */
  /**
   * Handle control requests (pause, resume, step, stop).
   */
  private handleControlRequest(req: IncomingMessage, res: ServerResponse): void {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const command = data.command as string;

        const handler = this.controlCallbacks.get('handler');
        if (handler) {
          await handler(command);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
  }

  /**
   * Create initial dashboard state.
   */
  private createInitialState(): DashboardState {
    return Object.freeze({
      runtime: Object.freeze({
        status: 'initializing',
        currentTick: 0,
        missionId: 'mission-0-0',
        elapsedMs: 0,
        executionMode: 'continuous',
      }),
      mission: Object.freeze({
        goalId: 'goal-0',
        goalIntent: 'awaiting-goal',
        goalStatus: 'pending',
        planSteps: 0,
        currentStep: 0,
        lastDecision: 'none',
        lastCommand: 'none',
      }),
      world: Object.freeze({
        friendlyUnits: 0,
        enemyUnits: 0,
        resources: 'no-data',
        currentMap: 'unknown',
        lastObservationMs: 0,
      }),
      timeline: [],
    });
  }

  /**
   * Get HTML dashboard.
   */
  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Commander Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      overflow: hidden;
      height: 100vh;
    }

    .container {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto 1fr auto;
      gap: 12px;
      padding: 16px;
      height: 100vh;
    }

    header {
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      border-radius: 8px;
    }

    h1 {
      font-size: 20px;
      font-weight: 600;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.running {
      background: #10b981;
      color: #f0fdf4;
    }

    .status-badge.paused {
      background: #f59e0b;
      color: #fef3c7;
    }

    .status-badge.stopped {
      background: #ef4444;
      color: #fef2f2;
    }

    .status-badge.completed {
      background: #8b5cf6;
      color: #f5f3ff;
    }

    .panel {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .panel h2 {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #334155;
    }

    .stat {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(51, 65, 85, 0.3);
      font-size: 13px;
    }

    .stat:last-child {
      border-bottom: none;
    }

    .stat-label {
      color: #94a3b8;
    }

    .stat-value {
      font-weight: 600;
      color: #e2e8f0;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .timeline-event {
      padding: 8px;
      margin-bottom: 8px;
      background: rgba(51, 65, 85, 0.3);
      border-left: 3px solid #0ea5e9;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .timeline-event:hover {
      background: rgba(51, 65, 85, 0.5);
      border-left-color: #06b6d4;
    }

    .timeline-tick {
      color: #64748b;
      font-size: 11px;
      margin-bottom: 2px;
    }

    .timeline-type {
      color: #0ea5e9;
      font-weight: 600;
    }

    .timeline-detail {
      color: #cbd5e1;
      margin-top: 4px;
    }

    #timeline-panel {
      grid-column: 1 / 2;
      grid-row: 2 / 3;
      min-height: 0;
      overflow-y: auto;
    }

    #timeline-events {
      flex: 1;
      overflow-y: auto;
    }

    .controls {
      grid-column: 1 / -1;
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      border-radius: 8px;
    }

    button {
      padding: 8px 16px;
      border: 1px solid #334155;
      border-radius: 4px;
      background: rgba(51, 65, 85, 0.3);
      color: #e2e8f0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      transition: all 0.2s;
    }

    button:hover {
      background: rgba(51, 65, 85, 0.5);
      border-color: #64748b;
    }

    button:active {
      transform: scale(0.98);
    }

    button.primary {
      background: #0ea5e9;
      border-color: #0284c7;
      color: #f0f9ff;
    }

    button.primary:hover {
      background: #0284c7;
      border-color: #0369a1;
    }

    button.danger {
      background: #ef4444;
      border-color: #dc2626;
      color: #fef2f2;
    }

    button.danger:hover {
      background: #dc2626;
      border-color: #b91c1c;
    }

    .empty {
      color: #64748b;
      text-align: center;
      padding: 20px;
      font-style: italic;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(51, 65, 85, 0.1);
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(100, 116, 139, 0.4);
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(100, 116, 139, 0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>AI Commander Dashboard</h1>
      </div>
      <div>
        <span class="status-badge" id="status-badge">Initializing</span>
      </div>
    </header>

    <div class="panel" id="runtime-panel">
      <h2>Runtime</h2>
      <div class="stat">
        <span class="stat-label">Status</span>
        <span class="stat-value" id="runtime-status">initializing</span>
      </div>
      <div class="stat">
        <span class="stat-label">Current Tick</span>
        <span class="stat-value" id="runtime-tick">0</span>
      </div>
      <div class="stat">
        <span class="stat-label">Elapsed</span>
        <span class="stat-value" id="runtime-elapsed">0ms</span>
      </div>
      <div class="stat">
        <span class="stat-label">Execution Mode</span>
        <span class="stat-value" id="runtime-mode">continuous</span>
      </div>
    </div>

    <div class="panel" id="mission-panel">
      <h2>Mission</h2>
      <div class="stat">
        <span class="stat-label">Goal</span>
        <span class="stat-value" id="mission-goal">awaiting-goal</span>
      </div>
      <div class="stat">
        <span class="stat-label">Goal Status</span>
        <span class="stat-value" id="mission-status">pending</span>
      </div>
      <div class="stat">
        <span class="stat-label">Progress</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="flex: 1; height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden;">
            <div id="progress-bar" style="height: 100%; background: #3b82f6; width: 0%; transition: width 0.3s ease;"></div>
          </div>
          <span class="stat-value" id="progress-percent">0%</span>
        </div>
      </div>
      <div class="stat">
        <span class="stat-label">Trend</span>
        <span class="stat-value" id="progress-trend">-</span>
      </div>
      <div class="stat" style="font-size: 12px;">
        <span class="stat-label">Evidence</span>
        <span class="stat-value" id="progress-evidence" style="font-size: 11px; white-space: pre-wrap;">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Plan Steps</span>
        <span class="stat-value" id="mission-steps">0</span>
      </div>
      <div class="stat">
        <span class="stat-label">Current Step</span>
        <span class="stat-value" id="mission-current">0</span>
      </div>
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: 600;">Goal Candidates</h3>
        <div id="goal-candidates-list" style="max-height: 200px; overflow-y: auto;"></div>
      </div>
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: 600;">Goal Lifecycles</h3>
        <div id="goal-lifecycles-list" style="max-height: 250px; overflow-y: auto;"></div>
      </div>
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: 600;">Resource Gathering</h3>
        <div id="gathering-progress" style="display: none;">
          <div class="stat">
            <span class="stat-label">Field</span>
            <span class="stat-value" id="gathering-field">none</span>
          </div>
          <div class="stat">
            <span class="stat-label">Type</span>
            <span class="stat-value" id="gathering-type">—</span>
          </div>
          <div class="stat">
            <span class="stat-label">Progress</span>
            <span class="stat-value" id="gathering-percent">0%</span>
          </div>
          <div style="margin-top: 10px;">
            <div style="background: #e2e8f0; border-radius: 4px; height: 20px; position: relative;">
              <div id="gathering-bar" style="background: #3b82f6; height: 100%; border-radius: 4px; width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
          <div class="stat">
            <span class="stat-label">Collected</span>
            <span class="stat-value" id="gathering-collected">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Rate</span>
            <span class="stat-value" id="gathering-rate">0/tick</span>
          </div>
          <div class="stat">
            <span class="stat-label">ETA</span>
            <span class="stat-value" id="gathering-eta">—</span>
          </div>
          <div class="stat">
            <span class="stat-label">Status</span>
            <span class="stat-value" id="gathering-status">—</span>
          </div>
        </div>
        <div id="gathering-empty" style="color: #94a3b8; font-size: 12px;">No active gathering</div>
      </div>
    </div>

    <div class="panel" id="world-panel">
      <h2>World</h2>
      <div class="stat">
        <span class="stat-label">Friendly Units</span>
        <span class="stat-value" id="world-friendly">0</span>
      </div>
      <div class="stat">
        <span class="stat-label">Enemy Units</span>
        <span class="stat-value" id="world-enemy">0</span>
      </div>
      <div class="stat">
        <span class="stat-label">Resources</span>
        <span class="stat-value" id="world-resources">no-data</span>
      </div>
      <div class="stat">
        <span class="stat-label">Last Observation</span>
        <span class="stat-value" id="world-observation">0ms</span>
      </div>
    </div>

    <div class="panel" id="timeline-panel">
      <h2>Timeline</h2>
      <div id="timeline-events" class="empty">Waiting for events...</div>
    </div>

    <div class="panel" id="decision-panel">
      <h2>Current Decision</h2>
      <div class="stat">
        <span class="stat-label">Decision</span>
        <span class="stat-value" id="decision-value">none</span>
      </div>
      <div class="stat">
        <span class="stat-label">Command</span>
        <span class="stat-value" id="command-value">none</span>
      </div>
    </div>

    <div class="panel" id="details-panel">
      <h2>Details</h2>
      <div class="stat">
        <span class="stat-label">Mission ID</span>
        <span class="stat-value" id="mission-id">mission-0-0</span>
      </div>
      <div class="stat">
        <span class="stat-label">Timeline Events</span>
        <span class="stat-value" id="timeline-count">0</span>
      </div>
    </div>

    <div class="panel" id="inspection-panel" style="display: none;">
      <h2>Tick Inspection</h2>
      <div id="inspection-content">No tick selected</div>
      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="first-tick-btn" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer;">First</button>
        <button id="prev-tick-btn" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer;">Previous</button>
        <button id="next-tick-btn" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer;">Next</button>
        <button id="latest-tick-btn" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer;">Latest</button>
        <button id="resume-live-btn" style="padding: 8px 12px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Resume Live</button>
      </div>
    </div>

    <div class="controls">
      <button class="primary" id="pause-btn">Pause</button>
      <button class="primary" id="resume-btn">Resume</button>
      <button id="step-btn">Step</button>
      <button class="danger" id="stop-btn">Stop</button>
    </div>
  </div>

  <script>
    // Clear any stale storage and browser cache
    sessionStorage.clear();
    localStorage.clear();

    // Force reload to skip cache
    if (window.location.hash !== '#cleared') {
      window.location.hash = '#cleared';
      window.location.reload();
    }

    const state = {
      runtime: null,
      mission: null,
      world: null,
      timeline: [],
    };

    // Use polling instead of SSE to avoid overwhelming the browser
    async function pollState() {
      try {
        const response = await fetch('/api/state');
        const newState = await response.json();

        if (newState.runtime) state.runtime = newState.runtime;
        updateDashboard();

        // Poll every 200ms
        setTimeout(pollState, 200);
      } catch (error) {
        console.error('Poll error:', error);
        // Retry after 1 second if error
        setTimeout(pollState, 1000);
      }
    }

    function updateDashboard() {
      if (!state.runtime) return;

      // Update runtime panel
      document.getElementById('runtime-status').textContent = state.runtime.status;
      document.getElementById('runtime-tick').textContent = state.runtime.currentTick;
      document.getElementById('runtime-elapsed').textContent = state.runtime.elapsedMs + 'ms';
      document.getElementById('runtime-mode').textContent = state.runtime.executionMode;

      const badge = document.getElementById('status-badge');
      if (badge) {
        badge.textContent = state.runtime.status.toUpperCase();
        badge.className = 'status-badge ' + state.runtime.status;
      }

      // Update mission panel
      document.getElementById('mission-goal').textContent = state.mission?.goalIntent || 'N/A';
      document.getElementById('mission-status').textContent = state.mission?.goalStatus || 'N/A';

      // Update progress
      if (state.mission?.progress) {
        const progress = state.mission.progress;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = progress.percent + '%';
        document.getElementById('progress-percent').textContent = progress.percent + '%';

        const trendEmoji = { 'improving': '↑', 'stable': '→', 'regressing': '↓' }[progress.trend] || '?';
        document.getElementById('progress-trend').textContent = trendEmoji + ' ' + progress.trend;
        document.getElementById('progress-evidence').textContent = progress.reason || '-';
      }

      // Update world panel
      document.getElementById('world-friendly').textContent = state.world?.friendlyUnits || 0;
      document.getElementById('world-enemy').textContent = state.world?.enemyUnits || 0;
      document.getElementById('world-resources').textContent = state.world?.resources || 'N/A';

      // Update timeline
      document.getElementById('timeline-count').textContent = (state.timeline || []).length;
    }

    function formatInspection(inspection) {
      if (!inspection) return 'No data';
      let output = \`TICK \${inspection.tick}\\n\\n\`;
      if (inspection.gatheringProgress) {
        const g = inspection.gatheringProgress;
        output += \`RESOURCE GATHERING:\\n\`;
        output += \`  Field: \${g.fieldId}\\n\`;
        output += \`  Type: \${g.resourceType}\\n\`;
        output += \`  Collected: \${g.amountCollected}/\${g.targetAmount}\\n\`;
        output += \`  Progress: \${g.percentComplete}%\\n\`;
        output += \`  Status: \${g.status}\\n\`;
        output += \`  Rate: \${g.gatheringRate.toFixed(2)}/tick\\n\`;
        if (g.estimatedCompletionTick) {
          output += \`  ETA: tick \${g.estimatedCompletionTick}\\n\`;
        }
        output += \`\\n\`;
      }
      if (inspection.progress) {
        output += \`PROGRESS:\\n  Percent: \${inspection.progress.percent}%\\n\`;
        output += \`  Trend: \${inspection.progress.trend}\\n\`;
        output += \`  Reason: \${inspection.progress.reason}\\n\\n\`;
      }
      if (inspection.goalCandidates && inspection.goalCandidates.length > 0) {
        output += \`GOAL CANDIDATES:\\n\`;
        inspection.goalCandidates.forEach(c => {
          output += \`  \${c.intent}: \${c.score.toFixed(3)}\${c.isSelected ? ' (SELECTED)' : ''}\\n\`;
        });
        output += \`\\n\`;
      }
      if (inspection.goalLifecycles && inspection.goalLifecycles.length > 0) {
        output += \`GOAL LIFECYCLES:\\n\`;
        inspection.goalLifecycles.forEach(l => {
          output += \`  \${l.intent}: \${l.lifecycleState}\\n\`;
        });
        output += \`\\n\`;
      }
      if (inspection.goalAdaptation) {
        output += \`GOAL ADAPTATION:\\n\`;
        output += \`  From: \${inspection.goalAdaptation.previousGoalIntent}\\n\`;
        output += \`  To: \${inspection.goalAdaptation.newGoalIntent}\\n\`;
        output += \`  Improvement: +\${(inspection.goalAdaptation.worldStateChange || '').substring(0, 40)}\\n\\n\`;
      }
      if (inspection.observation) {
        output += \`OBSERVATION:\\n  \${JSON.stringify(inspection.observation, null, 2)}\\n\\n\`;
      }
      if (inspection.planning) {
        output += \`PLANNING:\\n  Goal: \${inspection.planning.goal}\\n\`;
        output += \`  Steps: \${inspection.planning.steps}\\n\\n\`;
      }
      if (inspection.decision) {
        output += \`DECISION:\\n  Command: \${inspection.decision.command}\\n\`;
        output += \`  Confidence: \${inspection.decision.confidence}\\n\\n\`;
      }
      if (inspection.execution) {
        output += \`EXECUTION:\\n  Action: \${inspection.execution.commandAction}\\n\`;
        output += \`  Success: \${inspection.execution.success}\\n\\n\`;
      }
      return output;
    }

    async function sendControl(command) {
      try {
        const response = await fetch('/api/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command }),
        });
        if (response.ok) {
          console.log('Control sent:', command);
        }
      } catch (error) {
        console.error('Control error:', error);
      }
    }

    // Wire up buttons
    document.getElementById('pause-btn').addEventListener('click', () => sendControl('pause'));
    document.getElementById('resume-btn').addEventListener('click', () => sendControl('resume'));
    document.getElementById('step-btn').addEventListener('click', () => sendControl('step'));
    document.getElementById('stop-btn').addEventListener('click', () => sendControl('stop'));

    // Debugger buttons
    document.getElementById('first-tick-btn').addEventListener('click', () => sendDebuggerCommand('/api/debugger/first-tick'));
    document.getElementById('prev-tick-btn').addEventListener('click', () => sendDebuggerCommand('/api/debugger/prev-tick'));
    document.getElementById('next-tick-btn').addEventListener('click', () => sendDebuggerCommand('/api/debugger/next-tick'));
    document.getElementById('latest-tick-btn').addEventListener('click', () => sendDebuggerCommand('/api/debugger/latest-tick'));
    document.getElementById('resume-live-btn').addEventListener('click', () => sendDebuggerCommand('/api/debugger/resume-live'));

    // Timeline click handler for tick selection
    document.getElementById('timeline-events').addEventListener('click', (e) => {
      const tickEl = e.target.closest('.timeline-event');
      if (tickEl) {
        const tickText = tickEl.querySelector('.timeline-tick')?.textContent;
        const tickMatch = tickText?.match(/Tick (\\d+)/);
        if (tickMatch) {
          const tick = parseInt(tickMatch[1], 10);
          sendDebuggerCommand(\`/api/debugger/select-tick/\${tick}\`);
        }
      }
    });

    async function sendDebuggerCommand(endpoint) {
      try {
        await fetch(endpoint, { method: 'POST' });
      } catch (error) {
        console.error('Debugger command failed:', error);
      }
    }

    // Load initial state and start polling
    fetch('/api/state')
      .then((r) => r.json())
      .then((s) => {
        Object.assign(state, s);
        updateDashboard();
        pollState();
      });
  </script>
</body>
</html>`;
  }
}
