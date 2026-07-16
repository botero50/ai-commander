/**
 * Tournament Reporter Test Runner
 */

import { TournamentReporter } from './src/tournament-reporter.ts';
import type { TournamentResults } from './src/tournament-types.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  } else {
    console.log(`✓ ${message}`);
    passed++;
  }
}

function createTestResults(): TournamentResults {
  return {
    tournamentId: 'test-1',
    config: {
      id: 'test-1',
      name: 'Test Tournament',
      format: 'round-robin',
      players: ['Alice', 'Bob', 'Charlie'],
      timeControl: 'infinite',
      k_factor: 32,
    },
    matches: [
      {
        matchId: 'm1',
        round: 0,
        white: 'Alice',
        black: 'Bob',
        result: 'white-win',
        moveCount: 40,
        duration: 8000,
        completedTime: Date.now(),
      },
      {
        matchId: 'm2',
        round: 0,
        white: 'Charlie',
        black: 'Alice',
        result: 'black-win',
        moveCount: 35,
        duration: 7000,
        completedTime: Date.now(),
      },
      {
        matchId: 'm3',
        round: 1,
        white: 'Bob',
        black: 'Charlie',
        result: 'draw',
        moveCount: 50,
        duration: 10000,
        completedTime: Date.now(),
      },
    ],
    standings: [
      {
        rank: 1,
        player: 'Alice',
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
        draws: 0,
        score: 1,
        rating: 1216,
        ratingChange: 16,
        performance: 1200,
      },
      {
        rank: 2,
        player: 'Bob',
        gamesPlayed: 2,
        wins: 0,
        losses: 1,
        draws: 1,
        score: 0.5,
        rating: 1192,
        ratingChange: -8,
        performance: 1075,
      },
      {
        rank: 3,
        player: 'Charlie',
        gamesPlayed: 2,
        wins: 1,
        losses: 0,
        draws: 1,
        score: 1.5,
        rating: 1224,
        ratingChange: 24,
        performance: 1300,
      },
    ],
    startTime: Date.now() - 25000,
    endTime: Date.now(),
    duration: 25000,
    stats: {
      totalMatches: 3,
      totalMoves: 125,
      avgMoveTime: 200,
      winRates: {
        Alice: 0.5,
        Bob: 0.0,
        Charlie: 0.5,
      },
      drawRate: 0.33,
    },
  };
}

function testJSONFormat() {
  console.log('\n[JSON Format Tests]');

  const results = createTestResults();
  const json = TournamentReporter.formatJSON(results);

  assert(json.includes('Test Tournament'), 'JSON includes tournament name');
  assert(json.includes('Alice'), 'JSON includes players');
  assert(json.includes('standings'), 'JSON includes standings');
  assert(json.includes('stats'), 'JSON includes stats');

  // Verify it's valid JSON
  try {
    JSON.parse(json);
    assert(true, 'JSON is valid');
  } catch {
    assert(false, 'JSON is valid');
  }
}

function testCSVFormat() {
  console.log('\n[CSV Format Tests]');

  const results = createTestResults();
  const csv = TournamentReporter.formatCSV(results.standings);

  const lines = csv.split('\n');
  assert(lines.length === 4, `CSV has header + 3 data rows (got ${lines.length})`);
  assert(lines[0].includes('Rank'), 'CSV header includes Rank');
  assert(lines[0].includes('Player'), 'CSV header includes Player');
  assert(lines[0].includes('Score'), 'CSV header includes Score');

  // Check data
  assert(lines[1].includes('1'), 'First row has rank 1');
  assert(lines[1].includes('Alice'), 'First row has Alice');

  // Verify CSV format (comma-separated)
  const dataLine = lines[1];
  const fields = dataLine.split(',');
  assert(fields.length === 10, `CSV row has 10 fields (got ${fields.length})`);
}

