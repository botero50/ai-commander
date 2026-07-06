# Quick Start: Multi-LLM Arena

Get running in 5 minutes.

## 1. Install

```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
pnpm install
pnpm build
```

## 2. Set Up API Keys

Choose which models you want to test:

```bash
# OpenAI (GPT-4)
export OPENAI_API_KEY="sk-..."

# Claude (Anthropic)
export ANTHROPIC_API_KEY="sk-ant-..."

# Google Gemini
export GOOGLE_API_KEY="..."

# Ollama (local, no key needed)
# Just install from https://ollama.ai
```

## 3. Run Your First Tournament

### Option A: Built-in + Claude (Free)

Built-in AI + local Claude via Ollama:

```bash
# Install local model
ollama pull mistral

# Run tournament
ai-commander \
  --format round-robin \
  --models builtin,mistral \
  --ticks 10 \
  --output ./results \
  --formats html,json
```

### Option B: Three Cloud Models

GPT-4, Claude, Gemini:

```bash
ai-commander \
  --format swiss \
  --models gpt4,claude,gemini \
  --ticks 15 \
  --output ./results \
  --formats html,json,markdown
```

### Option C: All Models

Everything (requires all API keys):

```bash
ai-commander \
  --format round-robin \
  --models builtin,gpt4,claude,gemini,mistral \
  --ticks 20 \
  --output ./results \
  --formats html,json,csv,markdown
```

## 4. View Results

```bash
# Open HTML report
open results/report.html

# Or view JSON
cat results/tournament-results.json

# Or spreadsheet
open results/results.csv
```

## 5. Analyze Results

### Python Analysis

```python
import json

with open('results/tournament-results.json') as f:
    data = json.load(f)

# Rankings
for standing in data['standings']:
    print(f"{standing['competitor_name']}: {standing['win_rate']:.1%}")

# Total cost
print(f"\nTotal cost: ${data['summary']['total_cost_usd']:.2f}")

# Latencies
for model in data['model_comparisons']:
    print(f"{model['model_name']}: {model['average_latency_ms']}ms")
```

### CSV in Excel

Open `results.csv` directly in Excel/Sheets for pivot tables and charts.

## Common Configurations

### Quick Test (Free, Fast)

```bash
ai-commander \
  --format best-of \
  --models builtin,mistral \
  --ticks 5 \
  --output ./results \
  --formats json
```

Time: ~1 minute, Cost: $0

### Standard Tournament (Moderate Cost)

```bash
ai-commander \
  --format round-robin \
  --models gpt4,claude,gemini \
  --ticks 20 \
  --output ./results \
  --formats html,json
```

Time: ~10-15 minutes, Cost: ~$2-5

### Comprehensive Study (Full Analysis)

```bash
ai-commander \
  --format swiss \
  --models builtin,gpt4,claude,gemini,mistral,llama2 \
  --ticks 30 \
  --output ./results \
  --formats html,json,csv,markdown \
  --verbose
```

Time: ~30-45 minutes, Cost: ~$5-10

## Typical Results

### Win Rates

```
GPT-4:       72% (expensive but smart)
Claude:      65% (balanced cost/performance)
Gemini:      58% (budget-friendly)
Mistral:     48% (local, free)
Built-in:    42% (deterministic baseline)
```

### Cost per Match

```
Built-in:    $0.00 (local)
Mistral:     $0.00 (local)
Claude:      $0.02-0.05
Gemini:      $0.01-0.03
GPT-4:       $0.10-0.15
```

### Strategies Discovered

```
Rush:        GPT-4 (aggressive early game)
Expand:      Claude (balanced growth)
Turtle:      Gemini (conservative)
Tech:        Mistral (varied approach)
Boom:        Built-in (resource focus)
```

## Troubleshooting

### "API key not found"

```bash
# Check it's exported
echo $OPENAI_API_KEY

# Export again
export OPENAI_API_KEY="sk-..."
```

### "Ollama connection refused"

```bash
# Start Ollama
ollama serve

# In another terminal, pull model
ollama pull mistral
```

### "Rate limit exceeded"

Reduce `--ticks` to lower API calls, or increase delay between matches:

```bash
ai-commander --ticks 5  # Faster, fewer calls
```

### "Tournament taking too long"

Use best-of instead of round-robin:

```bash
# Instead of: round-robin with 5 models = 10 matches
# Use: best-of with 2 models = 1 match
ai-commander --format best-of --models gpt4,claude
```

## Next Steps

1. **Compare Strategies**: Run same tournament twice, check if strategies differ
2. **Cost Analysis**: Compare `totalCost` per model
3. **Replay Comparison**: Analyze divergence points between runs
4. **Hyperparameter Tuning**: Sweep temperature (0.1 to 0.9)
5. **Multi-Game**: Test same models on different game types

## Getting Help

- Read `/packages/fake-game-adapter/README-ARENA.md` for full documentation
- Check `/packages/fake-game-adapter/examples` for code samples
- Run `ai-commander --help` for all options

## What Gets Generated

```
results/
├── report.html           # Interactive dashboard
├── results.json          # Full match data
├── results.csv           # Spreadsheet format
├── results.md            # Markdown summary
└── replays/              # Individual match replays
    ├── match-1-replay.json
    ├── match-2-replay.json
    └── ...
```

## Cost Estimates

| Config | Matches | Est. Cost | Time |
|--------|---------|-----------|------|
| 2 models, 5 ticks | 1 | $0.01 | 30s |
| 3 models, 10 ticks | 3 | $0.10 | 2min |
| 4 models, 20 ticks | 6 | $0.50 | 5min |
| 5 models, 30 ticks | 10 | $1.50 | 15min |
| Round-robin (5 models) | 10 | $1.50 | 15min |
| Swiss (6 models) | 18 | $2.70 | 25min |

(Estimate based on Claude Sonnet. GPT-4 is 3-5x more expensive.)

---

**Ready to benchmark?** Start with the "Quick Test" config above and you'll have results in 1 minute!
