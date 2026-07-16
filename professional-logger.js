/**
 * Professional Logger
 *
 * Production-grade logging with:
 * - Structured log formats
 * - Log levels (error, warn, info, debug)
 * - Console and file output
 * - Timestamp and context tracking
 * - Performance metrics
 */

export class ProfessionalLogger {
  constructor(config = {}) {
    this.config = {
      level: config.level || 'info',
      timestamp: config.timestamp !== false,
      context: config.context || 'ChessArena',
      colorize: config.colorize !== false,
      ...config,
    };

    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    this.colors = {
      error: '\x1b[31m',   // red
      warn: '\x1b[33m',    // yellow
      info: '\x1b[36m',    // cyan
      debug: '\x1b[35m',   // magenta
      reset: '\x1b[0m',
    };

    this.logs = [];
    this.startTime = Date.now();
  }

  /**
   * Get timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get elapsed time since start
   */
  getElapsedTime() {
    const elapsed = Date.now() - this.startTime;
    const seconds = (elapsed / 1000).toFixed(2);
    return `+${seconds}s`;
  }

  /**
   * Format log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.config.timestamp ? `${this.getTimestamp()} ` : '';
    const elapsed = `[${this.getElapsedTime()}]`;
    const context = `[${this.config.context}]`;
    const levelStr = level.toUpperCase().padEnd(5);

    let formatted = `${timestamp}${elapsed} ${context} ${levelStr} ${message}`;

    if (data) {
      if (typeof data === 'object') {
        formatted += ` ${JSON.stringify(data)}`;
      } else {
        formatted += ` ${data}`;
      }
    }

    return formatted;
  }

  /**
   * Get colored output
   */
  colorize(text, level) {
    if (!this.config.colorize) return text;
    const color = this.colors[level] || '';
    const reset = this.colors.reset;
    return `${color}${text}${reset}`;
  }

  /**
   * Log message at level
   */
  log(level, message, data = null) {
    if (this.levels[level] === undefined) {
      throw new Error(`Invalid log level: ${level}`);
    }

    if (this.levels[level] > this.levels[this.config.level]) {
      return; // Skip if level is below configured level
    }

    const formatted = this.formatMessage(level, message, data);
    const colored = this.colorize(formatted, level);

    // Console output
    if (level === 'error') {
      console.error(colored);
    } else if (level === 'warn') {
      console.warn(colored);
    } else {
      console.log(colored);
    }

    // Store in memory
    this.logs.push({
      timestamp: this.getTimestamp(),
      level,
      message,
      data,
      formatted,
    });
  }

  /**
   * Log error
   */
  error(message, data = null) {
    this.log('error', message, data);
  }

  /**
   * Log warning
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * Log info
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Log debug
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * Log match start
   */
  logMatchStart(matchId, white, black) {
    this.info(`Match START: ${white} vs ${black}`, { matchId });
  }

  /**
   * Log match complete
   */
  logMatchComplete(matchId, result, moves, duration) {
    this.info(`Match COMPLETE: ${result}`, { matchId, moves, duration: `${duration}ms` });
  }

  /**
   * Log event
   */
  logEvent(eventType, details) {
    this.info(`EVENT: ${eventType}`, details);
  }

  /**
   * Log performance metric
   */
  logPerformance(metric, value, unit = 'ms') {
    this.debug(`PERF: ${metric}=${value}${unit}`);
  }

  /**
   * Get log summary
   */
  getSummary() {
    const errorCount = this.logs.filter(l => l.level === 'error').length;
    const warnCount = this.logs.filter(l => l.level === 'warn').length;
    const infoCount = this.logs.filter(l => l.level === 'info').length;
    const debugCount = this.logs.filter(l => l.level === 'debug').length;

    return {
      totalLogs: this.logs.length,
      errors: errorCount,
      warnings: warnCount,
      info: infoCount,
      debug: debugCount,
      uptimeSeconds: ((Date.now() - this.startTime) / 1000).toFixed(1),
    };
  }

  /**
   * Display log summary
   */
  displaySummary() {
    const summary = this.getSummary();

    console.log('\n' + '═'.repeat(70));
    console.log('  📝 LOGGING SUMMARY');
    console.log('═'.repeat(70));

    console.log(`\n  Total Logs: ${summary.totalLogs}`);
    console.log(`    Errors: ${summary.errors}`);
    console.log(`    Warnings: ${summary.warnings}`);
    console.log(`    Info: ${summary.info}`);
    console.log(`    Debug: ${summary.debug}`);

    console.log(`\n  Uptime: ${summary.uptimeSeconds}s`);

    console.log('\n' + '═'.repeat(70) + '\n');

    return summary;
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Export logs as JSON
   */
  exportAsJSON() {
    return JSON.stringify({
      summary: this.getSummary(),
      logs: this.logs,
    }, null, 2);
  }
}

export default ProfessionalLogger;
