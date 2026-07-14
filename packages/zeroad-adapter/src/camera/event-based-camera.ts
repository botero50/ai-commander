/**
 * Event-Based Camera Controller
 *
 * Automatically moves the camera to follow important game events:
 * - Battles/combat
 * - Unit deaths
 * - Base attacks
 * - Building construction
 * - Unit gathering
 *
 * Uses keyboard input to move the camera since RL Interface can't control it directly.
 */

import { RawGameState } from '../rl-interface/types.js';
import { Logger } from '../config/logger.js';
import { spawn } from 'child_process';
import * as path from 'path';

export interface GameEvent {
  type: 'battle' | 'death' | 'construction' | 'attack' | 'gathering';
  x: number;
  z: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface EntityState {
  id: number;
  x: number;
  z: number;
  health?: number;
  max_health?: number;
  owner?: number;
  type?: string;
}

export class EventBasedCamera {
  private logger: Logger;
  private previousState: Map<number, EntityState> = new Map();
  private cameraX = 512;
  private cameraZ = 512;
  private lastEventTime = 0;
  private eventDebounceMs = parseInt(process.env.CAMERA_EVENT_DEBOUNCE_MS || '2000', 10);
  private rlClient: any = null;
  private enableAutoZoom = process.env.ENABLE_AUTO_ZOOM !== 'false';
  private autoZoomAmount = parseInt(process.env.AUTO_ZOOM_AMOUNT || '2', 10);
  private autoEventDetectionEnabled = true; // Can be disabled for testing

  constructor(logger: Logger, rlClient?: any) {
    this.logger = logger;
    this.rlClient = rlClient;
  }

  // Disable automatic event detection (for manual camera test)
  disableAutoEventDetection(): void {
    this.autoEventDetectionEnabled = false;
  }

  // Re-enable automatic event detection
  enableAutoEventDetection(): void {
    this.autoEventDetectionEnabled = true;
  }


  /**
   * Detect important events from game state changes
   */
  detectEvents(currentState: RawGameState): GameEvent[] {
    const events: GameEvent[] = [];

    // Skip auto event detection if disabled (for manual testing)
    if (!this.autoEventDetectionEnabled) return events;

    if (!currentState.entities) return events;

    const currentEntities = new Map<number, EntityState>();

    // Build current entity map
    for (const entity of currentState.entities) {
      if (entity.id && entity.position) {
        currentEntities.set(entity.id, {
          id: entity.id,
          x: entity.position.x,
          z: entity.position.z,
          health: entity.hitpoints,
          max_health: entity.max_hitpoints,
          owner: entity.owner,
          type: entity.template,
        });
      }
    }

    // Detect battles (units within close proximity)
    const battles = this.detectBattles(currentEntities);
    events.push(...battles);

    // Detect deaths (entities that disappeared)
    const deaths = this.detectDeaths(currentEntities);
    events.push(...deaths);

    // Detect damage (health decreased)
    const damage = this.detectDamage(currentEntities);
    events.push(...damage);

    // Update state for next tick
    this.previousState = currentEntities;

    return events;
  }

  /**
   * Detect battles - find clusters of units close together
   */
  private detectBattles(entities: Map<number, EntityState>): GameEvent[] {
    const events: GameEvent[] = [];
    const militaryUnits = Array.from(entities.values()).filter(
      e =>
        e.owner &&
        e.owner > 0 &&
        !isNaN(e.x) &&
        !isNaN(e.z) &&
        (e.type?.includes('unit') || e.type?.includes('soldier'))
    );

    // Find clusters of units from different players
    const clusters = this.findUnitClusters(militaryUnits);

    for (const cluster of clusters) {
      if (cluster.units.length >= 3) {
        const centerX = cluster.units.reduce((sum, u) => sum + u.x, 0) / cluster.units.length;
        const centerZ = cluster.units.reduce((sum, u) => sum + u.z, 0) / cluster.units.length;

        if (!isNaN(centerX) && !isNaN(centerZ)) {
          events.push({
            type: 'battle',
            x: centerX,
            z: centerZ,
            severity: 'high',
            description: `Battle detected: ${cluster.units.length} units engaged`,
          });
        }
      }
    }

    return events;
  }

  /**
   * Detect unit deaths
   */
  private detectDeaths(entities: Map<number, EntityState>): GameEvent[] {
    const events: GameEvent[] = [];

    for (const [entityId, prevEntity] of this.previousState) {
      if (!entities.has(entityId) && !isNaN(prevEntity.x) && !isNaN(prevEntity.z)) {
        // Unit died (only if we have valid position)
        events.push({
          type: 'death',
          x: prevEntity.x,
          z: prevEntity.z,
          severity: 'medium',
          description: `Unit destroyed at (${Math.round(prevEntity.x)}, ${Math.round(prevEntity.z)})`,
        });
      }
    }

    return events;
  }

  /**
   * Detect damage to units
   */
  private detectDamage(entities: Map<number, EntityState>): GameEvent[] {
    const events: GameEvent[] = [];

    for (const [entityId, currentEntity] of entities) {
      const prevEntity = this.previousState.get(entityId);
      if (
        prevEntity &&
        currentEntity.health &&
        prevEntity.health &&
        !isNaN(currentEntity.x) &&
        !isNaN(currentEntity.z)
      ) {
        const healthLoss = prevEntity.health - currentEntity.health;
        if (healthLoss > 10) {
          // Significant damage
          events.push({
            type: 'attack',
            x: currentEntity.x,
            z: currentEntity.z,
            severity: healthLoss > 50 ? 'high' : 'medium',
            description: `Unit taking damage: ${healthLoss} HP lost`,
          });
        }
      }
    }

    return events;
  }

