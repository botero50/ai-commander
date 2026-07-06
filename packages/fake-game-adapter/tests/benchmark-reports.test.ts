import { describe, it, expect, beforeEach } from 'vitest';
import { BenchmarkReportGenerator } from '../src/world/benchmark-reports.js';
import { TournamentEngine, type TournamentConfig, type Competitor } from '../src/world/tournament-engine.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';

describe('Benchmark Reports', () => {
  let tournament: Awaited<ReturnType<TournamentEngine['runTournament']>>;

  beforeEach(async () => {
    const competitors: Competitor[] = [
      { id: 'p1', name: 'Player 1', brain: new BuiltinBrain() },
      { id: 'p2', name: 'Player 2', brain: new BuiltinBrain() },
    ];

    const config: TournamentConfig = {
      format: 'round-robin',
      competitors,
      matchMaxTicks: 3,
    };

    const engine = new TournamentEngine(config);
    tournament = await engine.runTournament();
  });

  describe('HTML Report', () => {
    it('generates valid HTML', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const html = generator.generate('html');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<title>Benchmark Report</title>');
    });

    it('includes summary metrics', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const html = generator.generate('html');

      expect(html).toContain('Total Matches');
      expect(html).toContain('Total Cost');
      expect(html).toContain('Avg Latency');
    });

    it('includes standings table', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const html = generator.generate('html');

      expect(html).toContain('<table>');
      expect(html).toContain('Competitor');
      expect(html).toContain('Wins');
      expect(html).toContain('Losses');
    });

    it('includes match details', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const html = generator.generate('html');

      expect(html).toContain('Match Details');
      expect(html).toContain('Result');
      expect(html).toContain('Cost');
    });

    it('has styling', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const html = generator.generate('html');

      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
    });
  });

  describe('Markdown Report', () => {
    it('generates markdown', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const md = generator.generate('markdown');

      expect(md).toContain('# Tournament Benchmark Report');
      expect(md).toContain('## Summary');
      expect(md).toContain('## Standings');
    });

    it('includes summary section', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const md = generator.generate('markdown');

      expect(md).toContain('Total Matches');
      expect(md).toContain('Total Cost');
      expect(md).toContain('Average Latency');
    });

    it('includes standings table', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const md = generator.generate('markdown');

      expect(md).toContain('| Rank');
      expect(md).toContain('| Competitor');
      expect(md).toContain('| Wins');
    });

    it('includes match results', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const md = generator.generate('markdown');

      expect(md).toContain('Match Results');
      expect(md).toContain('Player');
    });
  });

  describe('JSON Report', () => {
    it('generates valid JSON', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');

      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    });

    it('includes summary', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.totalMatches).toBeGreaterThan(0);
      expect(parsed.summary.totalCostUsd).toBeGreaterThanOrEqual(0);
    });

    it('includes standings', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      expect(parsed.standings).toBeDefined();
      expect(parsed.standings.length).toBeGreaterThan(0);
      expect(parsed.standings[0].competitorName).toBeDefined();
    });

    it('includes match details', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      expect(parsed.matches).toBeDefined();
      expect(parsed.matches.length).toBeGreaterThan(0);
      expect(parsed.matches[0].player1).toBeDefined();
      expect(parsed.matches[0].winner).toBeDefined();
    });

    it('has timestamp', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('CSV Report', () => {
    it('generates CSV', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const csv = generator.generate('csv');

      expect(csv).toContain('Competitor');
      expect(csv).toContain('Wins');
      expect(csv).toContain('Losses');
    });

    it('has header row', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const csv = generator.generate('csv');
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Rank');
      expect(lines[0]).toContain('Competitor');
    });

    it('includes standings data', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const csv = generator.generate('csv');
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(2);
      expect(lines[1]).toContain(',');
    });

    it('escapes quotes properly', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const csv = generator.generate('csv');

      expect(csv).toMatch(/"[^"]*"/);
    });
  });

  describe('Format Selection', () => {
    it('accepts html format', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const report = generator.generate('html');

      expect(report).toContain('<!DOCTYPE html>');
    });

    it('accepts markdown format', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const report = generator.generate('markdown');

      expect(report).toContain('#');
    });

    it('accepts json format', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const report = generator.generate('json');

      JSON.parse(report);
    });

    it('accepts csv format', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const report = generator.generate('csv');

      expect(report).toContain('\n');
    });

    it('throws on unknown format', () => {
      const generator = new BenchmarkReportGenerator(tournament);

      expect(() => generator.generate('xml' as any)).toThrow();
    });
  });

  describe('Data Completeness', () => {
    it('includes all competitors in report', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      for (const competitor of tournament.config.competitors) {
        const found = parsed.standings.find((s: any) => s.competitorId === competitor.id);
        expect(found).toBeDefined();
      }
    });

    it('includes all matches in report', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      expect(parsed.matches.length).toBe(tournament.matches.length);
    });

    it('calculates win rate correctly', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      for (const standing of parsed.standings) {
        const expected = standing.wins + standing.losses > 0
          ? standing.wins / (standing.wins + standing.losses)
          : 0;
        expect(standing.winRate).toBeCloseTo(expected, 2);
      }
    });

    it('calculates draw rate correctly', () => {
      const generator = new BenchmarkReportGenerator(tournament);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      for (const standing of parsed.standings) {
        const expected = standing.totalMatches > 0
          ? standing.draws / standing.totalMatches
          : 0;
        expect(standing.drawRate).toBeCloseTo(expected, 2);
      }
    });
  });

  describe('Cost and Latency Metrics', () => {
    it('includes total cost in all formats', () => {
      const generator = new BenchmarkReportGenerator(tournament);

      const html = generator.generate('html');
      const md = generator.generate('markdown');
      const json = generator.generate('json');
      const csv = generator.generate('csv');

      expect(html).toContain('Cost');
      expect(md).toContain('Cost');
      expect(json).toContain('costUsd');
      expect(csv).toContain('Cost');
    });

    it('includes latency metrics in all formats', () => {
      const generator = new BenchmarkReportGenerator(tournament);

      const html = generator.generate('html');
      const md = generator.generate('markdown');
      const json = generator.generate('json');
      const csv = generator.generate('csv');

      expect(html).toContain('Latency');
      expect(md).toContain('Latency');
      expect(json).toContain('averageLatencyMs');
      expect(csv).toContain('Latency');
    });
  });

  describe('Ratings Integration', () => {
    it('includes ratings when provided', () => {
      const ratings = new Map([
        ['p1', { rating: 1650, wins: 1, losses: 0, draws: 0, winRate: 1, drawRate: 0, totalMatches: 1, confidenceInterval: { lower: 1600, upper: 1700, margin: 100 } }],
        ['p2', { rating: 1550, wins: 0, losses: 1, draws: 0, winRate: 0, drawRate: 0, totalMatches: 1, confidenceInterval: { lower: 1500, upper: 1600, margin: 100 } }],
      ]);

      const generator = new BenchmarkReportGenerator(tournament, ratings);
      const json = generator.generate('json');
      const parsed = JSON.parse(json);

      expect(parsed.standings[0].rating).toBeDefined();
    });
  });
});
