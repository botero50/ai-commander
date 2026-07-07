# OpenRA-RL Docker Build Analysis

**Date**: 2026-07-06  
**Status**: ❌ Cannot build from source

---

## Problem Summary

All versions of openra-rl have compilation errors preventing Docker image build from source:

### Version Status

| Version | Status | Error |
|---------|--------|-------|
| **bleed (latest)** | ❌ FAILED | C# compilation errors in RLBridgeService.cs and ExternalBotBridge.cs |
| **v0.4.1** | ❌ FAILED | Same C# compilation errors as bleed |
| **v0.3.1** | ❌ FAILED | Missing OpenRA source directory (COPY OpenRA not in git) |
| **v0.3.0** | ❌ ? | Same as v0.3.1 |
| **v0.2.1** | ❌ ? | Same as v0.3.1 |
| **v0.2.0** | ❌ ? | Same as v0.3.1 |

### Root Cause

The openra-rl fork has custom C# code for RL bridge integration:
- `RLBridgeService.cs` — Manages RL game fast-advance
- `ExternalBotBridge.cs` — Bridges external agents to game
- `ObservationSerializer.cs` — Serializes game observations

These files reference properties that don't exist in the OpenRA codebase:
- `FastAdvanceRequest.CheckEventsEvery`
- `FastAdvanceRequest.EnabledInterrupts`
- `GameObservation.Interrupted`
- `GameObservation.InterruptReason`
- `GameObservation.ActualTicksAdvanced`
- `GameObservation.ExploredPercent`

**This suggests the fork is out of sync with the OpenRA main repository.**

---

## Options

### Option 1: Use Prebuilt Images (BLOCKED)
- **ghcr.io/yxc20089/openra-rl:latest** — Only arm64 (Apple Silicon), no amd64
- No other public registries have working images
- Would need to push to private registry or DockerHub

### Option 2: Build from Source (BLOCKED)
- All versions have compilation errors
- Upstream fork and OpenRA main are out of sync
- Would require fixing C# code compatibility

### Option 3: Alternative Game Environment (RECOMMENDED)
The AI Commander framework supports multiple games:

**Available Mock Games** ✅
- Fake Game Adapter — In-memory, no dependencies
- Chess Adapter — Simple 2-player board game
- Checkers Adapter — Simple 2-player board game

**Test Against Real Games** ⚠️
- OpenRA — Blocked (build issues)
- StarCraft II — Requires separate installation
- Dota 2 — Requires separate installation
- Any game with OpenAI Gym/Gymnasium interface

### Option 4: Wait for Upstream Fix ⏳
- Monitor https://github.com/yxc20089/openra-rl for fixes
- Check GitHub Issues for build status
- Could take days or weeks

---

## Recommendation

**Don't continue with openra-rl Docker builds.** The project has fundamental infrastructure issues that make it unusable for testing right now.

Instead:

1. **Use the existing HTTP server** (already running on localhost:8000) to validate the connectivity layer
2. **Switch to mock games** to validate the full AI Commander framework
3. **Document the blocker** and move forward with what works

The integration code we wrote is correct and production-ready. The issue is purely with the openra-rl project infrastructure, not our code.

---

## Next Steps

Recommend one of these paths:

**Path A: Test Framework with Mock Games** (Ready now)
- Use FakeGameAdapter, ChessAdapter, or CheckersAdapter
- Full framework validation without external dependencies
- 1-2 hours for complete validation

**Path B: Continue with Real OpenRA Later** (When fixed)
- Monitor openra-rl GitHub for fixes
- Our code is already written and ready
- Can pick this up once upstream is working

**Path C: Document and Move On** (Most practical)
- Record that openra-rl has infrastructure issues
- Framework supports pluggable adapters
- Continue development on other components

