# Quick Reference Card

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install
npm install

# 2. Build
npm run build

# 3. Run
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

## 📁 Where to Find Things

| What | Where | File |
|------|-------|------|
| **First Time Setup** | Root | `README.md` |
| **Installation Steps** | Root | `INSTALLATION.md` |
| **Setup Guide** | Root | `START-HERE.md` |
| **Project Roadmap** | Root | `ROADMAP.md` |
| **Documentation Guide** | Root | `DOCUMENTATION_STRUCTURE.md` |
| **API Reference** | docs/ | `API_REFERENCE.md` |
| **Architecture** | docs/ | `ARCHITECTURE.md` |
| **Map Rotation** | docs/ | `MAP-ROTATION-GUIDE.md` |
| **Broadcast Setup** | docs/ | `SETUP-OBS.md` |
| **Keyboard Shortcuts** | docs/ | `KEYBOARD-SHORTCUTS.md` |
| **Manual Tests** | tests/manual/ | `test-*.ts` |
| **Old Docs** | archived folders | See DOCUMENTATION_STRUCTURE.md |

## 🎯 Available Commands

```bash
# Development
npm run build              # Build TypeScript
npm run test               # Run all tests
npm run test -- path/file # Run specific test

# Arena Operations
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10

# Map Discovery
npx tsx packages/zeroad-adapter/src/arena/test-all-maps.ts

# Manual Tests
npx tsx tests/manual/test-real-match.ts
npx tsx tests/manual/stability-test.ts
npx tsx tests/manual/test-cinematic-camera.ts
```

## 📊 System Overview

```
AI Commander = Continuous AI vs AI Strategy Game Streaming

┌─────────────────────────────────────────┐
│   0 A.D. Game (Real Gameplay)          │
│   - 55 Maps (auto-rotating)             │
│   - 15 Civilizations (fair rotation)    │
│   - AI Players (Petra, Custom Models)   │
└──────────────────────────┬──────────────┘
                           │ RL Interface
                           ↓
        ┌──────────────────────────────────┐
        │   ZeroAD Adapter (Game Bridge)  │
        │   - State Extraction             │
        │   - Decision Logging             │
        │   - Cinematic Camera             │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
   ┌──────────────┐              ┌──────────────────┐
   │   Backend    │              │   Web Frontend   │
   │  - Commentary │              │  - Live Stats    │
   │  - Analytics │              │  - Broadcast     │
   │  - Storage   │              │  - Replay View   │
   └──────────────┘              └──────────────────┘
```

## 🧪 What Tests Are Available

| Test | Command | What It Does |
|------|---------|--------------|
| **Unit Tests** | `npm run test` | 4000+ tests across all packages |
| **Map Discovery** | Via npm test | 55 verified maps |
| **Civilization Rotation** | Via npm test | 15 civilizations |
| **Match Randomizer** | Via npm test | Match generation |
| **Real Match** | `tests/manual/test-real-match.ts` | Launches real 0 A.D. match |
| **Cinematic Camera** | `tests/manual/test-cinematic-camera.ts` | Camera system |
| **Stability** | `tests/manual/stability-test.ts` | Stress test |
| **RL Interface** | `tests/manual/test-r2-*.ts` | Protocol tests |

## 📈 Current System Status

✅ **Maps:** 55 verified working maps (2p-8p)
✅ **Civilizations:** 15 available (Athenians, Romans, Spartans, etc.)
✅ **Features:** Complete (streaming, commentary, replay, analytics)
✅ **Tests:** 4000+ passing tests
✅ **Documentation:** Organized & navigable

## 🔧 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Tests failing | Check `docs/TESTING.md` |
| Map problems | Check `docs/MAP-ROTATION-STATUS.md` |
| OBS setup | Check `docs/SETUP-OBS.md` |
| API questions | Check `docs/API_REFERENCE.md` |
| Architecture | Check `docs/ARCHITECTURE.md` |

## 📚 File Organization Summary

```
Root (5 files)        → Essential info only
docs/ (13 files)      → Active feature documentation  
tests/manual/         → 12 manual test scripts
documentation/        → Source code packages
archived/ (2 folders) → Old docs for reference
```

## 🎬 How to Run Arena

```bash
# Single match (auto)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Multiple matches (continuous)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10

# Infinite (until stop signal)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 0

# With custom settings (if supported)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1 --map-rotation true
```

## 🎨 Broadcast Features

- **Live HUD:** Real-time game metrics (economy, military, tech)
- **AI Status:** Decision-making display
- **Commentary:** Esports-style narration
- **Replay:** Instant replay clips
- **Analytics:** Match statistics & trends
- **Streaming:** OBS integration on port 8765

---

**Quick Setup:** `npm install && npm run build && npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1`

**Need Help?** Read `DOCUMENTATION_STRUCTURE.md` to find any documentation.
