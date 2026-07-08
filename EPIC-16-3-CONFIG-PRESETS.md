# EPIC 16.3: Configuration Presets

**Status**: Ready for implementation  
**Goal**: Provide pre-configured presets for common scenarios

---

## Overview

Create configuration presets for quick setup of common tournament scenarios.

```bash
ai-commander tournament run --preset "ollama-vs-ollama"
ai-commander tournament run --preset "multi-llm"
ai-commander match start --preset "balanced"
```

---

## Requirements

### Preset Files

YAML configuration files in `~/.ai-commander/presets/`:

```yaml
# ollama-vs-ollama.yaml
name: Ollama vs Ollama
brains:
  - name: Ollama-1
    version: latest
  - name: Ollama-2
    version: latest
matchFormat: round_robin
maxTicks: 5000
```

### Built-in Presets

1. **ollama-vs-ollama** - Local Ollama only
2. **multi-llm** - Ollama + Claude + GPT
3. **builtin-vs-ollama** - Builtin AI vs Ollama
4. **single-match** - One quick match (1000 ticks)
5. **long-match** - Extended match (10000 ticks)

### Commands

```bash
ai-commander config preset list
ai-commander config preset create <name> [OPTIONS]
ai-commander config preset show <name>
ai-commander config preset delete <name>
```

### Format

Presets are YAML files with:
- Tournament/match configuration
- Brain specifications
- Match parameters
- Optional metadata (description, author)

### Error Handling

- Validate preset YAML syntax
- Check brain availability
- Provide helpful error messages
- Fall back to defaults

### Testing

- Unit tests: Preset loading and validation
- Integration test: Use preset to start match
- E2E test: Custom preset creation and usage

---

## Acceptance Criteria

- [ ] Built-in presets work correctly
- [ ] Custom presets can be created
- [ ] Preset YAML validates
- [ ] `--preset` flag works in CLI
- [ ] Presets override command-line options
- [ ] Presets list available options
- [ ] Help text includes preset examples

---

## Files to Create

- `packages/zeroad-adapter/src/cli/config/preset-loader.ts`
- `packages/zeroad-adapter/src/cli/config/preset-validator.ts`
- `packages/zeroad-adapter/src/cli/commands/config-preset.ts`
- `packages/zeroad-adapter/src/cli/presets/*.yaml` (built-in presets)
- `packages/zeroad-adapter/src/cli/cli.test.ts`

---

## Related

- Tournament runner: Configuration (src/tournament/tournament-runner.ts)
- Match execution: Configuration (src/match/simple-match.ts)
