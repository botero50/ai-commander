export interface TournamentContestant {
  readonly name: string;
  readonly version: string;
}

export interface TournamentMatch {
  readonly matchId: string;
  readonly contestant1: TournamentContestant;
  readonly contestant2: TournamentContestant;
  readonly winner: TournamentContestant | null;
  readonly score1: number;
  readonly score2: number;
}

export interface TournamentStandings {
  readonly contestant: TournamentContestant;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly avgScore: number;
}

export class BotTournament {
  private matches: TournamentMatch[] = [];
  private contestants: Map<string, TournamentContestant> = new Map();

  registerContestant(name: string, version: string): void {
    const key = `${name}:${version}`;
    this.contestants.set(key, { name, version });
  }

  recordMatch(contestant1: TournamentContestant, contestant2: TournamentContestant, score1: number, score2: number): TournamentMatch {
    const winner = score1 > score2 ? contestant1 : score2 > score1 ? contestant2 : null;

    const match: TournamentMatch = {
      matchId: `match_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      contestant1,
      contestant2,
      winner,
      score1,
      score2,
    };

    this.matches.push(match);
    return match;
  }

  computeStandings(): readonly TournamentStandings[] {
    const stats: Map<string, { wins: number; losses: number; totalScore: number; matchCount: number }> = new Map();

    for (const contestant of this.contestants.values()) {
      const key = `${contestant.name}:${contestant.version}`;
      if (!stats.has(key)) {
        stats.set(key, { wins: 0, losses: 0, totalScore: 0, matchCount: 0 });
      }
    }

    for (const match of this.matches) {
      const key1 = `${match.contestant1.name}:${match.contestant1.version}`;
      const key2 = `${match.contestant2.name}:${match.contestant2.version}`;

      let stat1 = stats.get(key1);
      let stat2 = stats.get(key2);

      if (!stat1) {
        stat1 = { wins: 0, losses: 0, totalScore: 0, matchCount: 0 };
        stats.set(key1, stat1);
      }
      if (!stat2) {
        stat2 = { wins: 0, losses: 0, totalScore: 0, matchCount: 0 };
        stats.set(key2, stat2);
      }

      if (match.winner === match.contestant1) {
        stat1.wins++;
        stat2.losses++;
      } else if (match.winner === match.contestant2) {
        stat2.wins++;
        stat1.losses++;
      }

      stat1.totalScore += match.score1;
      stat2.totalScore += match.score2;
      stat1.matchCount++;
      stat2.matchCount++;
    }

    const standings: TournamentStandings[] = [];

    for (const [key, contestant] of this.contestants) {
      const stat = stats.get(key);
      if (stat) {
        standings.push({
          contestant,
          wins: stat.wins,
          losses: stat.losses,
          winRate: stat.wins + stat.losses > 0 ? stat.wins / (stat.wins + stat.losses) : 0,
          avgScore: stat.matchCount > 0 ? stat.totalScore / stat.matchCount : 0,
        });
      }
    }

    standings.sort((a, b) => b.winRate - a.winRate || b.avgScore - a.avgScore);
    return standings;
  }

  getMatches(): readonly TournamentMatch[] {
    return this.matches;
  }

  formatResults(): string {
    const standings = this.computeStandings();
    const lines = ['Tournament Results:', ''];

    for (const entry of standings) {
      const record = `${entry.wins}W-${entry.losses}L`;
      const pct = (entry.winRate * 100).toFixed(1);
      lines.push(`  ${entry.contestant.name} (v${entry.contestant.version}): ${record} (${pct}%) - Avg: ${entry.avgScore.toFixed(2)}`);
    }

    return lines.join('\n');
  }
}
