# Documentation Structure

## 📖 Quick Navigation

### 🚀 Getting Started (Root Folder)
- **[README.md](README.md)** — Overview & quick start (3 steps)
- **[START-HERE.md](START-HERE.md)** — First time setup guide
- **[INSTALLATION.md](INSTALLATION.md)** — Detailed installation instructions
- **[ROADMAP.md](ROADMAP.md)** — Project roadmap & future plans
- **[SECURITY.md](SECURITY.md)** — Security policies & guidelines

### 📚 Active Documentation (docs/ folder)
- **[API_REFERENCE.md](docs/API_REFERENCE.md)** — Full API documentation
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System architecture overview
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** — Contributing guidelines
- **[KEYBOARD-SHORTCUTS.md](docs/KEYBOARD-SHORTCUTS.md)** — Broadcast hotkeys
- **[MAP-ROTATION-GUIDE.md](docs/MAP-ROTATION-GUIDE.md)** — Map rotation system
- **[MAP-ROTATION-STATUS.md](docs/MAP-ROTATION-STATUS.md)** — Current map list
- **[SETUP-OBS.md](docs/SETUP-OBS.md)** — OBS integration setup
- **[TESTING.md](docs/TESTING.md)** — Testing guide
- **[FAQ.md](docs/FAQ.md)** — Frequently asked questions
- **[QUICK_START.md](docs/QUICK_START.md)** — Quick start guide

### 🧪 Test Scripts (tests/manual/ folder)
Manual test files for development:
- `test-builtin-match.ts` — Built-in match testing
- `test-cinematic-camera.ts` — Camera system testing
- `test-cinematic-integration.ts` — Integration tests
- `test-playback-controls.ts` — Playback control tests
- `test-r2-*.ts` — RL Interface protocol tests
- `stability-test.ts` — Stability & stress testing
- And more...

### 📦 Archived Documentation
- **documentation/archived/** — Old campaign/EPIC documentation (26 files)
- **docs/archived/** — Old research & investigation (12 files)

---

## 📁 Folder Organization

```
ai-commander/
├── README.md                          ← START HERE
├── START-HERE.md
├── INSTALLATION.md
├── ROADMAP.md
├── SECURITY.md
├── DOCUMENTATION_STRUCTURE.md         ← You are here
│
├── docs/                              ← Active Documentation
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── KEYBOARD-SHORTCUTS.md
│   ├── MAP-ROTATION-*.md
│   ├── SETUP-OBS.md
│   ├── TESTING.md
│   ├── FAQ.md
│   └── archived/                      ← Old research docs
│
├── tests/
│   └── manual/                        ← Manual test scripts (12 files)
│       ├── test-*.ts
│       └── stability-test.ts
│
├── documentation/
│   └── archived/                      ← Old campaign docs (26 files)
│
└── packages/                          ← Source code (organized by feature)
    ├── zeroad-adapter/
    ├── fake-game-adapter/
    ├── core/
    └── ... more packages
```

---

## 🎯 What to Read When

### First Time?
1. Read **README.md** (5 min overview)
2. Read **START-HERE.md** (setup guide)
3. Run **INSTALLATION.md** (setup commands)
4. Check **QUICK_START.md** (first run)

### Want to Contribute?
1. Check **CONTRIBUTING.md**
2. Review **ARCHITECTURE.md** (understand the system)
3. Run tests in **tests/manual/**
4. Follow **TESTING.md** guide

### Troubleshooting?
1. Check **FAQ.md** in docs/
2. Review **SETUP-OBS.md** if broadcast issues
3. Check **MAP-ROTATION-STATUS.md** for map problems
4. Consult **TESTING.md** for test failures

### API Development?
1. Read **ARCHITECTURE.md**
2. Reference **API_REFERENCE.md**
3. Check **KEYBOARD-SHORTCUTS.md** for broadcast codes

---

## 📊 Documentation Stats

- **Essential Root Docs:** 5 files
- **Active Feature Docs:** 13 files
- **Manual Tests:** 12 test scripts
- **Archived Old Docs:** 38 files (organized for reference)

---

## 🔄 Maintenance

Old documentation has been archived but kept for reference:
- **Old Campaigns:** See `documentation/archived/` for EPIC 26-60 summaries
- **Old Research:** See `docs/archived/` for investigation notes
- **Old Guides:** See `documentation/archived/` for camera, memory, old tutorials

This keeps the main documentation clean while preserving history.

---

Last Updated: July 11, 2026
