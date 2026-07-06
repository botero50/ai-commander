import { describe, it, expect, beforeEach } from 'vitest';
import { ResearchDashboard } from '../src/world/research-dashboard.js';
import { TournamentEngine, type TournamentConfig, type Competitor } from '../src/world/tournament-engine.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';
import { ClaudeBrain } from '../src/world/claude-brain.js';

describe('Research Dashboard', () => {
  let dashboard: ResearchDashboard;
  let tournament: Awaited<ReturnType<TournamentEngine['runTournament']>>;

  beforeEach(async () => {
    dashboard = new ResearchDashboard();

    const competitors: Competitor[] = [
      { id: 'p1', name: 'Builtin', brain: new BuiltinBrain() },
      { id: 'p2', name: 'Claude', brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }) },
    ];

    const config: TournamentConfig = {
      format: 'best-of',
      competitors,
      matchMaxTicks: 3,
      bestOfN: 1,
    };

    const engine = new TournamentEngine(config);
    tournament = await engine.runTournament();
  });

  describe('Data Collection', () => {
    it('adds tournament', () => {
      dashboard.addTournament(tournament);
      expect(dashboard).toBeDefined();
    });

    it('adds multiple tournaments', () => {
      dashboard.addTournament(tournament);
      dashboard.addTournament(tournament);
      expect(dashboard).toBeDefined();
    });

    it('resets data', () => {
      dashboard.addTournament(tournament);
      dashboard.reset();
      expect(dashboard).toBeDefined();
    });
  });

  describe('Dashboard Generation', () => {
    it('generates dashboard data', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data).toBeDefined();
      expect(data.tournaments).toBeDefined();
      expect(data.modelComparisons).toBeDefined();
    });

    it('includes timestamp', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data.generatedAt).toBeGreaterThan(0);
    });

    it('includes all tournament data', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data.tournaments.length).toBeGreaterThan(0);
    });
  });

  describe('Model Comparisons', () => {
    it('generates comparisons for models', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data.modelComparisons.length).toBeGreaterThan(0);
    });

    it('includes model names', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      for (const comparison of data.modelComparisons) {
        expect(comparison.modelName).toBeDefined();
      }
    });

    it('calculates win rate', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      for (const comparison of data.modelComparisons) {
        expect(comparison.overallWinRate).toBeGreaterThanOrEqual(0);
        expect(comparison.overallWinRate).toBeLessThanOrEqual(1);
      }
    });

    it('accumulates costs', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      for (const comparison of data.modelComparisons) {
        expect(comparison.totalCost).toBeGreaterThanOrEqual(0);
      }
    });

    it('calculates cost per match', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      for (const comparison of data.modelComparisons) {
        expect(comparison.costPerMatch).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Charts', () => {
    it('generates cost chart', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data.costChart).toBeDefined();
      expect(data.costChart.length).toBeGreaterThan(0);

      for (const point of data.costChart) {
        expect(point.model).toBeDefined();
        expect(point.cost).toBeGreaterThanOrEqual(0);
      }
    });

    it('generates latency chart', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data.latencyChart).toBeDefined();
      expect(data.latencyChart.length).toBeGreaterThan(0);

      for (const point of data.latencyChart) {
        expect(point.model).toBeDefined();
        expect(point.latency).toBeGreaterThanOrEqual(0);
      }
    });

    it('generates win rate chart', () => {
      dashboard.addTournament(tournament);
      const data = dashboard.generateDashboard();

      expect(data.winRateChart).toBeDefined();
      expect(data.winRateChart.length).toBeGreaterThan(0);

      for (const point of data.winRateChart) {
        expect(point.model).toBeDefined();
        expect(point.winRate).toBeGreaterThanOrEqual(0);
        expect(point.winRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Rankings', () => {
    it('provides win rate rankings', () => {
      dashboard.addTournament(tournament);
      const rankings = dashboard.getRankings('winRate');

      expect(rankings.length).toBeGreaterThan(0);
      for (const ranking of rankings) {
        expect(ranking.rank).toBeGreaterThan(0);
        expect(ranking.model).toBeDefined();
        expect(ranking.value).toBeGreaterThanOrEqual(0);
      }
    });

    it('provides cost rankings', () => {
      dashboard.addTournament(tournament);
      const rankings = dashboard.getRankings('cost');

      expect(rankings.length).toBeGreaterThan(0);
      for (const ranking of rankings) {
        expect(ranking.rank).toBeGreaterThan(0);
      }
    });

    it('provides latency rankings', () => {
      dashboard.addTournament(tournament);
      const rankings = dashboard.getRankings('latency');

      expect(rankings.length).toBeGreaterThan(0);
      for (const ranking of rankings) {
        expect(ranking.rank).toBeGreaterThan(0);
      }
    });

    it('rankings are sorted', () => {
      dashboard.addTournament(tournament);
      const rankings = dashboard.getRankings('winRate');

      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i].rank).toBeGreaterThan(rankings[i - 1].rank);
      }
    });
  });

  describe('Cost-Performance Analysis', () => {
    it('analyzes cost vs performance', () => {
      dashboard.addTournament(tournament);
      const analysis = dashboard.getCostPerformanceAnalysis();

      expect(analysis.length).toBeGreaterThan(0);
      for (const item of analysis) {
        expect(item.model).toBeDefined();
        expect(item.cost).toBeGreaterThanOrEqual(0);
        expect(item.performance).toBeGreaterThanOrEqual(0);
        expect(item.efficiency).toBeGreaterThanOrEqual(0);
      }
    });

    it('calculates efficiency score', () => {
      dashboard.addTournament(tournament);
      const analysis = dashboard.getCostPerformanceAnalysis();

      for (const item of analysis) {
        expect(typeof item.efficiency).toBe('number');
      }
    });
  });

  describe('Summary Statistics', () => {
    it('generates summary', () => {
      dashboard.addTournament(tournament);
      const summary = dashboard.getSummary();

      expect(summary).toBeDefined();
      expect(summary.totalTournaments).toBeGreaterThan(0);
      expect(summary.totalMatches).toBeGreaterThan(0);
      expect(summary.modelsCompared).toBeGreaterThan(0);
    });

    it('includes best performing model', () => {
      dashboard.addTournament(tournament);
      const summary = dashboard.getSummary();

      expect(summary.bestPerformingModel).toBeDefined();
    });

    it('includes most efficient model', () => {
      dashboard.addTournament(tournament);
      const summary = dashboard.getSummary();

      expect(summary.mostEfficientModel).toBeDefined();
    });

    it('accumulates costs', () => {
      dashboard.addTournament(tournament);
      const summary = dashboard.getSummary();

      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Tournaments', () => {
    it('aggregates data across tournaments', async () => {
      // Run second tournament
      const competitors2: Competitor[] = [
        { id: 'p1', name: 'Builtin', brain: new BuiltinBrain() },
        { id: 'p3', name: 'Other', brain: new BuiltinBrain() },
      ];

      const config2: TournamentConfig = {
        format: 'best-of',
        competitors: competitors2,
        matchMaxTicks: 3,
        bestOfN: 1,
      };

      const engine2 = new TournamentEngine(config2);
      const tournament2 = await engine2.runTournament();

      dashboard.addTournament(tournament);
      dashboard.addTournament(tournament2);

      const summary = dashboard.getSummary();
      expect(summary.totalTournaments).toBe(2);
    });
  });

  describe('Strategy Integration', () => {
    it('can add strategies', () => {
      dashboard.addTournament(tournament);

      // Add strategy for a model that exists in tournament
      const modelName = tournament.standings[0].competitor.name;

      dashboard.addStrategy(modelName, {
        player: 'player1',
        strategy: 'rush',
        confidence: 0.8,
        metrics: {
          aggressiveDecisions: 5,
          economicDecisions: 2,
          defensiveDecisions: 1,
          technologyDecisions: 0,
          harassmentDecisions: 0,
        },
        aggressionScore: 0.7,
        defenseScore: 0.1,
        economyScore: 0.2,
        playStyle: 'rush strategy',
      });

      const data = dashboard.generateDashboard();
      const foundModel = data.modelComparisons.find((c) => c.modelName === modelName);
      if (foundModel) {
        expect(foundModel.strategiesUsed).toContain('rush');
      }
    });
  });

  describe('Experiment Integration', () => {
    it('can add experiments', () => {
      dashboard.addTournament(tournament);

      dashboard.addExperiment({
        name: 'Test Experiment',
        totalConfigurations: 2,
        results: [],
        bestConfiguration: {
          parameterValues: { temp: 0.7 },
          competitorId: 'test',
          wins: 5,
          losses: 2,
          draws: 1,
          winRate: 0.71,
          rating: 1650,
          totalCost: 0.01,
          averageLatencyMs: 100,
        },
        worstConfiguration: {
          parameterValues: { temp: 0.3 },
          competitorId: 'test',
          wins: 2,
          losses: 5,
          draws: 1,
          winRate: 0.29,
          rating: 1550,
          totalCost: 0.009,
          averageLatencyMs: 95,
        },
        parameterImportance: { temp: 0.5 },
      });

      const data = dashboard.generateDashboard();
      expect(data.experiments).toBeDefined();
      expect(data.experiments?.length).toBe(1);
    });
  });
});
