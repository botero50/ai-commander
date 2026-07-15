# Quick Start: Next 8 Weeks

## Goal: Working Chess Tournament System

### Week 1-2: Setup
- [x] Extract core package ✅ DONE
- [ ] Build core: `npm run build`
- [ ] Create chess-adapter directory structure

### Week 3-5: Implement Chess
- [ ] Implement ChessAdapter (6 methods)
- [ ] Create ChessBrain for UCI engines
- [ ] Integrate with core tournament system

### Week 6-7: Validate
- [ ] Run 10 test matches
- [ ] Verify ratings update correctly
- [ ] Test WebSocket streaming
- [ ] Run 100 tournament matches

### Week 8: Polish & Document
- [ ] Performance profiling
- [ ] Documentation
- [ ] Publish first version

---

## Key Files

**Core Framework** (ready to use):
- `packages/core/` — 168 files, game-agnostic

**Next Step**:
- `packages/chess-adapter/` — create this next

**Documentation**:
- `ADAPTER_TEMPLATE.md` — how to implement adapters
- `CHESS_ADAPTER_PROPOSAL.md` — complete chess code

---

## Building Core

```bash
cd packages/core
npm run build
```

## Structure to Create

```
packages/chess-adapter/
├── src/
│   ├── game/chess-adapter.ts      # 150 lines
│   ├── brain/chess-brain.ts       # 100 lines
│   └── index.ts                   # 50 lines
├── package.json                   # npm config
├── tsconfig.json                  # TypeScript config
└── tests/                          # unit tests
```

## What Gets Built

✅ Offline tournament system
✅ ELO ratings
✅ WebSocket streaming
✅ Match analytics
✅ Commentary/trash talk

## Success = 

Games run 100% reliably (vs 20% for 0 A.D.)
Tournament system proven
Framework ready for other games

---

See CHESS_ADAPTER_PROPOSAL.md for full chess implementation code
