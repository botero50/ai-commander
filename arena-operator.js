/**
 * Arena Operator
 *
 * Manages continuous 24-hour chess arena operation
 * - Automatic match scheduling
 * - Continuous restart
 * - Statistics tracking
 * - Health monitoring
 */

export class ArenaOperator {
  constructor(config = {}) {
    this.config = {
      maxMatchesPerHour: config.maxMatchesPerHour || 10,
      operationDuration: config.operationDuration || 86400000, // 24 hours in ms
      matchTimeout: config.matchTimeout || 600000, // 10 minutes
      restartDelay: config.restartDelay || 100, // ms between matches
      enableStatistics: config.enableStatistics !== false,
      enableMonitoring: config.enableMonitoring !== false,
    };

    this.state = {
      running: false,
      startTime: null,
      endTime: null,
      matchesScheduled: 0,
      matchesCompleted: 0,
      matchesFailed: 0,
      currentMatch: null,
    };

    this.statistics = {
      totalMatches: 0,
      totalMoves: 0,
      totalGameTime: 0,
      averageGameLength: 0,
      averageGameDuration: 0,
      wins: { white: 0, black: 0 },
      draws: 0,
      results: [],
      eventCounts: {},
    };

    this.monitoring = {
      healthChecks: [],
      errors: [],
      warnings: [],
      performanceMetrics: {
        matchSpeed: [],
        overlayLatency: [],
        eventDetectionLatency: [],
      },
    };

    this.matchQueue = [];
    this.completedMatches = [];
  }

  /**
   * Start arena operation
   */
  async startOperation() {
    this.state.running = true;
    this.state.startTime = Date.now();
    this.state.endTime = this.state.startTime + this.config.operationDuration;

    console.log(`\n${'═'.repeat(70)}`);
    console.log('  🎮 ARENA OPERATOR: CONTINUOUS OPERATION STARTED');
    console.log('═'.repeat(70));
    console.log(`\n  Start Time: ${new Date(this.state.startTime).toLocaleString()}`);
    console.log(`  Scheduled End: ${new Date(this.state.endTime).toLocaleString()}`);
    console.log(`  Duration: 24 hours`);
    console.log(`  Max Matches/Hour: ${this.config.maxMatchesPerHour}\n`);

    return {
      success: true,
      startTime: this.state.startTime,
      endTime: this.state.endTime,
    };
  }

  /**
   * Schedule a new match
   */
  scheduleMatch(matchConfig) {
    if (!this.state.running) {
      return { success: false, error: 'Arena not running' };
    }

    const matchId = `match-${this.state.matchesScheduled + 1}`;
    const match = {
      id: matchId,
      config: matchConfig,
      status: 'pending',
      scheduledTime: Date.now(),
      startTime: null,
      endTime: null,
      result: null,
    };

    this.matchQueue.push(match);
    this.state.matchesScheduled++;

    return {
      success: true,
      matchId,
      queueLength: this.matchQueue.length,
    };
  }

  /**
   * Execute next match in queue
   */
  async executeNextMatch() {
    if (this.matchQueue.length === 0) {
      return { success: false, error: 'No matches in queue' };
    }

    const match = this.matchQueue.shift();
    match.status = 'running';
    match.startTime = Date.now();

    this.state.currentMatch = match;

    // Simulate match execution
    const result = await this.simulateMatch(match);

    match.endTime = Date.now();
    match.result = result;
    match.status = 'completed';

    // Update statistics
    this.updateStatistics(match, result);

    this.completedMatches.push(match);
    this.state.matchesCompleted++;

    return {
      success: true,
      matchId: match.id,
      result,
      duration: match.endTime - match.startTime,
    };
  }

  /**
   * Simulate match execution
   */
  async simulateMatch(match) {
    // Simulate game with random length (50-400 moves)
    const moveCount = 50 + Math.floor(Math.random() * 350);
    const moveInterval = 100; // ms per move (simulated)
    const duration = moveCount * moveInterval;

    // Random result
    const resultTypes = ['white-win', 'black-win', 'draw'];
    const result = resultTypes[Math.floor(Math.random() * resultTypes.length)];

    // Simulate event detection
    const eventCount = Math.floor(moveCount * 0.3); // ~30% of moves are events

    return {
      moveCount,
      duration,
      result,
      eventCount,
      eventTypes: {
        captures: Math.floor(eventCount * 0.3),
        checks: Math.floor(eventCount * 0.2),
        sacrifices: Math.floor(eventCount * 0.1),
        forks: Math.floor(eventCount * 0.2),
        promotions: Math.floor(eventCount * 0.05),
        other: Math.floor(eventCount * 0.15),
      },
    };
  }

  /**
   * Update statistics from completed match
   */
  updateStatistics(match, result) {
    this.statistics.totalMatches++;
    this.statistics.totalMoves += result.moveCount;
    this.statistics.totalGameTime += result.duration;
    this.statistics.averageGameLength = this.statistics.totalMoves / this.statistics.totalMatches;
    this.statistics.averageGameDuration = this.statistics.totalGameTime / this.statistics.totalMatches;

    // Update results
    if (result.result === 'white-win') {
      this.statistics.wins.white++;
    } else if (result.result === 'black-win') {
      this.statistics.wins.black++;
    } else {
      this.statistics.draws++;
    }

    this.statistics.results.push({
      matchId: match.id,
      result: result.result,
      moves: result.moveCount,
      duration: result.duration,
      events: result.eventCount,
    });

    // Update event counts
    for (const [eventType, count] of Object.entries(result.eventTypes)) {
      this.statistics.eventCounts[eventType] = (this.statistics.eventCounts[eventType] || 0) + count;
    }
  }

