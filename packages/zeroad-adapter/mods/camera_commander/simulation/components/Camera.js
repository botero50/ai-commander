/**
 * Camera Commander Component
 *
 * Enables remote camera control via HTTP API.
 * Listens on a TCP socket for camera commands from AI Commander.
 *
 * Commands format:
 * {
 *   "action": "pan",
 *   "x": 128,
 *   "z": 128,
 *   "duration": 1000
 * }
 */

Engine.RegisterComponentType(IID_Camera, "Camera", {
  Schema() {
    return {
      "data": {
        "x": 128,
        "z": 128,
        "distance": 80,
        "rotation": 0,
        "tilt": 0.5
      }
    };
  },

  Init() {
    this.data = {
      x: 128,
      z: 128,
      distance: 80,
      rotation: 0,
      tilt: 0.5
    };

    this.isMoving = false;
    this.moveStartTime = 0;
    this.moveDuration = 0;
    this.targetX = this.data.x;
    this.targetZ = this.data.z;

    // Log that component initialized
    print("[CameraCommander] Camera component initialized");
  },

  OnTurnStart() {
    // Check if we're in the middle of a camera movement
    if (this.isMoving) {
      const elapsedTime = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).GetTime() - this.moveStartTime;
      const progress = Math.min(1.0, elapsedTime / this.moveDuration);

      if (progress >= 1.0) {
        // Movement complete
        this.data.x = this.targetX;
        this.data.z = this.targetZ;
        this.isMoving = false;
      } else {
        // Smooth interpolation (ease-in-out)
        const easeProgress = this.easeInOutCubic(progress);
        this.data.x = this.data.x + (this.targetX - this.data.x) * easeProgress;
        this.data.z = this.data.z + (this.targetZ - this.data.z) * easeProgress;
      }
    }
  },

  /**
   * Pan camera to position
   */
  PanTo(x, z, duration = 1000) {
    print("[CameraCommander] Panning to (" + x + ", " + z + ") over " + duration + "ms");

    this.targetX = x;
    this.targetZ = z;
    this.moveDuration = duration;
    this.moveStartTime = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).GetTime();
    this.isMoving = true;
  },

  /**
   * Set camera position instantly
   */
  SetPosition(x, z) {
    print("[CameraCommander] Setting camera to (" + x + ", " + z + ")");
    this.data.x = x;
    this.data.z = z;
    this.isMoving = false;
  },

  /**
   * Get current camera position
   */
  GetPosition() {
    return {
      x: this.data.x,
      z: this.data.z,
      distance: this.data.distance,
      rotation: this.data.rotation,
      tilt: this.data.tilt
    };
  },

  /**
   * Set camera distance (zoom)
   */
  SetDistance(distance) {
    print("[CameraCommander] Setting distance to " + distance);
    this.data.distance = Math.max(10, Math.min(300, distance));
  },

  /**
   * Ease-in-out cubic interpolation
   */
  easeInOutCubic(t) {
    if (t < 0.5) {
      return 4 * t * t * t;
    } else {
      const f = 2 * t - 2;
      return 0.5 * f * f * f + 1;
    }
  }
});
