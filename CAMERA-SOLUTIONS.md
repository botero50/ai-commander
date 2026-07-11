# Practical Camera Control Solutions

## The Real Issue

The game is launched with `--rl-interface` which puts it in **headless AI mode**:
```bash
pyrogenesis --rl-interface=127.0.0.1:6000 -autostart=... -autostart-ai=...
```

In this mode, there's **no graphics, no UI, no camera to move**.

## Solution A: Launch with Graphics + RL Interface

Instead of pure RL Interface mode, we could launch 0 A.D. with:
```bash
pyrogenesis \
  --rl-interface=127.0.0.1:6000 \
  -autostart=skirmishes/acropolis_bay_2p \
  -autostart-ai=1:petra \
  -autostart-ai=2:petra \
  -xres=1920 \
  -yres=1080
  # NO --mod=public (use default mods)
```

This would:
- ✅ Keep AI control via RL Interface
- ✅ Also render graphics and UI
- ✅ Allow camera control via Engine.SetCameraData()
- ✅ Allow camera mod to work

**Problem:** This runs TWO interfaces:
- RL Interface receives game state & AI commands
- Graphics/Camera system runs in parallel
- They might not synchronize perfectly

## Solution B: Custom Simulation Command

Register camera movement as a normal game command in the mod:

```javascript
// In mod: simulation/commands/camera.js
Engine.RegisterCommand({
  type: "camera-pan",
  Execute: function(args) {
    Engine.SetCameraData(args.x, args.z, ...);
  }
});
```

Then send via /step endpoint as valid command. This requires:
- ✅ Mod loaded (which it can be)
- ✅ Command registered (which we did)
- ⚠️ 0 A.D. must not strip this in RL Interface mode

## Solution C: Hybrid Mode

Run 0 A.D. normally (not --rl-interface), but:
- Disable AI from controls
- Only feed AI inputs via external commands
- Let game handle camera naturally

This is complex but possible.

## Solution D: Use External Tools Only (CURRENT)

This is what we have working NOW:
- ✅ Detect interesting moments
- ✅ Broadcast recommendations to external tools
- ✅ OBS/streaming software updates overlays
- ✅ Broadcasters follow AI suggestions

Limitation: Requires manual camera movement or OBS automation.

## My Recommendation: Try Solution B First

Let's enable camera commands in the RL Interface by ensuring the mod is properly loaded.

Steps:
1. Modify mod.json to ensure it loads
2. Register camera commands properly  
3. Modify arena loop to load the mod with RL Interface
4. Test if commands execute

If that works → camera moves automatically!
If not → we fall back to Solution A or D

Should we try?
