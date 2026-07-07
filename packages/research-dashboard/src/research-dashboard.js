/**
 * Research Dashboard — Web UI for tournament analysis
 *
 * Provides:
 * 1. Model comparison tables
 * 2. Tournament results visualization
 * 3. ELO history charts
 * 4. Cost analysis (USD per token)
 * 5. Win rate distributions
 * 6. Interactive filtering and sorting
 */
/**
 * ResearchDashboard: Generate dashboard HTML
 */
export class ResearchDashboard {
    static generateHTML(data) {
        const modelComparison = this.generateModelComparisonTable(data);
        const costAnalysis = this.generateCostChart(data);
        const eloChart = this.generateEloChart(data);
        const winRateChart = this.generateWinRateChart(data);
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Commander Research Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
          }
          .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
          h1 { margin-bottom: 30px; color: #1a1a1a; }
          h2 { margin-top: 30px; margin-bottom: 15px; color: #333; font-size: 18px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; }
          .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: auto;
          }
          .card.full { grid-column: 1 / -1; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          th {
            background: #f9f9f9;
            font-weight: 600;
            text-align: center;
          }
          td { text-align: center; }
          td:first-child { text-align: left; }
          tr:hover { background: #f9f9f9; }
          .metric { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .metric-label { font-weight: 500; }
          .metric-value { font-family: monospace; color: #0066cc; }
          canvas { max-height: 300px; margin-top: 10px; }
          .filter { margin-bottom: 15px; }
          .filter label { margin-right: 10px; font-weight: 500; }
          .filter select { padding: 5px 8px; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎮 AI Commander Research Dashboard</h1>

          <div class="grid">
            <div class="card full">
              <h2>Model Comparison</h2>
              ${modelComparison}
            </div>

            <div class="card">
              <h2>Cost Analysis</h2>
              ${costAnalysis}
            </div>

            <div class="card">
              <h2>ELO Rating History</h2>
              ${eloChart}
            </div>

            <div class="card">
              <h2>Win Rate Distribution</h2>
              ${winRateChart}
            </div>
          </div>

          <div class="card full" style="margin-top: 20px;">
            <h2>Tournament Summary</h2>
            <div class="metric">
              <span class="metric-label">Total Tournaments:</span>
              <span class="metric-value">${data.tournaments.length}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Matches Played:</span>
              <span class="metric-value">${data.tournaments.reduce((sum, t) => sum + t.matches.length, 0)}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Duration:</span>
              <span class="metric-value">${(data.tournaments.reduce((sum, t) => sum + t.duration, 0) / 1000 / 60).toFixed(1)}m</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Cost:</span>
              <span class="metric-value">$${data.tournaments.reduce((sum, t) => sum + t.standings.reduce((s2, st) => s2 + st.totalCost, 0), 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <script>
          // Charts would be rendered here with Chart.js
          console.log('Dashboard loaded with ${data.tournaments.length} tournaments');
        </script>
      </body>
      </html>
    `;
    }
    static generateModelComparisonTable(data) {
        const modelStats = new Map();
        for (const tournament of data.tournaments) {
            for (const standing of tournament.standings) {
                const current = modelStats.get(standing.brainName) || { wins: 0, losses: 0, draws: 0, totalCost: 0 };
                modelStats.set(standing.brainName, {
                    wins: current.wins + standing.wins,
                    losses: current.losses + standing.losses,
                    draws: current.draws + standing.draws,
                    totalCost: current.totalCost + standing.totalCost,
                });
            }
        }
        const rows = Array.from(modelStats.entries())
            .map(([model, stats]) => `
      <tr>
        <td><strong>${model}</strong></td>
        <td>${stats.wins}</td>
        <td>${stats.losses}</td>
        <td>${stats.draws}</td>
        <td>${((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100).toFixed(1)}%</td>
        <td>$${stats.totalCost.toFixed(2)}</td>
      </tr>
    `)
            .join('');
        return `
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Draws</th>
            <th>Win Rate</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }
    static generateCostChart(data) {
        const costs = data.tournaments.map((t) => t.standings.reduce((sum, s) => sum + s.totalCost, 0));
        const avgCost = costs.reduce((a, b) => a + b) / costs.length;
        const totalCost = costs.reduce((a, b) => a + b);
        return `
      <div class="metric">
        <span class="metric-label">Avg Cost per Tournament:</span>
        <span class="metric-value">$${avgCost.toFixed(2)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Total Cost:</span>
        <span class="metric-value">$${totalCost.toFixed(2)}</span>
      </div>
      <canvas id="costChart" style="max-height: 250px;"></canvas>
    `;
    }
    static generateEloChart(data) {
        if (data.ratingHistory.length === 0) {
            return '<p>No rating history available</p>';
        }
        const latest = data.ratingHistory[data.ratingHistory.length - 1];
        const topModels = latest.ratings.slice(0, 5).map((r) => r.playerId);
        return `
      <div>
        <p>Top 5 Models by Current ELO:</p>
        <table style="font-size: 12px;">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>ELO</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            ${latest.ratings
            .slice(0, 5)
            .map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.playerId}</td>
              <td>${r.elo.toFixed(0)}</td>
              <td>${(r.winRate * 100).toFixed(1)}%</td>
            </tr>
          `)
            .join('')}
          </tbody>
        </table>
      </div>
    `;
    }
    static generateWinRateChart(data) {
        const winRates = new Map();
        for (const tournament of data.tournaments) {
            for (const standing of tournament.standings) {
                const current = winRates.get(standing.brainName) || [];
                const rate = standing.wins / (standing.wins + standing.losses + standing.draws);
                current.push(rate);
                winRates.set(standing.brainName, current);
            }
        }
        const averageWinRates = Array.from(winRates.entries())
            .map(([model, rates]) => ({
            model,
            avgRate: rates.reduce((a, b) => a + b) / rates.length,
            stdDev: Math.sqrt(rates.reduce((sum, r) => sum + Math.pow(r - rates.reduce((a, b) => a + b) / rates.length, 2), 0) / rates.length),
        }))
            .sort((a, b) => b.avgRate - a.avgRate)
            .slice(0, 10);
        return `
      <table style="font-size: 12px;">
        <thead>
          <tr>
            <th>Model</th>
            <th>Avg Win Rate</th>
            <th>Std Dev</th>
          </tr>
        </thead>
        <tbody>
          ${averageWinRates
            .map((item) => `
          <tr>
            <td>${item.model}</td>
            <td>${(item.avgRate * 100).toFixed(1)}%</td>
            <td>±${(item.stdDev * 100).toFixed(1)}%</td>
          </tr>
        `)
            .join('')}
        </tbody>
      </table>
    `;
    }
}
//# sourceMappingURL=research-dashboard.js.map