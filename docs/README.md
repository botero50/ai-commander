# AI Commander Documentation

Welcome to AI Commander! This documentation is organized to help you get up to speed quickly.

---

## Getting Started

New to AI Commander? Start here:

1. **[Quick Start](QUICK_START.md)** (10 minutes)
   - Installation and first mission
   - Understanding the output
   - Running commands

---

## Learning

Want to understand how everything works?

1. **[API Reference](API.md)** — Complete interface documentation
2. **[ARCHITECTURE_BOOK.md](../ARCHITECTURE_BOOK.md)** — Comprehensive design reference
3. **[Architecture](ARCHITECTURE.md)** (15 minutes)
   - Runtime execution flow
   - Component responsibilities
   - Data flow
   - Design principles

---

## Building & Testing

Ready to extend and contribute?

1. **[Contributing Guide](CONTRIBUTING.md)** — Development standards
2. **[Testing Guide](TESTING.md)** — Test infrastructure
3. **[FAQ](FAQ.md)** — Answers to common questions

---

## Reference

Looking for specific information?

| Topic                      | Location                         |
| -------------------------- | -------------------------------- |
| Installation               | QUICK_START.md                   |
| First Mission              | QUICK_START.md                   |
| API Reference              | API.md                           |
| Architecture               | ARCHITECTURE.md                  |
| Complete Design Details    | ../ARCHITECTURE_BOOK.md          |
| Contributing               | CONTRIBUTING.md                  |
| Testing                    | TESTING.md                       |
| Common Questions           | FAQ.md                           |

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
pnpm run mission              # Execute a mission
pnpm run dashboard            # Start the browser dashboard
pnpm test                      # Run test suite
```


---

## Documentation Map

```
docs/
├── README.md              ← You are here
├── QUICK_START.md         ← Start here (10 min)
├── ARCHITECTURE.md        ← System design (15 min)
├── API.md                 ← API reference
├── TESTING.md             ← Test infrastructure
├── CONTRIBUTING.md        ← Development guide
└── FAQ.md                 ← Common questions

Root:
└── ARCHITECTURE_BOOK.md   ← Complete technical reference (52KB)
```

Each document is self-contained and builds on QUICK_START:

1. **QUICK_START** — Get it running
2. **ARCHITECTURE** — Understand the design
3. **API** — Reference for all interfaces
4. **CONTRIBUTING** — Start building
5. **ARCHITECTURE_BOOK** — Deep dive into design decisions

---

## Learning Paths

### Path 1: Just Want to Run It (10 minutes)

1. QUICK_START.md
2. You're done - the agent is running

### Path 2: Understand the Basics (25 minutes)

1. QUICK_START.md (10 min)
2. ARCHITECTURE.md (15 min)
3. You understand the architecture

### Path 3: Build Custom Agents (40+ minutes)

1. QUICK_START.md (10 min)
2. API.md (10 min)
3. CONTRIBUTING.md (5 min)
4. Review source code in apps/reference/src/
5. You can extend and build custom agents

### Path 4: Complete Mastery (60+ minutes)

1. QUICK_START.md (10 min)
2. ARCHITECTURE.md (15 min)
3. ARCHITECTURE_BOOK.md (20 min)
4. TESTING.md (10 min)
5. Review source code
6. You're ready to build on it and contribute

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
- Complete execution traces

---

## Common Questions

**Q: What's the fastest way to get running?**
A: Follow QUICK_START.md - about 10 minutes

**Q: How do I understand how it works?**
A: Read ARCHITECTURE.md - about 15 minutes

**Q: How do I build custom agents?**
A: See API.md and CONTRIBUTING.md

**Q: How do I extend it?**
A: See ARCHITECTURE.md and review source code

**Q: Where's the source code?**
A: `apps/reference/src/` - fully open and readable

**Q: Can I run tests?**
A: Yes - `pnpm test` - 1870 tests passing

**Q: What if something breaks?**
A: Check troubleshooting in QUICK_START.md and FAQ.md

**Q: How do I contribute?**
A: See CONTRIBUTING.md

---

## Document Maintenance

These documents are kept in sync with the implementation:

- Every code example compiles and runs
- Every concept is explained with examples
- Every procedure is step-by-step
- All links point to current documentation

If you find a discrepancy, something is out of date.

---

## Getting Help

### For Installation Issues

See **Troubleshooting** in QUICK_START.md

### For Understanding Concepts

See **Architecture** sections in ARCHITECTURE.md and ARCHITECTURE_BOOK.md

### For API Questions

Check API.md for complete interface documentation

### For Common Issues

See FAQ.md

### For Development Questions

See CONTRIBUTING.md

### For Technical Deep Dives

Read the source code in apps/reference/src/ - it's well-commented and designed to be understandable

---

## Next Steps

Choose your path:

- **Just want to run it?** → [QUICK_START.md](QUICK_START.md)
- **Want to understand the design?** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Want to build agents?** → [API.md](API.md)
- **Want to contribute?** → [CONTRIBUTING.md](CONTRIBUTING.md)

**Start with QUICK_START.md and spend 10 minutes.**

Everything else builds from there.
