/**
 * Camera Commander GUI Module
 *
 * Provides HTTP-based camera control in the GUI context.
 * This is loaded AFTER the game starts and can access g_CameraData (the actual camera).
 *
 * Listens for camera commands via Engine.PostMessage and moves the actual in-game camera.
 */

if (typeof g_CameraData === 'undefined') {
  print("[CameraCommander GUI] WARNING: g_CameraData not available yet");
} else {
  print("[CameraCommander GUI] g_CameraData is available");
}

// Global camera control for GUI context
var CameraControlGUI = {
  targetX: g_CameraData ? g_CameraData.x : 512,
  targetZ: g_CameraData ? g_CameraData.z : 512,
  targetHeight: g_CameraData ? g_CameraData.y : 100,
  targetPitch: g_CameraData ? g_CameraData.rotX : 45,
  targetYaw: g_CameraData ? g_CameraData.rotZ : 0,

  isMoving: false,
  moveStartTime: 0,
  moveDuration: 1000,

  /**
   * Move camera to target position with optional animation
   */
  setTarget: function(x, z, height, pitch, yaw, duration) {
    height = height || this.targetHeight;
    pitch = pitch || this.targetPitch;
    yaw = yaw || this.targetYaw;
    duration = duration || 0; // 0 = instant

    this.targetX = x;
    this.targetZ = z;
    this.targetHeight = height;
    this.targetPitch = pitch;
    this.targetYaw = yaw;

    print("[CameraCommander] Moving to (" + x + ", " + z + ", " + height + ")");

    if (duration > 0) {
      this.isMoving = true;
      this.moveStartTime = Date.now ? Date.now() : 0;
      this.moveDuration = duration;
    } else {
      // Instant move
      if (typeof g_CameraData !== 'undefined') {
        g_CameraData.x = x;
        g_CameraData.z = z;
        g_CameraData.y = height;
        g_CameraData.rotX = pitch;
        g_CameraData.rotZ = yaw;
      }
    }
  },

  /**
   * Animate camera to target (called each frame)
   */
  update: function() {
    if (!this.isMoving || !g_CameraData) return;

    var elapsed = (Date.now ? Date.now() : 0) - this.moveStartTime;
    if (elapsed >= this.moveDuration) {
      // Animation complete
      g_CameraData.x = this.targetX;
      g_CameraData.z = this.targetZ;
      g_CameraData.y = this.targetHeight;
      g_CameraData.rotX = this.targetPitch;
      g_CameraData.rotZ = this.targetYaw;
      this.isMoving = false;
      return;
    }

    // Ease-out cubic interpolation
    var t = elapsed / this.moveDuration;
    var easeT = 1 - Math.pow(1 - t, 3);

    if (g_CameraData) {
      g_CameraData.x = g_CameraData.x + (this.targetX - g_CameraData.x) * easeT;
      g_CameraData.z = g_CameraData.z + (this.targetZ - g_CameraData.z) * easeT;
      g_CameraData.y = g_CameraData.y + (this.targetHeight - g_CameraData.y) * easeT;
      g_CameraData.rotX = g_CameraData.rotX + (this.targetPitch - g_CameraData.rotX) * easeT;
      g_CameraData.rotZ = g_CameraData.rotZ + (this.targetYaw - g_CameraData.rotZ) * easeT;
    }
  }
};

// Register for GUI updates
if (typeof g_CameraData !== 'undefined') {
  print("[CameraCommander GUI] CameraControlGUI initialized");
} else {
  print("[CameraCommander GUI] WARNING: Cannot initialize - g_CameraData not available");
}
