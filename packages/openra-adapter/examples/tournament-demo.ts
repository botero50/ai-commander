/**
 * Complete Tournament Demo
 *
 * Shows end-to-end usage of the OpenRA adapter:
 * 1. Initialize two providers
 * 2. Run a tournament
 * 3. Analyze results
 * 4. Generate reports
 * 5. Export data
 */

import {
  DemoOrchestrator,
  SingleMatchRunner,
  MultiMatchRunner,
  TournamentEngine,
  RatingEngine,
  CostAnalyzer,
  BenchmarkReporter,
  StrategyAnalyzer,
  ReplayEngine,
  DashboardConfig,
  ProductionValidator,
} from "../src/index";

async function main() {
  console.log("🎮 AI Commander OpenRA Tournament Demo\n");

  // Step 1: Validate system is ready
  console.log("Step 1: System Validation");
  const validation = await ProductionValidator.validateSystem();
  console.log(ProductionValidator.generateReport(validation));
  if (!validation.passed) {
    console.error("❌ System validation failed");
    process.exit(1);
  }
  console.log("✅ System ready\n");

  // Step 2: Run a tournament (would need real API keys in production)
  console.log("Step 2: Tournament Execution");
  console.log("(Demo mode - would run with real providers in production)\n");

  // Step 3: Show what tournament results would look like
  console.log("Step 3: Example Tournament Results");
  console.log(
    `
Example tournament between Claude and GPT-4:
  Format: Multi-match (5 games)

Results:
  Claude wins: 3 (60%)
  GPT-4 wins: 2 (40%)

Standings:
  1. Claude: 9 points
  2. GPT-4: 6 points
`
  );

  // Step 4: Show rating system
  console.log("\nStep 4: Rating System");
  const ratings = RatingEngine.initializeRatings(["claude", "gpt4", "ollama"]);
  console.log(RatingEngine.generateReport(ratings));

  // Step 5: Show cost analysis
  console.log("\nStep 5: Cost Analysis");
  console.log(CostAnalyzer.getPricingReference());

  // Step 6: Show strategy analysis
  console.log("\nStep 6: Strategy Analysis");
  console.log(`
Strategy types:
  - Aggressive: Early unit production, military focus
  - Economic: Harvester production, resource focus
  - Defensive: Base protection, minimal expansion
  - Balanced: Mix of all three

Example analysis would show:
  Claude: Economic (70 points)
    - Aggressiveness: 45
    - Economy Focus: 85
    - Defensiveness: 65
    - Wins at resource gathering

  GPT-4: Balanced (70 points)
    - Aggressiveness: 68
    - Economy Focus: 72
    - Defensiveness: 70
    - Flexible strategy
`);

  // Step 7: Show dashboard generation
  console.log("\nStep 7: Dashboard Generation");
  console.log(`
Dashboard would include:
  - Tournament standings table
  - ELO rating leaderboard
  - Cost breakdown (total: $X.XX)
  - Strategy comparison charts
  - Replay index (N matches recorded)

Export formats:
  - HTML: dashboard.html (view in browser)
  - JSON: report.json (machine-readable)
  - CSV: results.csv (spreadsheet import)
`);

  // Step 8: Show replay capabilities
  console.log("\nStep 8: Replay System");
  console.log(`
Replay capabilities:
  - Record all state changes per tick
  - Replay deterministic match progression
  - Compare two replays for strategy differences
  - Identify divergence point (where strategies diverged)
  - Export for analysis or sharing
`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎯 Tournament Ready!");
  console.log("=".repeat(60));
  console.log(`
To run a real tournament:

  export ANTHROPIC_API_KEY=sk-ant-...
  export OPENAI_API_KEY=sk-...
  export GOOGLE_API_KEY=...

  ai-commander tournament \\
    --brain-a claude \\
    --brain-b gpt4 \\
    --games 5 \\
    --format multi \\
    --export-path ./results

Output:
  - Console: Match summaries and analysis
  - results/report.json: Detailed data
  - results/dashboard.html: Visual dashboard
`);
}

main().catch(console.error);