  /**
   * Find clusters of nearby units
   */
  private findUnitClusters(
    units: EntityState[],
    clusterRadius: number = 50
  ): Array<{ units: EntityState[]; center: { x: number; z: number } }> {
    const clusters: Array<{ units: EntityState[]; center: { x: number; z: number } }> = [];
    const processed = new Set<number>();

    for (const unit of units) {
      if (processed.has(unit.id)) continue;

      const cluster: EntityState[] = [unit];
      processed.add(unit.id);

      for (const other of units) {
        if (processed.has(other.id)) continue;

        const distance = Math.sqrt(Math.pow(unit.x - other.x, 2) + Math.pow(unit.z - other.z, 2));
        if (distance < clusterRadius) {
          cluster.push(other);
          processed.add(other.id);
        }
      }

      if (cluster.length > 0) {
        const centerX = cluster.reduce((sum, u) => sum + u.x, 0) / cluster.length;
        const centerZ = cluster.reduce((sum, u) => sum + u.z, 0) / cluster.length;
        clusters.push({ units: cluster, center: { x: centerX, z: centerZ } });
      }
    }

    return clusters;
  }

  /**
   * Move camera to event location
   */
  async moveToEvent(event: GameEvent, rlClient?: any): Promise<void> {
    const now = Date.now();
    if (now - this.lastEventTime < this.eventDebounceMs) {
      this.logger.debug('Camera move debounced (too recent)', { eventType: event.type });
      return;
    }

    this.logger.info(`🎬 Camera event: ${event.description}`, {
      type: event.type,
      severity: event.severity,
      location: `(${Math.round(event.x)}, ${Math.round(event.z)})`,
    });

    try {
      // Use our tracked camera position
      const currentCamPos = { x: this.cameraX, z: this.cameraZ };

      // Calculate movement needed
      // Camera controls are inverted: if target > current, we need to move in the inverted direction
      // If target.x > current.x, we need to move RIGHT visually, but that means pressing A (inverted)
      // If target.z > current.z, we need to move DOWN visually, but that means pressing S (inverted)
      const dx = currentCamPos.x - event.x;  // Inverted: positive = move left (A), negative = move right (D)
      const dz = currentCamPos.z - event.z;  // Inverted: positive = move up (W), negative = move down (S)

      this.logger.info('🎥 Moving camera', {
        from: `(${Math.round(currentCamPos.x)}, ${Math.round(currentCamPos.z)})`,
        to: `(${Math.round(event.x)}, ${Math.round(event.z)})`,
        distance: Math.round(Math.sqrt(dx * dx + dz * dz)),
        dx,
        dz,
      });

      // Send keyboard commands to move camera (with independent durations per axis)
      await this.sendCameraMovement(dx, dz);

      // Update our tracked position (assume movement succeeded)
      this.cameraX = event.x;
      this.cameraZ = event.z;
      this.lastEventTime = now;
    } catch (error) {
      this.logger.error('Failed to move camera to event', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Try to move camera via RL Interface /evaluate endpoint
   */
  private async moveViaRLInterface(rlClient: any, x: number, z: number): Promise<void> {
    if (!rlClient || !rlClient.evaluate) {
      return;
    }

    try {
      const code = `CameraControl.setPosition(${Math.round(x)}, ${Math.round(z)}, 100, 45, 0, 0);`;
      await rlClient.evaluate(code);
      this.logger.debug('Sent camera command via RL Interface', { x, z });
    } catch (error) {
      this.logger.debug('RL Interface camera command failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send keyboard input to move camera using Python pynput
   * Each axis gets its own duration based on distance
   */
  private async sendCameraMovement(dx: number, dz: number): Promise<void> {
    try {
      const pythonScript = path.join(process.cwd(), 'camera-controller.py');

      // Simple approach: just zoom out when panning to events
      // Duration calculation removed - let the user/AI handle navigation

      const gameEvent = event as unknown as GameEvent;
      this.logger.info(`🎮 Camera event at (${Math.round(gameEvent.x)}, ${Math.round(gameEvent.z)}), zooming out to see more`);

      // Zoom out slightly when moving to battle (so we can see more)
      if (this.enableAutoZoom && this.autoZoomAmount > 0) {
        this.sendKeyViaPython(pythonScript, 'scroll_down', this.autoZoomAmount * 100);
        this.logger.info(`🔍 Zooming out (${this.autoZoomAmount} levels)`);
      }
    } catch (error) {
      this.logger.debug('sendCameraMovement error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send key via Python subprocess (pynput)
   */
  private sendKeyViaPython(pythonScript: string, key: string, durationMs: number): void {
    try {
      const proc = spawn('python', [pythonScript, key, durationMs.toString()], {
        detached: true,
        stdio: 'ignore',
      });
      proc.unref();
    } catch (error) {
      this.logger.debug('Python subprocess error', {
        key,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current camera position estimate
   */
  getCameraPosition(): { x: number; z: number } {
    return { x: this.cameraX, z: this.cameraZ };
  }

  /**
   * Set camera position estimate (useful for testing/initialization)
   */
  setCameraPosition(x: number, z: number): void {
    this.cameraX = x;
    this.cameraZ = z;
  }

  /**
   * Reset camera position estimate
   */
  reset(): void {
    this.cameraX = 512;
    this.cameraZ = 512;
    this.previousState.clear();
  }
}
