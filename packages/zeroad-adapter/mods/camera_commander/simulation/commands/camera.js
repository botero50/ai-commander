// Camera Control Command Handler
// Processes camera pan/zoom commands in 0 A.D. simulations

Engine.RegisterCommand({
  type: "camera-pan",
  Execute: function(entity, args) {
    // Get camera entity or create dummy
    var cameraTarget = { x: args.x, z: args.z };
    var duration = args.duration || 1000;

    if (typeof ExecutePlayersOrders !== 'undefined') {
      ExecutePlayersOrders(["CameraPan", {
        x: args.x,
        z: args.z,
        duration: duration
      }]);
    }

    print("[CameraCommander] Pan to " + args.x + ", " + args.z);
  },
  Serialize: function(value) {
    return value;
  }
});

Engine.RegisterCommand({
  type: "camera-set",
  Execute: function(entity, args) {
    if (typeof ExecutePlayersOrders !== 'undefined') {
      ExecutePlayersOrders(["CameraSet", {
        x: args.x,
        z: args.z
      }]);
    }

    print("[CameraCommander] Set to " + args.x + ", " + args.z);
  },
  Serialize: function(value) {
    return value;
  }
});

Engine.RegisterCommand({
  type: "camera-zoom",
  Execute: function(entity, args) {
    if (typeof ExecutePlayersOrders !== 'undefined') {
      ExecutePlayersOrders(["CameraZoom", {
        distance: args.distance
      }]);
    }

    print("[CameraCommander] Zoom to " + args.distance);
  },
  Serialize: function(value) {
    return value;
  }
});

print("[CameraCommander] Camera commands registered");