  /**
   * Check arena health
   */
  checkHealth() {
    const now = Date.now();
    const elapsedTime = now - this.state.startTime;
    const remainingTime = this.state.endTime - now;
    const expectedMatches = Math.floor((elapsedTime / 3600000) * this.config.maxMatchesPerHour);

    const health = {
      running: this.state.running,
      elapsedTime: Math.floor(elapsedTime / 1000), // seconds
      remainingTime: Math.floor(remainingTime / 1000), // seconds
      matchesCompleted: this.state.matchesCompleted,
      expectedMatches,
      matchesAhead: this.state.matchesCompleted - expectedMatches,
      errorCount: this.monitoring.errors.length,
      warningCount: this.monitoring.warnings.length,
      healthStatus: this.calculateHealthStatus(this.state.matchesCompleted, expectedMatches),
    };

    // Log health check
    this.monitoring.healthChecks.push({
      timestamp: new Date().toISOString(),
      ...health,
    });

    return health;
  }

  /**
   * Calculate health status
   */
  calculateHealthStatus(completed, expected) {
    if (completed >= expected) return '✅ On Schedule';
    const deficit = expected - completed;
    if (deficit <= 1) return '✅ Slightly Behind';
    if (deficit <= 5) return '⚠️  Falling Behind';
    return '❌ Significantly Behind';
  }

  /**
   * Generate continuous operation report
   */
  generateOperationReport() {
    const elapsedTime = Date.now() - this.state.startTime;
    const hoursElapsed = elapsedTime / 3600000;

    const report = {
      operationStatus: this.state.running ? '✅ Running' : '⏹️ Stopped',
      durationHours: hoursElapsed.toFixed(2),
      hoursRemaining: ((this.config.operationDuration - elapsedTime) / 3600000).toFixed(2),
      matchesCompleted: this.state.matchesCompleted,
      matchesFailed: this.state.matchesFailed,
      statistics: {
        totalMoves: this.statistics.totalMoves,
        averageGameLength: this.statistics.averageGameLength.toFixed(0),
        averageGameDuration: this.statistics.averageGameDuration.toFixed(0),
        winRate: {
          white: ((this.statistics.wins.white / this.statistics.totalMatches) * 100).toFixed(1),
          black: ((this.statistics.wins.black / this.statistics.totalMatches) * 100).toFixed(1),
          draws: ((this.statistics.draws / this.statistics.totalMatches) * 100).toFixed(1),
        },
        eventStats: this.statistics.eventCounts,
      },
      monitoring: {
        errorCount: this.monitoring.errors.length,
        warningCount: this.monitoring.warnings.length,
        healthStatus: this.checkHealth().healthStatus,
      },
    };

    return report;
  }

  /**
   * Display operation summary
   */
  displayOperationSummary() {
    const report = this.generateOperationReport();

    console.log('\n' + '═'.repeat(70));
    console.log('  📊 ARENA OPERATION SUMMARY');
    console.log('═'.repeat(70));

    console.log(`\n  Operation Status: ${report.operationStatus}`);
    console.log(`  Duration: ${report.durationHours} hours (${report.hoursRemaining} hours remaining)`);

    console.log(`\n  Matches:`);
    console.log(`    Completed: ${report.matchesCompleted}`);
    console.log(`    Failed: ${report.matchesFailed}`);
    console.log(`    Success Rate: ${((report.matchesCompleted / (report.matchesCompleted + report.matchesFailed)) * 100).toFixed(1)}%`);

    console.log(`\n  Game Statistics:`);
    console.log(`    Total Moves: ${report.statistics.totalMoves}`);
    console.log(`    Avg Game Length: ${report.statistics.averageGameLength} moves`);
    console.log(`    Avg Duration: ${report.statistics.averageGameDuration}ms`);

    console.log(`\n  Results Distribution:`);
    console.log(`    White Wins: ${report.statistics.winRate.white}%`);
    console.log(`    Black Wins: ${report.statistics.winRate.black}%`);
    console.log(`    Draws: ${report.statistics.winRate.draws}%`);

    console.log(`\n  Events Detected:`);
    for (const [eventType, count] of Object.entries(report.statistics.eventStats)) {
      console.log(`    ${eventType}: ${count}`);
    }

    console.log(`\n  Health & Monitoring:`);
    console.log(`    Status: ${report.monitoring.healthStatus}`);
    console.log(`    Errors: ${report.monitoring.errorCount}`);
    console.log(`    Warnings: ${report.monitoring.warningCount}`);

    console.log('\n' + '═'.repeat(70) + '\n');

    return report;
  }

  /**
   * Stop operation
   */
  stopOperation() {
    this.state.running = false;
    const duration = Date.now() - this.state.startTime;

    return {
      success: true,
      duration,
      matchesCompleted: this.state.matchesCompleted,
      report: this.generateOperationReport(),
    };
  }

  /**
   * Get current state
   */
  getState() {
    return {
      running: this.state.running,
      matchesScheduled: this.state.matchesScheduled,
      matchesCompleted: this.state.matchesCompleted,
      matchesFailed: this.state.matchesFailed,
      queueLength: this.matchQueue.length,
      completedCount: this.completedMatches.length,
    };
  }
}

export default ArenaOperator;
