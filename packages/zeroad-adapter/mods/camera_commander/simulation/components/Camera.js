/**
 * Camera Commander Script
 *
 * Enables remote camera control via simple function calls.
 * Called by AI Commander to move camera during matches.
 */

var CameraControl = {
  // Current camera position
  position: {
    x: 128,
    z: 128,
    distance: 80,
    rotation: 0,
    tilt: 0.5
  },

  // Animation state
  isMoving: false,
  moveStartTime: 0,
  moveDuration: 0,
  targetX: 128,
  targetZ: 128,

  /**
   * Initialize camera control
   */
  Init: function() {
    print("[CameraCommander] Camera control initialized");
  },

  /**
   * Pan camera to position smoothly
   */
  PanTo: function(x, z, duration) {
    duration = duration || 1000;
    print("[CameraCommander] Panning to (" + x + ", " + z + ") over " + duration + "ms");

    this.targetX = x;
    this.targetZ = z;
    this.moveDuration = duration;
    this.moveStartTime = new Date().getTime();
    this.isMoving = true;
  },

  /**
   * Set camera position instantly
   */
  SetPosition: function(x, z) {
    print("[CameraCommander] Setting camera to (" + x + ", " + z + ")");
    this.position.x = x;
    this.position.z = z;
    this.isMoving = false;
  },

  /**
   * Get current camera position
   */
  GetPosition: function() {
    return {
      x: this.position.x,
      z: this.position.z,
      distance: this.position.distance,
      rotation: this.position.rotation,
      tilt: this.position.tilt
    };
  },

  /**
   * Set camera distance (zoom)
   */
  SetDistance: function(distance) {
    print("[CameraCommander] Setting distance to " + distance);
    this.position.distance = Math.max(10, Math.min(300, distance));
  },

  /**
   * Update camera position (called each turn)
   */
  Update: function() {
    if (!this.isMoving) {
      return;
    }

    var now = new Date().getTime();
    var elapsed = now - this.moveStartTime;
    var progress = Math.min(1.0, elapsed / this.moveDuration);

    if (progress >= 1.0) {
      // Movement complete
      this.position.x = this.targetX;
      this.position.z = this.targetZ;
      this.isMoving = false;
    } else {
      // Smooth interpolation (ease-in-out cubic)
      var easeProgress = this.easeInOutCubic(progress);
      var startX = this.position.x;
      var startZ = this.position.z;

      this.position.x = startX + (this.targetX - startX) * easeProgress;
      this.position.z = startZ + (this.targetZ - startZ) * easeProgress;
    }
  },

  /**
   * Ease-in-out cubic interpolation
   */
  easeInOutCubic: function(t) {
    if (t < 0.5) {
      return 4 * t * t * t;
    } else {
      var f = 2 * t - 2;
      return 0.5 * f * f * f + 1;
    }
  }
};

// Export camera control globally
Engine.RegisterGlobal("CameraControl", CameraControl);

print("[CameraCommander] Camera control registered globally");
