/**
 * Type definitions for AI Commander Web UI
 * These are re-exported from @ai-commander/zeroad-adapter
 */

// Match View State
export interface MatchViewState {
  readonly matchId: string;
  readonly status: 'starting' | 'running' | 'completed' | 'error';
  readonly brain1: string;
  readonly brain2: string;
  readonly currentTick: number;
  readonly totalTicks: number;
  readonly duration: number;
  readonly winner?: string;
  readonly isConnected: boolean;
  readonly error?: string;
  readonly player1Stats: {
    readonly commands: number;
    readonly errors: number;
  };
  readonly player2Stats: {
    readonly commands: number;
    readonly errors: number;
  };
  readonly latestDecisions: readonly DecisionEvent[];
  readonly timeline: {
    readonly unitCountTrend: 'increasing' | 'decreasing' | 'stable';
    readonly buildingCountTrend: 'increasing' | 'decreasing' | 'stable';
    readonly totalSnapshots: number;
  };
}

// Decision Event
export interface DecisionEvent {
  readonly tick: number;
  readonly timestamp: number;
  readonly player: 'player1' | 'player2';
  readonly brainName: string;
  readonly reasoning?: string;
  readonly commands: readonly string[];
  readonly commandCount: number;
  readonly durationMs: number;
}

// State Update Callback
export type StateUpdateCallback = (state: MatchViewState) => void;

// Tournament Types
export interface PlayerStanding {
  readonly rank: number;
  readonly brainName: string;
  readonly rating: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly trend: 'up' | 'down' | 'stable';
  readonly recentResults: readonly ('W' | 'L')[];
}

export interface Match {
  readonly id: string;
  readonly player1: string;
  readonly player2: string;
  readonly winner: string;
  readonly completedAt: number;
  readonly duration: number;
  readonly player1Commands: number;
  readonly player2Commands: number;
}

export interface TournamentState {
  readonly format: 'round-robin' | 'single-elimination' | 'double-elimination' | 'swiss';
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly standings: readonly PlayerStanding[];
  readonly recentMatches: readonly Match[];
}

// Mock MatchViewStateManager for browser environment
export class MatchViewStateManager {
  private state: MatchViewState | null = null;
  private callbacks: Set<StateUpdateCallback> = new Set();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  subscribe(callback: StateUpdateCallback): () => void {
    this.callbacks.add(callback);
    if (this.state) {
      callback(this.state);
    }
    return () => {
      this.callbacks.delete(callback);
    };
  }

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        this.ws.onerror = () => {
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          this.attemptReconnect(url);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state = null;
  }

  getState(): Readonly<MatchViewState> | null {
    return this.state ? { ...this.state } : null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: any): void {
    if (data.type === 'state_update' && data.state) {
      this.state = data.state;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    if (this.state) {
      this.callbacks.forEach((cb) => cb(this.state!));
    }
  }

  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(url).catch(() => {
          this.attemptReconnect(url);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
}
