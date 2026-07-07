/**
 * CLI Interface
 *
 * Command-line interface for multi-LLM arena:
 * - Tournament execution with configuration
 * - Experiment runner with hyperparameter sweep
 * - Report generation (HTML, JSON, CSV, Markdown)
 * - Model benchmarking and comparison
 * - Results export and visualization
 */
/**
 * CLI Interface - command-line execution
 */
export class CLIInterface {
    /**
     * Parse command-line arguments
     */
    static parseArgs(args) {
        const config = {};
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '--format') {
                config.tournamentFormat = args[++i];
            }
            else if (arg === '--models') {
                const models = args[++i].split(',');
                config.models = models.map((m) => ({
                    provider: 'builtin',
                    name: m,
                }));
            }
            else if (arg === '--ticks') {
                config.matchMaxTicks = parseInt(args[++i]);
            }
            else if (arg === '--output') {
                config.outputPath = args[++i];
            }
            else if (arg === '--formats') {
                config.outputFormats = args[++i].split(',');
            }
            else if (arg === '--verbose') {
                config.verbose = true;
            }
        }
        return config;
    }
    /**
     * Validate configuration
     */
    static validateConfig(config) {
        const errors = [];
        if (!config.tournamentFormat) {
            errors.push('Tournament format is required');
        }
        if (!config.models || config.models.length < 2) {
            errors.push('At least 2 models are required');
        }
        if (!config.matchMaxTicks || config.matchMaxTicks < 1) {
            errors.push('Match max ticks must be at least 1');
        }
        if (!config.outputPath) {
            errors.push('Output path is required');
        }
        if (!config.outputFormats || config.outputFormats.length === 0) {
            errors.push('At least one output format is required');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get usage instructions
     */
    static getUsage() {
        return `
AI Commander Multi-LLM Benchmarking Arena

USAGE:
  ai-commander [OPTIONS]

OPTIONS:
  --format FORMAT          Tournament format: round-robin|swiss|best-of|elimination
  --models MODELS          Comma-separated model names (e.g., builtin,gpt4,claude)
  --ticks TICKS            Max ticks per match (default: 10)
  --output PATH            Output directory for results
  --formats FORMATS        Output formats: html,json,csv,markdown (default: json)
  --verbose                Enable verbose output

EXAMPLES:
  # Run round-robin tournament with GPT and Claude
  ai-commander --format round-robin --models gpt4,claude --output ./results

  # Run Swiss format with multiple models and all report formats
  ai-commander --format swiss --models builtin,gpt4,claude,gemini \\
    --output ./results --formats html,json,csv,markdown --ticks 20

  # Best-of match with verbose logging
  ai-commander --format best-of --models claude,gpt4 --output ./results \\
    --verbose --ticks 15
`;
    }
    /**
     * Get example configuration file
     */
    static getExampleConfig() {
        return `
# AI Commander Arena Configuration
# Save as: arena-config.yml

tournament:
  format: round-robin
  matchMaxTicks: 10

models:
  - name: builtin
    provider: builtin

  - name: gpt4
    provider: openai
    model: gpt-4
    apiKey: \${OPENAI_API_KEY}

  - name: claude
    provider: claude
    model: claude-3-sonnet
    apiKey: \${ANTHROPIC_API_KEY}

  - name: gemini
    provider: gemini
    model: gemini-pro
    apiKey: \${GOOGLE_API_KEY}

  - name: ollama-mistral
    provider: ollama
    model: mistral
    baseUrl: http://localhost:11434

output:
  path: ./results
  formats:
    - html
    - json
    - csv
    - markdown

options:
  verbose: false
  repeatMatches: 1
`;
    }
    /**
     * Get model setup guide
     */
    static getModelSetupGuide() {
        return `
# Model Setup Guide

## OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5)

1. Get API key from https://platform.openai.com/api-keys
2. Export environment variable:
   export OPENAI_API_KEY="sk-..."
3. Configure in arena-config.yml:
   - provider: openai
     model: gpt-4
     apiKey: \${OPENAI_API_KEY}

## Claude (Opus, Sonnet, Haiku)

1. Get API key from https://console.anthropic.com
2. Export environment variable:
   export ANTHROPIC_API_KEY="sk-ant-..."
3. Configure in arena-config.yml:
   - provider: claude
     model: claude-3-sonnet
     apiKey: \${ANTHROPIC_API_KEY}

## Google Gemini

1. Get API key from https://makersuite.google.com/app/apikey
2. Export environment variable:
   export GOOGLE_API_KEY="..."
3. Configure in arena-config.yml:
   - provider: gemini
     model: gemini-pro
     apiKey: \${GOOGLE_API_KEY}

## Local Ollama

1. Install from https://ollama.ai
2. Start server:
   ollama serve
3. Pull models:
   ollama pull mistral
   ollama pull llama2
4. Configure in arena-config.yml:
   - provider: ollama
     model: mistral
     baseUrl: http://localhost:11434
`;
    }
    /**
     * Format output message for CLI
     */
    static formatOutput(result, verbose = false) {
        let output = '';
        if (result.success) {
            output += `✓ ${result.message}\n`;
            if (result.outputFiles && result.outputFiles.length > 0) {
                output += '\nGenerated files:\n';
                for (const file of result.outputFiles) {
                    output += `  • ${file}\n`;
                }
            }
        }
        else {
            output += `✗ ${result.message}\n`;
            if (verbose && result.errorDetails) {
                output += `\nDetails:\n${result.errorDetails}\n`;
            }
        }
        return output;
    }
    /**
     * Create progress reporter for long-running operations
     */
    static createProgressReporter(total, label = 'Progress') {
        return {
            start: () => console.log(`\n${label}...`),
            update: (current) => {
                const percent = Math.round((current / total) * 100);
                const bars = Math.floor(percent / 5);
                const emptyBars = 20 - bars;
                const bar = '[' + '█'.repeat(bars) + '░'.repeat(emptyBars) + ']';
                process.stdout.write(`\r${bar} ${percent}% (${current}/${total})`);
            },
            finish: () => console.log('\n'),
        };
    }
    /**
     * Format table output
     */
    static formatTable(data, columns) {
        if (data.length === 0)
            return 'No data';
        // Calculate column widths
        const widths = columns.map((col) => {
            const headerWidth = col.length;
            const maxDataWidth = Math.max(...data.map((row) => String(row[col] || '').length));
            return Math.max(headerWidth, maxDataWidth) + 2;
        });
        // Header
        let table = '';
        table += columns.map((col, i) => col.padEnd(widths[i])).join('');
        table += '\n';
        table += widths.map((w) => '─'.repeat(w)).join('');
        table += '\n';
        // Rows
        for (const row of data) {
            table += columns
                .map((col, i) => String(row[col] || '').padEnd(widths[i]))
                .join('');
            table += '\n';
        }
        return table;
    }
}
//# sourceMappingURL=cli-interface.js.map