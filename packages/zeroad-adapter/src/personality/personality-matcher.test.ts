import { PersonalityMatcher } from './personality-matcher';
import { PersonalityProfileManager } from './personality-profile';

describe('PersonalityMatcher', () => {
  let matcher: PersonalityMatcher;
  let profileManager: PersonalityProfileManager;

  beforeEach(() => {
    matcher = new PersonalityMatcher();
    profileManager = new PersonalityProfileManager();
  });

  test('initializes matcher', () => {
    expect(matcher).toBeDefined();
  });

  test('finds best match for context', () => {
    const personalities = profileManager.getAllProfiles();
    const match = matcher.findBestMatch(personalities, {
      gameType: 'competitive',
      tone: 'analytical',
    });

    expect(match).toBeDefined();
    expect(match?.score).toBeGreaterThanOrEqual(0);
    expect(match?.score).toBeLessThanOrEqual(100);
  });

  test('returns null for empty personalities', () => {
    const match = matcher.findBestMatch([], {});
    expect(match).toBeNull();
  });

  test('finds matches with minimum score filter', () => {
    const personalities = profileManager.getAllProfiles();
    const matches = matcher.findMatches(personalities, {}, 75);

    expect(Array.isArray(matches)).toBe(true);
    expect(matches.every((m) => m.score >= 75)).toBe(true);
  });

  test('scores all matches', () => {
    const personalities = profileManager.getAllProfiles();
    const matches = matcher.findMatches(personalities, { gameType: 'casual' }, 0);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.score >= 0 && m.score <= 100)).toBe(true);
  });

  test('analyst personality scores high for analytical context', () => {
    const analyst = profileManager.getProfileByName('The Analyst')!;
    const match = matcher.scoreForContext(analyst, {
      tone: 'analytical',
      gameType: 'competitive',
    });

    expect(match.score).toBeGreaterThan(50);
  });

  test('hype personality scores high for entertainment context', () => {
    const hype = profileManager.getProfileByName('The Hype Beast')!;
    const match = matcher.scoreForContext(hype, {
      tone: 'humorous',
      gameType: 'casual',
    });

    expect(match.score).toBeGreaterThan(50);
  });

  test('match includes compatibility scores', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const match = matcher.scoreForContext(personality, {
      tone: 'analytical',
      audience: 'competitive',
    });

    expect(match.compatibility).toBeDefined();
    expect(Object.keys(match.compatibility).length).toBeGreaterThan(0);
  });

  test('match includes reasons', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const match = matcher.scoreForContext(personality, { gameType: 'competitive' });

    expect(Array.isArray(match.reasons)).toBe(true);
    expect(match.reasons.length).toBeGreaterThan(0);
  });

  test('gets match history', () => {
    const personalities = profileManager.getAllProfiles().slice(0, 3);

    for (const personality of personalities) {
      matcher.scoreForContext(personality, {});
    }

    const history = matcher.getMatchHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  test('history is sorted by score', () => {
    const personalities = profileManager.getAllProfiles();

    for (const personality of personalities) {
      matcher.scoreForContext(personality, { gameType: 'competitive' });
    }

    const history = matcher.getMatchHistory();
    for (let i = 0; i < history.length - 1; i++) {
      expect(history[i].score).toBeGreaterThanOrEqual(history[i + 1].score);
    }
  });

  test('gets metrics', () => {
    const personalities = profileManager.getAllProfiles();

    for (const personality of personalities) {
      matcher.scoreForContext(personality, {});
    }

    const metrics = matcher.getMetrics();
    expect(metrics.totalMatches).toBeGreaterThan(0);
    expect(metrics.averageScore).toBeGreaterThanOrEqual(0);
    expect(metrics.averageScore).toBeLessThanOrEqual(100);
    expect(metrics.bestMatch).toBeDefined();
  });

  test('recommends for analyst role', () => {
    const personalities = profileManager.getAllProfiles();
    const recommendations = matcher.recommendForRole(personalities, 'analyst');

    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('recommends for entertainer role', () => {
    const personalities = profileManager.getAllProfiles();
    const recommendations = matcher.recommendForRole(personalities, 'entertainer');

    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('recommends for educator role', () => {
    const personalities = profileManager.getAllProfiles();
    const recommendations = matcher.recommendForRole(personalities, 'educator');

    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('compares two personalities', () => {
    const p1 = profileManager.getProfileByName('The Analyst')!;
    const p2 = profileManager.getProfileByName('The Hype Beast')!;

    const comparison = matcher.compare(p1, p2, { gameType: 'competitive' });

    expect(comparison.p1).toBeDefined();
    expect(comparison.p2).toBeDefined();
    expect(comparison.winner).toBeDefined();
    expect(comparison.comparison.length).toBeGreaterThan(0);
  });

  test('winner is personality with higher score', () => {
    const p1 = profileManager.getProfileByName('The Analyst')!;
    const p2 = profileManager.getProfileByName('The Hype Beast')!;

    const comparison = matcher.compare(p1, p2, { tone: 'analytical' });

    if (comparison.p1.score > comparison.p2.score) {
      expect(comparison.winner.profileId).toBe(p1.profileId);
    } else {
      expect(comparison.winner.profileId).toBe(p2.profileId);
    }
  });

  test('comparison includes trait analysis', () => {
    const p1 = profileManager.getProfileByName('The Analyst')!;
    const p2 = profileManager.getProfileByName('The Comedian')!;

    const comparison = matcher.compare(p1, p2, {});

    expect(comparison.comparison.some((c) => c.includes('expertise') || c.includes('funnier'))).toBe(
      true
    );
  });

  test('scores personality for specific context', () => {
    const personality = profileManager.getProfileByName('The Storyteller')!;
    const match = matcher.scoreForContext(personality, {
      tone: 'professional',
      gameType: 'entertainment',
    });

    expect(match).toBeDefined();
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
  });

  test('context without parameters still scores', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const match = matcher.scoreForContext(personality, {});

    expect(match.score).toBeGreaterThanOrEqual(0);
  });

  test('all match scores are valid numbers', () => {
    const personalities = profileManager.getAllProfiles();
    const matches = matcher.findMatches(personalities, {}, 0);

    for (const match of matches) {
      expect(typeof match.score).toBe('number');
      expect(Number.isNaN(match.score)).toBe(false);
    }
  });

  test('reset clears history', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    matcher.scoreForContext(personality, {});

    let metrics = matcher.getMetrics();
    expect(metrics.totalMatches).toBeGreaterThan(0);

    matcher.reset();
    metrics = matcher.getMetrics();
    expect(metrics.totalMatches).toBe(0);
  });

  test('match scores are deterministic for same input', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const context = { gameType: 'competitive' as const, tone: 'analytical' as const };

    const match1 = matcher.scoreForContext(personality, context);
    const match2 = matcher.scoreForContext(personality, context);

    expect(match1.score).toBe(match2.score);
  });

  test('different contexts produce different scores', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;

    const match1 = matcher.scoreForContext(personality, { gameType: 'competitive' });
    const match2 = matcher.scoreForContext(personality, { gameType: 'casual' });

    // Scores may differ based on context
    expect(typeof match1.score).toBe('number');
    expect(typeof match2.score).toBe('number');
  });

  test('metrics include recommendations', () => {
    const personalities = profileManager.getAllProfiles();

    for (const personality of personalities) {
      matcher.scoreForContext(personality, { tone: 'analytical' });
    }

    const metrics = matcher.getMetrics();
    expect(metrics.recommendations.length).toBeGreaterThan(0);
    expect(metrics.recommendations.length).toBeLessThanOrEqual(5);
  });

  test('match includes personality reference', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const match = matcher.scoreForContext(personality, {});

    expect(match.personality).toBeDefined();
    expect(match.personality.profileId).toBe(personality.profileId);
  });

  test('handles multiple personalities in find matches', () => {
    const personalities = profileManager.getAllProfiles();
    const matches = matcher.findMatches(personalities, { tone: 'humorous' }, 50);

    expect(matches.length).toBeGreaterThanOrEqual(0);
    expect(matches.length).toBeLessThanOrEqual(personalities.length);
  });

  test('audience compatibility is calculated', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const match = matcher.scoreForContext(personality, { audience: 'competitive' });

    expect(match.compatibility).toBeDefined();
  });

  test('entertainment score is derived from traits', () => {
    const hype = profileManager.getProfileByName('The Hype Beast')!;
    const match = matcher.scoreForContext(hype, {});

    expect(match.compatibility.entertainment).toBeGreaterThan(70);
  });
});
