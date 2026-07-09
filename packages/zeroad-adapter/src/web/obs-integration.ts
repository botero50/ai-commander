/**
 * OBS Integration
 * Provides WebSocket bridge for OBS browser source integration
 */

export interface OBSOverlayData {
  isLive: boolean;
  player1Name: string;
  player1Provider: string;
  player1Model: string;
  player1Objective: string;
  player1Resources: number;
  player1Population: number;
  player1Army: number;
  player1Tech: number;

  player2Name: string;
  player2Provider: string;
  player2Model: string;
  player2Objective: string;
  player2Resources: number;
  player2Population: number;
  player2Army: number;
  player2Tech: number;

  elapsedSeconds: number;
  tick: number;
}

export interface OBSIntegrationConfig {
  port: number;
  host: string;
  updateInterval: number; // milliseconds
  transparent: boolean;
}

/**
 * OBS Integration Service
 * Provides WebSocket endpoint for OBS browser sources
 */
export class OBSIntegration {
  private config: OBSIntegrationConfig;
  private currentData: OBSOverlayData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(data: OBSOverlayData) => void> = new Set();

  constructor(config: Partial<OBSIntegrationConfig> = {}) {
    this.config = {
      port: 8765,
      host: 'localhost',
      updateInterval: 100, // 10 Hz updates
      transparent: true,
      ...config,
    };
  }

  /**
   * Update overlay data
   */
  updateOverlayData(data: Partial<OBSOverlayData>): void {
    this.currentData = {
      isLive: data.isLive ?? this.currentData?.isLive ?? false,
      player1Name: data.player1Name ?? this.currentData?.player1Name ?? 'Player 1',
      player1Provider: data.player1Provider ?? this.currentData?.player1Provider ?? 'Unknown',
      player1Model: data.player1Model ?? this.currentData?.player1Model ?? 'Unknown',
      player1Objective: data.player1Objective ?? this.currentData?.player1Objective ?? '-',
      player1Resources: data.player1Resources ?? this.currentData?.player1Resources ?? 0,
      player1Population: data.player1Population ?? this.currentData?.player1Population ?? 0,
      player1Army: data.player1Army ?? this.currentData?.player1Army ?? 0,
      player1Tech: data.player1Tech ?? this.currentData?.player1Tech ?? 0,

      player2Name: data.player2Name ?? this.currentData?.player2Name ?? 'Player 2',
      player2Provider: data.player2Provider ?? this.currentData?.player2Provider ?? 'Unknown',
      player2Model: data.player2Model ?? this.currentData?.player2Model ?? 'Unknown',
      player2Objective: data.player2Objective ?? this.currentData?.player2Objective ?? '-',
      player2Resources: data.player2Resources ?? this.currentData?.player2Resources ?? 0,
      player2Population: data.player2Population ?? this.currentData?.player2Population ?? 0,
      player2Army: data.player2Army ?? this.currentData?.player2Army ?? 0,
      player2Tech: data.player2Tech ?? this.currentData?.player2Tech ?? 0,

      elapsedSeconds: data.elapsedSeconds ?? this.currentData?.elapsedSeconds ?? 0,
      tick: data.tick ?? this.currentData?.tick ?? 0,
    };

    this.notifySubscribers();
  }

  /**
   * Subscribe to overlay data updates
   */
  subscribe(callback: (data: OBSOverlayData) => void): () => void {
    this.subscribers.add(callback);

    // Send current data immediately
    if (this.currentData) {
      callback(this.currentData);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current overlay data
   */
  getCurrentData(): OBSOverlayData | null {
    return this.currentData ? { ...this.currentData } : null;
  }

  /**
   * Get WebSocket connection URL
   */
  getWebSocketURL(): string {
    return `ws://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get HTTP endpoint for overlay data
   */
  getHTTPEndpoint(): string {
    return `http://${this.config.host}:${this.config.port}/overlay`;
  }

  /**
   * Notify all subscribers of data change
   */
  private notifySubscribers(): void {
    if (!this.currentData) return;

    for (const callback of this.subscribers) {
      try {
        callback(this.currentData);
      } catch (err) {
        console.error('Error in OBS integration subscriber:', err);
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): OBSIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Reset integration
   */
  reset(): void {
    this.currentData = null;
    this.subscribers.clear();
  }

  /**
   * Destroy integration
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.reset();
  }
}
