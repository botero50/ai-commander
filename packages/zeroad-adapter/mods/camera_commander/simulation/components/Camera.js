/**
 * Camera Commander - 0 A.D. Mod
 *
 * Provides camera control functions accessible during gameplay.
 * Called by AI Commander to move camera during matches.
 */

print("[CameraCommander] === MOD LOADING ===");

// Global camera control object
var CameraControl = {
  // State
  isMoving: false,
  moveStart: 0,
  moveDuration: 0,
  startPos: { x: 128, z: 128 },
  endPos: { x: 128, z: 128 },

  /**
   * Pan camera to position
   * @param {number} x - Target X coordinate
   * @param {number} z - Target Z coordinate
   * @param {number} duration - Animation duration in ms
   */
  PanTo: function(x, z, duration) {
    duration = duration || 1000;
    print("[CameraCommander] PanTo(" + x + ", " + z + ", " + duration + ")");

    this.startPos = { x: 128, z: 128 }; // Current position
    this.endPos = { x: x, z: z };
    this.moveStart = Date.now ? Date.now() : 0;
    this.moveDuration = duration;
    this.isMoving = true;
  },

  /**
   * Set camera position instantly
   */
  SetPosition: function(x, z) {
    print("[CameraCommander] SetPosition(" + x + ", " + z + ")");
    this.endPos = { x: x, z: z };
    this.isMoving = false;
  },

  /**
   * Set zoom distance
   */
  SetZoom: function(distance) {
    print("[CameraCommander] SetZoom(" + distance + ")");
  },

  /**
   * Get position
   */
  GetPosition: function() {
    return { x: this.endPos.x, z: this.endPos.z };
  }
};

// Register globally so it can be called from outside
if (typeof Engine !== 'undefined' && Engine.RegisterGlobal) {
  Engine.RegisterGlobal("CameraControl", CameraControl);
  print("[CameraCommander] ✓ CameraControl registered globally");
} else {
  print("[CameraCommander] WARNING: Engine.RegisterGlobal not available");
  // Fallback: just make it global
  this.CameraControl = CameraControl;
}

print("[CameraCommander] === MOD LOADED SUCCESSFULLY ===");
