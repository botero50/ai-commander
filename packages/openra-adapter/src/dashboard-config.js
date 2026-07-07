/**
 * Dashboard Config — Web UI for tournament results
 *
 * Provides:
 * 1. Real-time tournament progress
 * 2. Live standings and ratings
 * 3. Match history and replays
 * 4. Cost analytics dashboard
 * 5. Strategy comparison charts
 */
/**
 * DashboardConfig: Organize data for web display
 *
 * Web server (separate) would:
 * 1. Run tournament
 * 2. Update this dashboard data
 * 3. Serve via HTTP/WebSocket
 * 4. React frontend displays widgets
 */
export class DashboardConfig {
    /**
     * Create dashboard from tournament results.
     */
    static createDashboard(tournament, ratings, costAnalysis, replays) {
        return {
            tournament,
            ratings,
            costAnalysis,
            replays,
            lastUpdated: Date.now(),
        };
    }
    /**
     * Generate standings widget.
     */
    static standingsWidget(tournament) {
        return {
            id: "standings",
            title: "Tournament Standings",
            type: "standings",
            data: {
                format: tournament.format,
                standings: tournament.standings,
                totalGames: tournament.totalGames,
            },
        };
    }
    /**
     * Generate ratings widget.
     */
    static ratingsWidget(ratings) {
        const sorted = Array.from(ratings.values()).sort((a, b) => b.current - a.current);
        return {
            id: "ratings",
            title: "ELO Ratings",
            type: "ratings",
            data: {
                ratings: sorted,
                updated: Date.now(),
            },
        };
    }
    /**
     * Generate cost analytics widget.
     */
    static costWidget(costAnalysis) {
        const providers = Array.from(costAnalysis.providers.values()).sort((a, b) => b.totalCost - a.totalCost);
        return {
            id: "cost",
            title: "Cost Analysis",
            type: "cost",
            data: {
                totalCost: costAnalysis.totalCost,
                costPerMatch: costAnalysis.costPerMatch,
                costPerGame: costAnalysis.costPerGame,
                providers,
            },
        };
    }
    /**
     * Generate strategy comparison widget.
     */
    static strategyWidget(tournament) {
        // Note: strategy data would come from StrategyAnalyzer
        return {
            id: "strategy",
            title: "Strategy Analysis",
            type: "strategy",
            data: {
                providers: tournament.standings.map((s) => s.provider),
                // Strategy scores would be populated from StrategyAnalyzer
            },
        };
    }
    /**
     * Generate replays widget.
     */
    static replaysWidget(replays) {
        const replayList = Array.from(replays.values()).map((r) => ({
            id: r.matchId,
            provider1: r.provider1,
            provider2: r.provider2,
            ticks: r.totalTicks,
            events: r.events.length,
        }));
        return {
            id: "replays",
            title: "Match Replays",
            type: "replays",
            data: {
                replays: replayList,
                count: replays.size,
            },
        };
    }
    /**
     * Get all widgets for a dashboard.
     */
    static getWidgets(dashboard) {
        return [
            this.standingsWidget(dashboard.tournament),
            this.ratingsWidget(dashboard.ratings),
            this.costWidget(dashboard.costAnalysis),
            this.strategyWidget(dashboard.tournament),
            this.replaysWidget(dashboard.replays),
        ];
    }
    /**
     * Export dashboard as JSON for web service.
     */
    static exportJSON(dashboard) {
        const data = {
            tournament: {
                format: dashboard.tournament.format,
                providersCount: dashboard.tournament.providersCount,
                totalMatches: dashboard.tournament.totalMatches,
                totalGames: dashboard.tournament.totalGames,
                standings: dashboard.tournament.standings,
            },
            ratings: Array.from(dashboard.ratings.values()),
            costAnalysis: {
                totalCost: dashboard.costAnalysis.totalCost,
                costPerMatch: dashboard.costAnalysis.costPerMatch,
                costPerGame: dashboard.costAnalysis.costPerGame,
                providers: Array.from(dashboard.costAnalysis.providers.values()),
            },
            replayCount: dashboard.replays.size,
            lastUpdated: dashboard.lastUpdated,
        };
        return JSON.stringify(data, null, 2);
    }
    /**
     * Generate HTML dashboard (simple static version).
     */
    static generateHTML(dashboard) {
        const standings = dashboard.tournament.standings
            .map((s, i) => `<tr><td>${i + 1}</td><td>${s.provider}</td><td>${s.wins}</td><td>${s.losses}</td><td>${s.draws}</td><td>${s.points}</td></tr>`)
            .join("");
        const ratings = Array.from(dashboard.ratings.values())
            .sort((a, b) => b.current - a.current)
            .map((r, i) => `<tr><td>${i + 1}</td><td>${r.provider}</td><td>${r.current.toFixed(0)}</td><td>${r.matches}</td></tr>`)
            .join("");
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Commander Tournament Dashboard</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .widget { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>🎮 AI Commander Tournament Dashboard</h1>

  <div class="widget">
    <h2>Standings</h2>
    <table>
      <thead>
        <tr><th>Rank</th><th>Provider</th><th>Wins</th><th>Losses</th><th>Draws</th><th>Points</th></tr>
      </thead>
      <tbody>${standings}</tbody>
    </table>
  </div>

  <div class="widget">
    <h2>ELO Ratings</h2>
    <table>
      <thead>
        <tr><th>Rank</th><th>Provider</th><th>Rating</th><th>Matches</th></tr>
      </thead>
      <tbody>${ratings}</tbody>
    </table>
  </div>

  <div class="widget">
    <h2>Cost Analysis</h2>
    <p>Total Cost: $${dashboard.costAnalysis.totalCost.toFixed(2)}</p>
    <p>Cost per Match: $${dashboard.costAnalysis.costPerMatch.toFixed(2)}</p>
    <p>Cost per Game: $${dashboard.costAnalysis.costPerGame.toFixed(2)}</p>
  </div>

  <div class="widget">
    <h2>Tournament Info</h2>
    <p>Format: ${dashboard.tournament.format}</p>
    <p>Providers: ${dashboard.tournament.providersCount}</p>
    <p>Total Games: ${dashboard.tournament.totalGames}</p>
    <p>Last Updated: ${new Date(dashboard.lastUpdated).toISOString()}</p>
  </div>
</body>
</html>
    `;
        return html;
    }
}
//# sourceMappingURL=dashboard-config.js.map