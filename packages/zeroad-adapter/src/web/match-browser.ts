/**
 * Match Browser Service
 * Manages match history, replays, reports, and statistics
 */

export interface MatchRecord {
  id: string;
  timestamp: number;
  duration: number;
  winner: 'player1' | 'player2';
  player1Name: string;
  player1Model: string;
  player2Name: string;
  player2Model: string;
  finalScore: { player1: number; player2: number };
  replayPath?: string;
  highlightsPath?: string;
}

export interface AIProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  personality: string;
  eloRating: number;
  winRate: number;
  wins: number;
  losses: number;
  favoriteStrategy: string;
  favoriteMap: string;
  favoriteRace: string;
  avgDuration: number;
  recentForm: number[]; // last 10 results: 1=win, 0=loss
}

export class MatchBrowser {
  private matches: MatchRecord[] = [];
  private profiles: Map<string, AIProfile> = new Map();

  addMatch(match: MatchRecord): void {
    this.matches.push(match);
  }

  getMatches(limit: number = 50): MatchRecord[] {
    return this.matches.slice(-limit).reverse();
  }

  getMatchById(id: string): MatchRecord | null {
    return this.matches.find((m) => m.id === id) || null;
  }

  addAIProfile(profile: AIProfile): void {
    this.profiles.set(profile.id, profile);
  }

  getAIProfile(id: string): AIProfile | null {
    return this.profiles.get(id) || null;
  }

  getAllProfiles(): AIProfile[] {
    return Array.from(this.profiles.values());
  }

  getMatchesByPlayer(playerId: string): MatchRecord[] {
    return this.matches.filter(
      (m) => m.player1Name === playerId || m.player2Name === playerId
    );
  }
}
