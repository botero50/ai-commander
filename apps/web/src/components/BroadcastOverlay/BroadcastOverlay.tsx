/**
 * Story 59.2 — Broadcast Overlay UI
 *
 * Complete broadcast display for public stream:
 * - Match introduction sequence
 * - Live game stats HUD (resources, units, buildings)
 * - Player comparison panel
 * - Economy metrics
 * - Victory sequence
 * - Next match loading
 *
 * Connects to PublicStreamLauncher REST API.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styles from './BroadcastOverlay.module.css';

interface PlayerMetrics {
  playerId: number;
  playerName: string;
  resources: { wood: number; stone: number; food: number; metal: number };
  units: { count: number; militaryValue: number };
  buildings: { count: number };
  population: { current: number; max: number };
  economy: { woodRate: number; stoneRate: number; foodRate: number };
}

interface StreamStatus {
  isRunning: boolean;
  matchesCompleted: number;
  uptime: number;
  currentMatch?: { number: number; startTime: string };
  broadcastActive: boolean;
  metricsActive: boolean;
  health: { arena: 'healthy' | 'recovering' | 'failed'; broadcast: string; metrics: string };
}

interface OverlayMode {
  type: 'intro' | 'match' | 'conclusion' | 'loading';
  data?: any;
}

export const BroadcastOverlay: React.FC<{ apiUrl?: string }> = ({ apiUrl = 'http://localhost:3000' }) => {
  const [metrics, setMetrics] = useState<PlayerMetrics[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>({ type: 'intro' });
  const [uptime, setUptime] = useState('00:00:00');
  const [connected, setConnected] = useState(false);

  // Fetch metrics
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/metrics/current`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.players || []);
          setConnected(true);
        }
      } catch (e) {
        // Connection error
      }
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [apiUrl]);

  // Fetch stream status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/stream/status`);
        if (res.ok) {
          const data = await res.json();
          setStreamStatus(data);
        }
      } catch (e) {
        // Connection error
      }
    }, 1000); // Update every 1s

    return () => clearInterval(interval);
  }, [apiUrl]);

  // Update uptime display
  useEffect(() => {
    const interval = setInterval(() => {
      if (streamStatus) {
        const totalSeconds = streamStatus.uptime;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        setUptime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [streamStatus]);

  const formatResource = (value: number): string => {
    if (value > 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${value}`;
  };

  const getPlayerColor = (playerId: number): string => {
    return playerId === 1 ? '#e74c3c' : '#3498db'; // Red vs Blue
  };

  return (
    <div className={styles.overlay}>
      {/* Connection Status */}
      <div className={styles.connectionStatus}>
        <div className={`${styles.indicator} ${connected ? styles.connected : styles.disconnected}`} />
        <span>{connected ? 'CONNECTED' : 'OFFLINE'}</span>
      </div>

      {/* Top Bar: Uptime & Matches */}
      {streamStatus && (
        <div className={styles.topBar}>
          <div className={styles.stat}>
            <div className={styles.label}>UPTIME</div>
            <div className={styles.value}>{uptime}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.label}>MATCHES</div>
            <div className={styles.value}>{streamStatus.matchesCompleted}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.label}>MATCH #{streamStatus.currentMatch?.number || 0}</div>
          </div>
        </div>
      )}

      {/* Main HUD: Player Stats */}
      <div className={styles.mainHUD}>
        {metrics.length >= 2 && (
          <div className={styles.playerComparison}>
            {/* Player 1 */}
            <div className={styles.playerPanel} style={{ borderColor: getPlayerColor(1) }}>
              <div className={styles.playerName}>{metrics[0]?.playerName || 'Player 1'}</div>

              <div className={styles.resources}>
                <div className={styles.resourceItem}>
                  <span className={styles.resourceLabel}>🌲</span>
                  <span className={styles.resourceValue}>{formatResource(metrics[0]?.resources.wood || 0)}</span>
                </div>
                <div className={styles.resourceItem}>
                  <span className={styles.resourceLabel}>⛰️</span>
                  <span className={styles.resourceValue}>{formatResource(metrics[0]?.resources.stone || 0)}</span>
                </div>
                <div className={styles.resourceItem}>
                  <span className={styles.resourceLabel}>🌾</span>
                  <span className={styles.resourceValue}>{formatResource(metrics[0]?.resources.food || 0)}</span>
                </div>
              </div>

              <div className={styles.metrics}>
                <div className={styles.metricRow}>
                  <span>Units:</span>
                  <span className={styles.value}>{metrics[0]?.units.count || 0}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Buildings:</span>
                  <span className={styles.value}>{metrics[0]?.buildings.count || 0}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Population:</span>
                  <span className={styles.value}>
                    {metrics[0]?.population.current || 0}/{metrics[0]?.population.max || 300}
                  </span>
                </div>
              </div>
            </div>

            {/* VS Divider */}
            <div className={styles.divider}>VS</div>

            {/* Player 2 */}
            <div className={styles.playerPanel} style={{ borderColor: getPlayerColor(2) }}>
              <div className={styles.playerName}>{metrics[1]?.playerName || 'Player 2'}</div>

              <div className={styles.resources}>
                <div className={styles.resourceItem}>
                  <span className={styles.resourceLabel}>🌲</span>
                  <span className={styles.resourceValue}>{formatResource(metrics[1]?.resources.wood || 0)}</span>
                </div>
                <div className={styles.resourceItem}>
                  <span className={styles.resourceLabel}>⛰️</span>
                  <span className={styles.resourceValue}>{formatResource(metrics[1]?.resources.stone || 0)}</span>
                </div>
                <div className={styles.resourceItem}>
                  <span className={styles.resourceLabel}>🌾</span>
                  <span className={styles.resourceValue}>{formatResource(metrics[1]?.resources.food || 0)}</span>
                </div>
              </div>

              <div className={styles.metrics}>
                <div className={styles.metricRow}>
                  <span>Units:</span>
                  <span className={styles.value}>{metrics[1]?.units.count || 0}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Buildings:</span>
                  <span className={styles.value}>{metrics[1]?.buildings.count || 0}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Population:</span>
                  <span className={styles.value}>
                    {metrics[1]?.population.current || 0}/{metrics[1]?.population.max || 300}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Health Status */}
      {streamStatus && (
        <div className={styles.bottomBar}>
          <div className={styles.healthStatus}>
            <div className={`${styles.healthItem} ${streamStatus.health.arena === 'healthy' ? styles.healthy : styles.failed}`}>
              ARENA
            </div>
            <div className={`${styles.healthItem} ${streamStatus.broadcastActive ? styles.healthy : styles.failed}`}>
              BROADCAST
            </div>
            <div className={`${styles.healthItem} ${streamStatus.metricsActive ? styles.healthy : styles.failed}`}>
              METRICS
            </div>
          </div>
          <div className={styles.streamLabel}>🎬 AI COMMANDER STREAM</div>
        </div>
      )}
    </div>
  );
};

export default BroadcastOverlay;
