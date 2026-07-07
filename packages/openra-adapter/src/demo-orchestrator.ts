/**
 * Demo Orchestrator — One-command end-to-end tournament
 *
 * Single entry point:
 * ai-commander tournament --game openra --brain-a claude --brain-b gpt4 --games 5
 *
 * Orchestrates:
 * 1. Load provider configs
 * 2. Run tournament
 * 3. Generate reports
 * 4. Display results
 */

import { SingleMatchRunner } from "./single-match-runner";
import { MultiMatchRunner } from "./multi-match-runner";
import { TournamentEngine } from "./tournament-engine";
import { BenchmarkReporter } from "./benchmark-reporter";
import { CostAnalyzer } from "./cost-analyzer";
import { RatingEngine } from "./rating-engine";
import { StrategyAnalyzer } from "./strategy-analyzer";
import type { BrainManagerConfig } from "@ai-commander/brain";

export interface DemoConfig {
  readonly brainA: string; // "claude", "gpt4", "ollama", "gemini", "builtin"
  readonly brainB: string;
  readonly games: number; // Default: 5
  readonly format: "single" | "multi" | "tournament"; // Default: multi
  readonly verbose?: boolean;
  readonly exportPath?: string; // Optional: save reports
}

/**
 * DemoOrchestrator: Run complete tournament end-to-end
 *
 * Usage:
 * ai-commander tournament --brain-a claude --brain-b gpt4 --games 5
 */
export class DemoOrchestrator {
  /**
   * Run a complete tournament from CLI args.
   */
  static async run(config: DemoConfig): Promise<void> {
    console.log(`🎮 AI Commander OpenRA Tournament`);
    console.log(`===================================\n`);

    // Map brain names to configs
    const configs = this.getBrainConfigs();
    const configA = configs.get(config.brainA.toLowerCase());
    const configB = configs.get(config.brainB.toLowerCase());

    if (!configA || !configB) {
      console.error(
        `❌ Unknown brain: ${!configA ? config.brainA : config.brainB}`
      );
      console.log(`Available: ${Array.from(configs.keys()).join(", ")}`);
      process.exit(1);
    }

    try {
      if (config.format === "single") {
        await this.runSingleMatch(configA, configB, config);
      } else if (config.format === "multi") {
        await this.runMultiMatch(configA, configB, config);
      } else if (config.format === "tournament") {
        // Note: tournament with just 2 providers is essentially multi-match
        await this.runMultiMatch(configA, configB, config);
      }

      console.log("\n✅ Tournament complete!");
    } catch (e) {
      console.error(`\n❌ Error: ${String(e)}`);
      process.exit(1);
    }
  }

  /**
   * Run single match.
   */
  private static async runSingleMatch(
    configA: BrainManagerConfig,
    configB: BrainManagerConfig,
    config: DemoConfig
  ): Promise<void> {
    console.log(`Running single match: ${config.brainA} vs ${config.brainB}\n`);

    const result = await SingleMatchRunner.runMatch({
      provider1: configA,
      provider2: configB,
      maxTicks: 500,
    });

    const report = BenchmarkReporter.reportSingleMatch(result);

    console.log(report.summary);
    console.log("\n" + report.results);
    console.log("\n" + report.analysis);

    if (config.exportPath) {
      const fs = await import("fs/promises");
      await fs.writeFile(
        `${config.exportPath}/report.json`,
        BenchmarkReporter.exportJSON(report)
      );
      console.log(`\n📄 Report saved to ${config.exportPath}/report.json`);
    }
  }

  /**
   * Run multi-match series.
   */
  private static async runMultiMatch(
    configA: BrainManagerConfig,
    configB: BrainManagerConfig,
    config: DemoConfig
  ): Promise<void> {
    console.log(
      `Running ${config.games} matches: ${config.brainA} vs ${config.brainB}\n`
    );

    // Progress indicator
    let matchesCompleted = 0;
    const totalMatches = config.games;

    const result = await MultiMatchRunner.runMatches({
      provider1: configA,
      provider2: configB,
      matches: config.games,
      swapAfterMatch: true,
    });

    const report = BenchmarkReporter.reportMultiMatch(
      result,
      config.brainA,
      config.brainB
    );

    console.log(report.summary);
    console.log("\n" + report.results);
    console.log("\n" + report.analysis);

    // Cost analysis
    console.log("\n📊 Cost Analysis:");
    console.log(CostAnalyzer.getPricingReference());

    // Strategy analysis (mock data for now)
    console.log("\n🎯 Strategy Analysis:");
    const strategies = [
      StrategyAnalyzer.analyzeProviderStrategy(
        config.brainA,
        result,
        result.stats.provider1Wins,
        result.stats.provider2Wins
      ),
      StrategyAnalyzer.analyzeProviderStrategy(
        config.brainB,
        result,
        result.stats.provider2Wins,
        result.stats.provider1Wins
      ),
    ];
    console.log(StrategyAnalyzer.generateReport(strategies));

    // Rating engine
    console.log("\n⭐ Ratings:");
    const ratings = RatingEngine.initializeRatings([config.brainA, config.brainB]);
    for (const match of result.matches) {
      RatingEngine.updateRatings(ratings, config.brainA, config.brainB, result);
    }
    console.log(RatingEngine.generateReport(ratings));

    if (config.exportPath) {
      const fs = await import("fs/promises");
      await fs.writeFile(
        `${config.exportPath}/report.json`,
        BenchmarkReporter.exportJSON(report)
      );
      console.log(`\n📄 Report saved to ${config.exportPath}/report.json`);
    }
  }

  /**
   * Get brain configuration from name.
   */
  private static getBrainConfigs(): Map<string, BrainManagerConfig> {
    // Get from environment variables
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GOOGLE_API_KEY;
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";

    const configs = new Map<string, BrainManagerConfig>();

    if (claudeKey) {
      configs.set("claude", {
        provider: "claude",
        claude: {
          apiKey: claudeKey,
          model: "claude-3-opus-20240229",
        },
      });
    }

    if (openaiKey) {
      configs.set("gpt4", {
        provider: "openai",
        openai: {
          apiKey: openaiKey,
          model: "gpt-4",
        },
      });
    }

    if (geminiKey) {
      configs.set("gemini", {
        provider: "gemini",
        gemini: {
          apiKey: geminiKey,
          model: "gemini-pro",
        },
      });
    }

    configs.set("ollama", {
      provider: "ollama",
      ollama: {
        endpoint: ollamaEndpoint,
        model: "llama2",
      },
    });

    configs.set("builtin", {
      provider: "builtin",
    });

    return configs;
  }
}
