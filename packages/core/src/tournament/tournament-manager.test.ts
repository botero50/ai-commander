import { TournamentManager, Participant } from './tournament-manager';

describe('TournamentManager', () => {
  let manager: TournamentManager;

  beforeEach(() => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', seed: 0, wins: 0, losses: 0, rating: 1600 },
      { id: 'p2', name: 'Bob', seed: 0, wins: 0, losses: 0, rating: 1500 },
      { id: 'p3', name: 'Charlie', seed: 0, wins: 0, losses: 0, rating: 1400 },
      { id: 'p4', name: 'Diana', seed: 0, wins: 0, losses: 0, rating: 1300 },
    ];

    manager = new TournamentManager('t1', 'Test Tournament', 'single_elimination', participants);
  });

  test('initializes tournament', () => {
    const metadata = manager.getMetadata();
    expect(metadata.id).toBe('t1');
    expect(metadata.name).toBe('Test Tournament');
    expect(metadata.format).toBe('single_elimination');
    expect(metadata.status).toBe('planning');
    expect(metadata.totalRounds).toBe(2); // 4 participants = 2 rounds
  });

  test('seeds participants by rating', () => {
    const metadata = manager.getMetadata();
    expect(metadata.participants[0].seed).toBe(1); // best rating (1600)
    expect(metadata.participants[0].rating).toBe(1600);
    expect(metadata.participants[3].seed).toBe(4); // worst rating (1300)
    expect(metadata.participants[3].rating).toBe(1300);
  });

  test('starts tournament', () => {
    manager.start();
    const metadata = manager.getMetadata();
    expect(metadata.status).toBe('in_progress');
    expect(metadata.currentRound).toBe(1);
    expect(metadata.startTime).toBeDefined();
  });

  test('generates single elimination bracket', () => {
    manager.start();
    const bracket = manager.getBracket();
    expect(bracket.length).toBe(3); // 4 participants = 3 matches total
    expect(bracket[0].round).toBe(1);
    expect(bracket[0].status).toBe('scheduled');
  });

  test('gets matches for round', () => {
    manager.start();
    const round1Matches = manager.getMatchesForRound(1);
    expect(round1Matches.length).toBe(2); // Round 1 has 2 matches for 4 participants
    expect(round1Matches[0].round).toBe(1);
  });

  test('records match result', () => {
    manager.start();
    const matches = manager.getMatchesForRound(1);
    const firstMatch = matches[0];

    manager.recordMatchResult(firstMatch.matchId, firstMatch.participant1Id, firstMatch.participant2Id);

    const updated = manager.getBracket().find((m) => m.matchId === firstMatch.matchId);
    expect(updated?.status).toBe('completed');
    expect(updated?.winner).toBe(firstMatch.participant1Id);
    expect(updated?.loser).toBe(firstMatch.participant2Id);
  });

  test('updates participant wins and losses', () => {
    manager.start();
    const matches = manager.getMatchesForRound(1);
    const firstMatch = matches[0];

    const standings1 = manager.getStandings();
    const p1Before = standings1.find((p) => p.id === firstMatch.participant1Id);
    const p2Before = standings1.find((p) => p.id === firstMatch.participant2Id);

    expect(p1Before?.wins).toBe(0);
    expect(p2Before?.wins).toBe(0);

    manager.recordMatchResult(firstMatch.matchId, firstMatch.participant1Id, firstMatch.participant2Id);

    const standings2 = manager.getStandings();
    const p1After = standings2.find((p) => p.id === firstMatch.participant1Id);
    const p2After = standings2.find((p) => p.id === firstMatch.participant2Id);

    expect(p1After?.wins).toBe(1);
    expect(p2After?.losses).toBe(1);
  });

  test('advances round when all matches completed', () => {
    manager.start();
    let metadata = manager.getMetadata();
    expect(metadata.currentRound).toBe(1);

    const round1Matches = manager.getMatchesForRound(1);
    for (const match of round1Matches) {
      manager.recordMatchResult(match.matchId, match.participant1Id, match.participant2Id);
    }

    metadata = manager.getMetadata();
    expect(metadata.currentRound).toBe(2);
  });

  test('completes tournament', () => {
    manager.start();

    // Complete all matches
    let unfinished = manager.getNextMatches(10);
    while (unfinished.length > 0) {
      for (const match of unfinished) {
        manager.recordMatchResult(match.matchId, match.participant1Id, match.participant2Id);
      }
      unfinished = manager.getNextMatches(10);
    }

    const metadata = manager.getMetadata();
    expect(metadata.status).toBe('completed');
    expect(metadata.endTime).toBeDefined();
  });

  test('gets standings sorted by wins', () => {
    manager.start();

    const matches = manager.getMatchesForRound(1);
    if (matches.length > 0) {
      // Record some matches
      manager.recordMatchResult(matches[0].matchId, matches[0].participant1Id, matches[0].participant2Id);
    }

    const standings = manager.getStandings();
    expect(standings).toBeInstanceOf(Array);
    expect(standings.length).toBe(4);
    // Standings should be sorted with highest wins first
    for (let i = 0; i < standings.length - 1; i++) {
      expect(standings[i].wins).toBeGreaterThanOrEqual(standings[i + 1].wins);
    }
  });

  test('gets next matches', () => {
    manager.start();

    const next = manager.getNextMatches(2);
    expect(next.length).toBe(2);
    expect(next[0].status).toBe('scheduled');
    expect(next[1].status).toBe('scheduled');
  });

  test('gets match history', () => {
    manager.start();

    expect(manager.getMatchHistory().length).toBe(0);

    const matches = manager.getMatchesForRound(1);
    manager.recordMatchResult(matches[0].matchId, matches[0].participant1Id, matches[0].participant2Id);

    expect(manager.getMatchHistory().length).toBe(1);
  });

  test('prevents double completion of match', () => {
    manager.start();

    const matches = manager.getMatchesForRound(1);
    const match = matches[0];

    manager.recordMatchResult(match.matchId, match.participant1Id, match.participant2Id);

    expect(() => {
      manager.recordMatchResult(match.matchId, match.participant1Id, match.participant2Id);
    }).toThrow();
  });

  test('throws error for non-existent match', () => {
    manager.start();

    expect(() => {
      manager.recordMatchResult('invalid_match', 'p1', 'p2');
    }).toThrow();
  });

  test('cannot start tournament twice', () => {
    manager.start();

    expect(() => {
      manager.start();
    }).toThrow();
  });

  test('generates round robin bracket', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'A', seed: 0, wins: 0, losses: 0, rating: 1600 },
      { id: 'p2', name: 'B', seed: 0, wins: 0, losses: 0, rating: 1500 },
      { id: 'p3', name: 'C', seed: 0, wins: 0, losses: 0, rating: 1400 },
    ];

    const roundRobinManager = new TournamentManager('t2', 'RR Tournament', 'round_robin', participants);
    roundRobinManager.start();

    const bracket = roundRobinManager.getBracket();
    // Round robin: n-1 rounds, each with n/2 matches (3 participants = 2 rounds, 1.5 matches per round)
    expect(bracket.length).toBeGreaterThan(0);
  });

  test('generates double elimination bracket', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'A', seed: 0, wins: 0, losses: 0, rating: 1600 },
      { id: 'p2', name: 'B', seed: 0, wins: 0, losses: 0, rating: 1500 },
      { id: 'p3', name: 'C', seed: 0, wins: 0, losses: 0, rating: 1400 },
      { id: 'p4', name: 'D', seed: 0, wins: 0, losses: 0, rating: 1300 },
    ];

    const deManager = new TournamentManager('t3', 'DE Tournament', 'double_elimination', participants);
    deManager.start();

    const bracket = deManager.getBracket();
    expect(bracket.length).toBeGreaterThan(3); // More matches than single elimination
  });

  test('generates swiss bracket', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'A', seed: 0, wins: 0, losses: 0, rating: 1600 },
      { id: 'p2', name: 'B', seed: 0, wins: 0, losses: 0, rating: 1500 },
      { id: 'p3', name: 'C', seed: 0, wins: 0, losses: 0, rating: 1400 },
      { id: 'p4', name: 'D', seed: 0, wins: 0, losses: 0, rating: 1300 },
    ];

    const swissManager = new TournamentManager('t4', 'Swiss Tournament', 'swiss', participants);
    swissManager.start();

    const bracket = swissManager.getBracket();
    expect(bracket.length).toBeGreaterThan(0);
  });

  test('checks if tournament is finished', () => {
    manager.start();
    expect(manager.isFinished()).toBe(false);

    // Complete all matches
    let unfinished = manager.getNextMatches(10);
    while (unfinished.length > 0) {
      for (const match of unfinished) {
        manager.recordMatchResult(match.matchId, match.participant1Id, match.participant2Id);
      }
      unfinished = manager.getNextMatches(10);
    }

    expect(manager.isFinished()).toBe(true);
  });

  test('resets tournament', () => {
    manager.start();
    const matches = manager.getMatchesForRound(1);
    manager.recordMatchResult(matches[0].matchId, matches[0].participant1Id, matches[0].participant2Id);

    expect(manager.getMatchHistory().length).toBe(1);

    manager.reset();

    const metadata = manager.getMetadata();
    expect(metadata.status).toBe('planning');
    expect(metadata.currentRound).toBe(0);
    expect(manager.getMatchHistory().length).toBe(0);
  });

  test('calculates correct total rounds', () => {
    const participants8: Participant[] = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
      seed: 0,
      wins: 0,
      losses: 0,
      rating: 1600 - i * 100,
    }));

    const manager8 = new TournamentManager('t8', 'Tournament 8', 'single_elimination', participants8);
    const metadata = manager8.getMetadata();
    expect(metadata.totalRounds).toBe(3); // 8 participants = 3 rounds
  });

  test('tracks participant ratings through tournament', () => {
    manager.start();

    const metadata = manager.getMetadata();
    const p1 = metadata.participants.find((p) => p.id === 'p1');
    const p4 = metadata.participants.find((p) => p.id === 'p4');

    expect(p1?.rating).toBe(1600);
    expect(p4?.rating).toBe(1300);
  });

  test('handles large tournaments', () => {
    const participants16: Participant[] = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
      seed: 0,
      wins: 0,
      losses: 0,
      rating: 1600 - i * 50,
    }));

    const manager16 = new TournamentManager('t16', 'Tournament 16', 'single_elimination', participants16);
    manager16.start();

    const bracket = manager16.getBracket();
    expect(bracket.length).toBe(15); // 16 participants = 15 total matches
  });
});