function testMarkdownFormat() {
  console.log('\n[Markdown Format Tests]');

  const results = createTestResults();
  const md = TournamentReporter.formatMarkdown(results.standings);

  assert(md.includes('Tournament Standings'), 'Markdown includes title');
  assert(md.includes('| Rank |'), 'Markdown includes table header');
  assert(md.includes('-'), 'Markdown includes separator dashes');
  assert(md.includes('Alice'), 'Markdown includes players');
  assert(md.includes('1'), 'Markdown includes rank');
}

function testTextFormat() {
  console.log('\n[Text Format Tests]');

  const results = createTestResults();
  const text = TournamentReporter.formatText(results.standings, results);

  assert(text.includes('Test Tournament'), 'Text includes tournament name');
  assert(text.includes('STANDINGS'), 'Text includes standings title');
  assert(text.includes('STATISTICS'), 'Text includes statistics title');
  assert(text.includes('Alice'), 'Text includes players');
  assert(text.includes('round-robin'), 'Text includes format');
  assert(text.includes('Win Rates'), 'Text includes win rate section');

  // Check table formatting
  assert(text.includes('Rank'), 'Text includes column headers');
  assert(text.includes('Score'), 'Text includes score column');
  assert(text.includes('Rating'), 'Text includes rating column');
}

function testSummaryFormat() {
  console.log('\n[Summary Format Tests]');

  const results = createTestResults();
  const summary = TournamentReporter.formatSummary(results);

  assert(summary.includes('Winner:'), 'Summary includes winner');
  assert(summary.includes('Alice'), 'Summary mentions winner name');
  assert(summary.includes('Participants'), 'Summary includes participant count');
  assert(summary.includes('Matches'), 'Summary includes match count');
  assert(summary.includes('Draw Rate'), 'Summary includes draw rate');
  assert(summary.includes('Duration'), 'Summary includes duration');
}

function testGenerateReport() {
  console.log('\n[Generate Report Tests]');

  const results = createTestResults();

  const json = TournamentReporter.generateReport(results, 'json');
  assert(json.includes('Test Tournament'), 'JSON report generated');

  const csv = TournamentReporter.generateReport(results, 'csv');
  assert(csv.includes('Rank'), 'CSV report generated');

  const md = TournamentReporter.generateReport(results, 'markdown');
  assert(md.includes('Standings'), 'Markdown report generated');

  const text = TournamentReporter.generateReport(results, 'text');
  assert(text.includes('STANDINGS'), 'Text report generated');
}

function testCSVWithoutHeader() {
  console.log('\n[CSV Options Tests]');

  const results = createTestResults();
  const csvWithoutHeader = TournamentReporter.formatCSV(results.standings, {
    includeHeader: false,
  });

  const lines = csvWithoutHeader.split('\n');
  assert(lines.length === 3, `CSV without header has 3 rows (got ${lines.length})`);
  assert(!lines[0].includes('Rank'), 'First row is data, not header');
}

function testDecimals() {
  console.log('\n[Decimal Precision Tests]');

  const results = createTestResults();

  const csv1 = TournamentReporter.formatCSV(results.standings, { maxDecimals: 1 });
  assert(csv1.includes('1.0'), 'Single decimal works');

  const csv2 = TournamentReporter.formatCSV(results.standings, { maxDecimals: 4 });
  assert(csv2.includes('1.0000'), 'Four decimals works');
}

function testInvalidFormat() {
  console.log('\n[Invalid Format Tests]');

  const results = createTestResults();

  try {
    TournamentReporter.generateReport(results, 'invalid' as any);
    assert(false, 'Invalid format throws error');
  } catch {
    assert(true, 'Invalid format throws error');
  }
}

// Run all tests
console.log('='.repeat(70));
console.log('STORY 32.5: TOURNAMENT REPORTER TEST SUITE');
console.log('='.repeat(70));

testJSONFormat();
testCSVFormat();
testMarkdownFormat();
testTextFormat();
testSummaryFormat();
testGenerateReport();
testCSVWithoutHeader();
testDecimals();
testInvalidFormat();

// Summary
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n✅ ALL REPORTER TESTS PASSED');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} TESTS FAILED`);
  process.exit(1);
}
