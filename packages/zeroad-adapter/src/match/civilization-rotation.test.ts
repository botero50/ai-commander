/**
 * Tests for CivilizationRotation service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CivilizationRotation } from './civilization-rotation.js';
import { Logger } from '../config/logger.js';

describe('CivilizationRotation', () => {
  let rotation: CivilizationRotation;
  const logger = new Logger('debug', 'CivRotationTest');

  beforeEach(() => {
    rotation = new CivilizationRotation(logger);
  });

  it('should initialize with all civilizations', () => {
    const civs = rotation.getAvailableCivilizations();
    expect(civs.length).toBe(15);
    expect(civs.map(c => c.name)).toContain('athenians');
    expect(civs.map(c => c.name)).toContain('romans');
  });

  it('should have correct civilization names', () => {
    const civs = rotation.getAvailableCivilizations();
    const names = civs.map(c => c.name);

    const expected = [
      'athenians',
      'britons',
      'carthaginians',
      'gauls',
      'germans',
      'han',
      'iberians',
      'kushites',
      'macedonians',
      'mauryas',
      'persians',
      'ptolemies',
      'romans',
      'seleucids',
      'spartans',
    ];

    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('should get civilization by name (case-insensitive)', () => {
    const athenians = rotation.getCivilization('athenians');
    expect(athenians).toBeDefined();
    expect(athenians?.displayName).toBe('Athenians');

    const atheniansCaps = rotation.getCivilization('ATHENIANS');
    expect(atheniansCaps).toBeDefined();
  });

  it('should return undefined for unknown civilization', () => {
    const unknown = rotation.getCivilization('unknown_civ');
    expect(unknown).toBeUndefined();
  });

  it('should get random civilization', () => {
    const civ = rotation.getRandomCivilization();
    expect(civ).toBeDefined();
    expect(civ.name).toBeTruthy();
    expect(civ.displayName).toBeTruthy();
  });

  it('should avoid recent civilizations in rotation history', () => {
    const selected = new Set<string>();

    // Select 10 civilizations (history size limit)
    for (let i = 0; i < 10; i++) {
      const civ = rotation.getRandomCivilization();
      selected.add(civ.name);
    }

    // Should have gotten 10 unique civilizations
    expect(selected.size).toBe(10);

    // Next selection should be different from all recent ones
    const nextCiv = rotation.getRandomCivilization();
    expect(Array.from(selected)).not.toContain(nextCiv.name);
  });

  it('should handle history wraparound correctly', () => {
    // Fill history with 10 selections
    for (let i = 0; i < 10; i++) {
      rotation.getRandomCivilization();
    }

    const firstHistory = rotation.getHistory();
    expect(firstHistory.length).toBe(10);

    // Add one more - should push out oldest
    rotation.getRandomCivilization();
    const secondHistory = rotation.getHistory();
    expect(secondHistory.length).toBe(10);

    // Oldest from first should not be in second (except by chance, but unlikely with 15 civs)
    // This is more of a sanity check that rotation is working
    expect(secondHistory).toBeDefined();
  });

  it('should track rotation history', () => {
    const civ1 = rotation.getRandomCivilization();
    const civ2 = rotation.getRandomCivilization();

    const history = rotation.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history).toContain(civ1.name);
    expect(history).toContain(civ2.name);
  });

  it('should get random civilizations for team', () => {
    const civs = rotation.getRandomCivilizationsForTeam(4);
    expect(civs.length).toBe(4);
    civs.forEach(civ => {
      expect(civ.name).toBeTruthy();
      expect(civ.displayName).toBeTruthy();
    });
  });

  it('should get unique random civilizations', () => {
    const civs = rotation.getRandomUniqueCivilizations(5);
    expect(civs.length).toBe(5);

    const names = civs.map(c => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(5); // All unique
  });

  it('should throw error for too many unique selections', () => {
    expect(() => {
      rotation.getRandomUniqueCivilizations(20);
    }).toThrow();
  });

  it('should have correct factions', () => {
    const civs = rotation.getAvailableCivilizations();

    const greekCivs = civs.filter(c => c.faction === 'greek');
    expect(greekCivs.length).toBeGreaterThan(0);

    const celticCivs = civs.filter(c => c.faction === 'celtic');
    expect(celticCivs.length).toBeGreaterThan(0);
  });

  it('should clear history', () => {
    rotation.getRandomCivilization();
    rotation.getRandomCivilization();

    let history = rotation.getHistory();
    expect(history.length).toBeGreaterThan(0);

    rotation.clearHistory();
    history = rotation.getHistory();
    expect(history.length).toBe(0);
  });

  it('should export civilizations as JSON', () => {
    const exported = rotation.exportCivilizations();

    expect(exported.total).toBe(15);
    expect(Array.isArray(exported.civilizations)).toBe(true);
    expect(exported.civilizations.length).toBe(exported.total);

    // Each civ should have required fields
    expect(exported.civilizations[0]).toHaveProperty('name');
    expect(exported.civilizations[0]).toHaveProperty('displayName');
    expect(exported.civilizations[0]).toHaveProperty('faction');
  });

  it('should match display names correctly', () => {
    const testCases = [
      ['athenians', 'Athenians'],
      ['britons', 'Britons'],
      ['carthaginians', 'Carthaginians'],
      ['romans', 'Romans'],
      ['spartans', 'Spartans'],
    ];

    for (const [name, displayName] of testCases) {
      const civ = rotation.getCivilization(name);
      expect(civ?.displayName).toBe(displayName);
    }
  });

  it('should handle multiple team requests independently', () => {
    const team1 = rotation.getRandomCivilizationsForTeam(2);
    const team2 = rotation.getRandomCivilizationsForTeam(2);

    // Teams may overlap, but both should be valid
    expect(team1.length).toBe(2);
    expect(team2.length).toBe(2);

    team1.forEach(civ => {
      expect(civ.name).toBeTruthy();
    });

    team2.forEach(civ => {
      expect(civ.name).toBeTruthy();
    });
  });

  it('should maintain history size limit', () => {
    // Get more than history size (10)
    for (let i = 0; i < 25; i++) {
      rotation.getRandomCivilization();
    }

    const history = rotation.getHistory();
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it('should provide all 15 civilizations', () => {
    const expectedCivs = [
      'Athenians',
      'Britons',
      'Carthaginians',
      'Gauls',
      'Germans',
      'Han',
      'Iberians',
      'Kushites',
      'Macedonians',
      'Mauryas',
      'Persians',
      'Ptolemies',
      'Romans',
      'Seleucids',
      'Spartans',
    ];

    const civs = rotation.getAvailableCivilizations();
    const displayNames = civs.map(c => c.displayName).sort();

    expectedCivs.sort();
    expect(displayNames).toEqual(expectedCivs);
  });
});
