# AI Commander Documentation

Welcome to AI Commander! This documentation is organized to help you get up to speed quickly.

---

## Getting Started

New to AI Commander? Start here:

1. **[Quick Start](QUICK_START.md)** (10 minutes)
   - Installation and first mission
   - Understanding the output
   - Running CLI commands
   - Troubleshooting

---

## Learning

Want to understand how everything works?

1. **[Developer Guide](DEVELOPER_GUIDE.md)** (20 minutes)
   - Project structure
   - Mission lifecycle
   - How the planner works
   - How the decision engine works
   - Understanding execution traces
   - Understanding metrics
   - Understanding validation
   - Understanding snapshots
   - Using the CLI

---

## Doing

Ready to build and extend?

1. **[How-To Guides](GUIDES.md)** (5 minutes each)
   - Run a mission to a custom target
   - Analyze mission with metrics
   - Debug with execution traces
   - Validate with replay
   - Inspect mission state
   - Generate reports
   - Run tests
   - Add custom coordinates
   - View all commands
   - Compare missions

---

## Deep Dive

Want to understand the architecture?

1. **[Architecture](ARCHITECTURE.md)** (15 minutes)
   - Runtime execution flow
   - Lifecycle timing
   - Component responsibilities
   - Data flow
   - Observability pipeline
   - Determinism design
   - Immutability enforcement
   - Extension points
   - Design principles
   - Performance considerations

---

## Reference

Looking for specific information?

| Topic                      | Location                         |
| -------------------------- | -------------------------------- |
| Installation               | QUICK_START.md                   |
| First Mission              | QUICK_START.md                   |
| CLI Commands               | GUIDES.md or `npm start -- help` |
| Project Structure          | DEVELOPER_GUIDE.md               |
| Mission Lifecycle          | DEVELOPER_GUIDE.md               |
| Planner                    | DEVELOPER_GUIDE.md               |
| Decision Engine            | DEVELOPER_GUIDE.md               |
| Execution Traces           | DEVELOPER_GUIDE.md               |
| Runtime Metrics            | DEVELOPER_GUIDE.md               |
| Replay Validation          | DEVELOPER_GUIDE.md               |
| Runtime Inspector          | DEVELOPER_GUIDE.md               |
| Creating Custom Target     | GUIDES.md                        |
| Analyzing Performance      | GUIDES.md                        |
| Debugging Execution        | GUIDES.md                        |
| Component Responsibilities | ARCHITECTURE.md                  |
| Data Flow                  | ARCHITECTURE.md                  |
| Extension Points           | ARCHITECTURE.md                  |

---

## Quick Reference

### Installation

```bash
git clone <repository>
cd ai-commander
npm install
npm run build
```

### First Mission

```bash
cd apps/reference
npm start
```

### Common Commands

```bash
npm start -- run              # Execute mission
npm start -- trace            # Print trace
npm start -- metrics          # Print metrics
npm start -- replay           # Validate
npm start -- inspect          # Print state
npm start -- report           # Full report
npm start -- help             # Get help
```

### With Options

```bash
npm start -- run --target-x 5 --target-y 4
npm start -- trace --json
npm start -- metrics --target-x 2 --target-y 2
```

### Run Tests

```bash
npm test
cd apps/reference && npm test
```

---

## Documentation Map

```
docs/
├── README.md              ← You are here
├── QUICK_START.md         ← Start here (10 min)
├── DEVELOPER_GUIDE.md     ← Understand (20 min)
├── GUIDES.md              ← Learn by doing (5 min each)
└── ARCHITECTURE.md        ← Deep dive (15 min)
```

Each document builds on the previous:

1. **QUICK_START** — Get it running
2. **DEVELOPER_GUIDE** — Understand how it works
3. **GUIDES** — Try practical tasks
4. **ARCHITECTURE** — Understand the design

---

## Learning Paths

### Path 1: Just Want to Run It (10 minutes)

1. QUICK_START.md
2. You're done - the agent is running

### Path 2: Understand the Basics (30 minutes)

1. QUICK_START.md (10 min)
2. DEVELOPER_GUIDE.md (20 min)
3. You understand the architecture

### Path 3: Learn by Doing (45 minutes)

1. QUICK_START.md (10 min)
2. DEVELOPER_GUIDE.md (20 min)
3. GUIDES.md - Pick 3 guides (5 min each, 15 min)
4. You can extend and customize

### Path 4: Complete Mastery (60+ minutes)

1. QUICK_START.md (10 min)
2. DEVELOPER_GUIDE.md (20 min)
3. GUIDES.md - All guides (50 min)
4. ARCHITECTURE.md (15 min)
5. Review source code
6. You're ready to build on it

---

## Key Concepts

### Determinism

Same inputs always produce same outputs. This means:

- You can reproduce bugs
- You can benchmark performance
- You can replay execution
- You can validate consistency

### Immutability

Objects don't change unexpectedly. This means:

- No race conditions
- No state corruption
- No surprising behavior
- Easier to reason about

### Observability

Complete visibility into execution. This means:

- See every decision
- See every action
- See performance metrics
- See validation results

### Orchestration

Clean separation of concerns. This means:

- Easy to replace planner
- Easy to replace decision engine
- Easy to extend observability
- Easy to test each part

---

## Common Questions

**Q: What's the fastest way to get running?**
A: Follow QUICK_START.md - about 10 minutes

**Q: How do I understand how it works?**
A: Read DEVELOPER_GUIDE.md - about 20 minutes

**Q: How do I modify it?**
A: Follow guides in GUIDES.md - 5 minutes each

**Q: How do I extend it?**
A: See ARCHITECTURE.md Extension Points - plan accordingly

**Q: Where's the source code?**
A: `apps/reference/src/` - fully open and readable

**Q: Can I run tests?**
A: Yes - `npm test` - 541 tests passing

**Q: What if something breaks?**
A: Check troubleshooting in QUICK_START.md

**Q: How do I report issues?**
A: Check PROJECT_STATE.md and SESSION_HANDOFF.md for how to contribute

---

## Document Maintenance

These documents are kept in sync with the implementation:

- Every CLI command documented is tested
- Every code example compiles and runs
- Every concept is explained with examples
- Every procedure is step-by-step

If you find a discrepancy, something is out of date.

---

## Getting Help

### For Installation Issues

See **Troubleshooting** in QUICK_START.md

### For Understanding Concepts

See **Developer Guide** sections in DEVELOPER_GUIDE.md

### For How-To Questions

See appropriate guide in GUIDES.md

### For Architecture Questions

See **Architecture** sections in ARCHITECTURE.md

### For Technical Questions

Read the source code - it's well-commented and designed to be understandable

---

## Next Steps

Choose your path:

- **Just want to run it?** → [QUICK_START.md](QUICK_START.md)
- **Want to understand it?** → [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **Want to use it?** → [GUIDES.md](GUIDES.md)
- **Want to extend it?** → [ARCHITECTURE.md](ARCHITECTURE.md)

**Start with QUICK_START.md and spend 10 minutes.**

Everything else builds from there.
