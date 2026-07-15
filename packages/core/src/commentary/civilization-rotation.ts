/**
 * Story 58 — Civilization Rotation Service
 *
 * Manages available civilizations and rotation for match variety.
 * Supports both sequential rotation and random selection.
 *
 * Features:
 * - Civilization discovery and management
 * - Fair rotation (avoid recent repeats)
 * - Random selection with history tracking
 */

import { Logger } from '../config/logger.js';

export interface CivilizationInfo {
  name: string; // identifier (e.g., 'athenians')
  displayName: string; // human-readable name (e.g., 'Athenians')
  faction: string; // faction/culture
}

/**
 * Manages civilization rotation for arena matches
 */
export class CivilizationRotation {
  private logger: Logger;
  private civilizations: Map<string, CivilizationInfo> = new Map();
  private rotationHistory: string[] = []; // recently used civilizations
  private historySize: number = 10; // remember last N selections

  // Available civilizations in 0 A.D.
  private readonly AVAILABLE_CIVILIZATIONS: CivilizationInfo[] = [
    { name: 'athenians', displayName: 'Athenians', faction: 'greek' },
    { name: 'britons', displayName: 'Britons', faction: 'celtic' },
    { name: 'carthaginians', displayName: 'Carthaginians', faction: 'punic' },
    { name: 'gauls', displayName: 'Gauls', faction: 'celtic' },
    { name: 'germans', displayName: 'Germans', faction: 'germanic' },
    { name: 'han', displayName: 'Han', faction: 'chinese' },
    { name: 'iberians', displayName: 'Iberians', faction: 'iberian' },
    { name: 'kushites', displayName: 'Kushites', faction: 'african' },
    { name: 'macedonians', displayName: 'Macedonians', faction: 'greek' },
    { name: 'mauryas', displayName: 'Mauryas', faction: 'indian' },
    { name: 'persians', displayName: 'Persians', faction: 'persian' },
    { name: 'ptolemies', displayName: 'Ptolemies', faction: 'greek' },
    { name: 'romans', displayName: 'Romans', faction: 'italic' },
    { name: 'seleucids', displayName: 'Seleucids', faction: 'hellenistic' },
    { name: 'spartans', displayName: 'Spartans', faction: 'greek' },
  ];

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeCivilizations();
  }

  private initializeCivilizations(): void {
    for (const civ of this.AVAILABLE_CIVILIZATIONS) {
      this.civilizations.set(civ.name, civ);
    }
    this.logger.debug(`Initialized ${this.civilizations.size} civilizations`);
  }

  /**
   * Get all available civilizations
   */
  getAvailableCivilizations(): CivilizationInfo[] {
    return Array.from(this.civilizations.values());
  }

  /**
   * Get a civilization by name
   */
  getCivilization(name: string): CivilizationInfo | undefined {
    return this.civilizations.get(name.toLowerCase());
  }

  /**
   * Get random civilization, avoiding recent selections
   */
  getRandomCivilization(): CivilizationInfo {
    const available = this.AVAILABLE_CIVILIZATIONS.filter(
      civ => !this.rotationHistory.includes(civ.name),
    );

    // If we've used all recent civs, reset history
    if (available.length === 0) {
      this.rotationHistory = [];
      return this.getRandomCivilization();
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    this.addToHistory(selected.name);
    return selected;
  }

  /**
   * Get random civilizations for a team (multiple players)
   */
  getRandomCivilizationsForTeam(playerCount: number): CivilizationInfo[] {
    const result: CivilizationInfo[] = [];
    for (let i = 0; i < playerCount; i++) {
      result.push(this.getRandomCivilization());
    }
    return result;
  }

  /**
   * Get multiple random civilizations without repetition
   */
  getRandomUniqueCivilizations(count: number): CivilizationInfo[] {
    if (count > this.AVAILABLE_CIVILIZATIONS.length) {
      throw new Error(
        `Cannot select ${count} unique civilizations from ${this.AVAILABLE_CIVILIZATIONS.length} available`,
      );
    }

    const used = new Set<string>();
    const result: CivilizationInfo[] = [];

    while (result.length < count) {
      const civ = this.AVAILABLE_CIVILIZATIONS[
        Math.floor(Math.random() * this.AVAILABLE_CIVILIZATIONS.length)
      ];
      if (!used.has(civ.name)) {
        used.add(civ.name);
        result.push(civ);
      }
    }

    return result;
  }

  /**
   * Add civilization to rotation history
   */
  private addToHistory(civName: string): void {
    this.rotationHistory.push(civName);
    if (this.rotationHistory.length > this.historySize) {
      this.rotationHistory.shift();
    }
  }

  /**
   * Get rotation history
   */
  getHistory(): string[] {
    return [...this.rotationHistory];
  }

  /**
   * Clear rotation history
   */
  clearHistory(): void {
    this.rotationHistory = [];
    this.logger.debug('Cleared civilization rotation history');
  }

  /**
   * Export civilizations as JSON
   */
  exportCivilizations(): {
    total: number;
    civilizations: CivilizationInfo[];
  } {
    return {
      total: this.civilizations.size,
      civilizations: Array.from(this.civilizations.values()),
    };
  }
}
