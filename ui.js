/**
 * Chess Arena UI — Beautiful startup diagnostics and animations
 *
 * Provides professional esports-style UI components:
 * - Animated spinners
 * - Progress indicators
 * - Color-coded status
 * - Professional formatting
 */

export class ChessUI {
  constructor() {
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.spinnerIndex = 0;
    this.spinnerInterval = null;
  }

  // ANSI color codes
  colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Colors
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',

    // Backgrounds
    bgCyan: '\x1b[46m',
    bgGreen: '\x1b[42m',
    bgBlue: '\x1b[44m',
  };

  /**
   * Display the main banner with professional styling
   */
  displayBanner() {
    const c = this.colors;
    console.log('\n' + c.bright + c.cyan + '═'.repeat(62) + c.reset);
    console.log(c.bright + c.cyan + '  🏁 AI COMMANDER v1.0 — Chess Tournament Platform' + c.reset);
    console.log(c.bright + c.cyan + '═'.repeat(62) + c.reset);
  }

  /**
   * Display section header
   */
  displaySectionHeader(title) {
    const c = this.colors;
    console.log('\n' + c.bright + c.blue + '🔍  ' + title + c.reset);
    console.log(c.blue + '─'.repeat(58) + c.reset + '\n');
  }

  /**
   * Display a status check with animated spinner
   */
  async displayCheckAnimated(label, checkFn, timeout = 5000) {
    const c = this.colors;
    let result = null;
    let isComplete = false;

    // Start spinner
    process.stdout.write(c.bright + label + c.reset + ' ');
    this.spinnerIndex = 0;

    const spinnerInterval = setInterval(() => {
      process.stdout.write('\b' + c.yellow + this.spinnerFrames[this.spinnerIndex] + c.reset);
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    }, 80);

    // Run check with timeout
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      );
      result = await Promise.race([checkFn(), timeoutPromise]);
      isComplete = true;
    } catch (error) {
      result = { success: false, error: error.message };
    }

    clearInterval(spinnerInterval);

    // Display result
    const statusText = result.success !== false ? '✅' : '✗';
    const statusColor = result.success !== false ? c.green : c.red;
    const resultText = result.success !== false
      ? (result.value || 'OK')
      : (result.error || 'Failed');

    process.stdout.write(
      '\b' + statusColor + statusText + c.reset + ' ' + c.dim + resultText + c.reset + '\n'
    );

    return result;
  }

  /**
   * Display a simple status check
   */
  displayCheck(label, success, value) {
    const c = this.colors;
    const icon = success ? c.green + '✅' : c.red + '✗';
    const padding = ' '.repeat(Math.max(0, 28 - label.length));
    console.log('  ' + label + padding + icon + c.reset + ' ' + c.dim + value + c.reset);
  }

  /**
   * Display arena ready state with visual emphasis
   */
  displayArenaReady() {
    const c = this.colors;
    console.log('\n' + c.bright + c.green + '✅  Arena Ready' + c.reset);
    console.log(c.green + '─'.repeat(58) + c.reset);
  }

  /**
   * Display launch message with emphasis
   */
  displayLaunchMessage() {
    const c = this.colors;
    console.log('\n' + c.bright + c.cyan + '🚀  Launching continuous arena...' + c.reset);
    console.log(c.green + '📡  WebSocket Server: ws://localhost:9000' + c.reset);
    console.log(c.blue + '🌐  Spectator UI: http://localhost:5173' + c.reset + '\n');
  }

  /**
   * Display error message with styling
   */
  displayError(title, message) {
    const c = this.colors;
    console.log('\n' + c.bright + c.red + '❌  ' + title + c.reset);
    console.log(c.red + '─'.repeat(58) + c.reset);
    console.log('\n' + c.red + message + c.reset + '\n');
  }

  /**
   * Display recovery instructions
   */
  displayRecoveryInstructions(instructions) {
    const c = this.colors;
    console.log('\n' + c.bright + c.yellow + '⚠️   Recovery Steps' + c.reset);
    console.log(c.yellow + '─'.repeat(58) + c.reset + '\n');

    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];
      console.log(c.bright + c.yellow + (i + 1) + '. ' + instr.title + c.reset);
      for (const detail of instr.details) {
        console.log('   ' + c.dim + detail + c.reset);
      }
      if (i < instructions.length - 1) console.log();
    }

    console.log();
  }

  /**
   * Display loading progress bar
   */
  displayProgressBar(current, total, label) {
    const c = this.colors;
    const width = 40;
    const filled = Math.round((current / total) * width);
    const empty = width - filled;

    const bar = c.green + '█'.repeat(filled) + c.dim + '░'.repeat(empty) + c.reset;
    const percent = Math.round((current / total) * 100);

    process.stdout.write(
      '\r  ' + label + ' [' + bar + '] ' + c.bright + percent + '%' + c.reset
    );

    if (current === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * Display table-like status checks
   */
  displayStatusTable(checks) {
    const c = this.colors;
    console.log(c.cyan + '\n  Check                        Status' + c.reset);
    console.log(c.cyan + '  ' + '─'.repeat(54) + c.reset);

    for (const check of checks) {
      const icon = check.success ? c.green + '✅' : c.red + '✗';
      const label = check.label;
      const padding = ' '.repeat(Math.max(0, 26 - label.length));
      console.log('  ' + label + padding + icon + c.reset + '  ' + c.dim + check.value + c.reset);
    }

    console.log(c.cyan + '  ' + '─'.repeat(54) + c.reset + '\n');
  }

  /**
   * Display match header with styling
   */
  displayMatchHeader(matchNumber) {
    const c = this.colors;
    console.log('\n' + c.bright + c.cyan + '────' + '─'.repeat(54) + c.reset);
    console.log(c.bright + c.cyan + '  Match #' + matchNumber + c.reset);
    console.log(c.bright + c.cyan + '────' + '─'.repeat(54) + c.reset);
  }

  /**
   * Display match result with styling
   */
  displayMatchResult(result, winner) {
    const c = this.colors;
    const resultColor = result === 'draw' ? c.yellow : c.green;
    const resultText =
      result === 'draw' ? '🤝 Draw' : winner + ' wins';

    console.log('\n' + resultColor + '✅  Game Over' + c.reset);
    console.log('   ' + c.bright + resultText + c.reset);
  }

  /**
   * Display arena started banner
   */
  displayArenaStarted() {
    const c = this.colors;
    console.log(
      '\n' + c.bright + c.magenta + '🏛️   Arena Started' + c.reset +
      '\n' + c.dim + '   Press Ctrl+C to stop' + c.reset + '\n'
    );
  }

  /**
   * Display match countdown
   */
  displayCountdown(seconds, label = 'Next match') {
    process.stdout.write(c.yellow + '⏳  ' + label + ' in ' + seconds + 's' + c.reset);
  }

  /**
   * Clear a line (for spinner cleanup)
   */
  clearLine() {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  /**
   * Get colored status badge
   */
  getStatusBadge(success, text) {
    const c = this.colors;
    if (success) {
      return c.green + '✅ ' + text + c.reset;
    } else {
      return c.red + '✗ ' + text + c.reset;
    }
  }

  /**
   * Display summary table
   */
  displaySummary(stats) {
    const c = this.colors;
    console.log('\n' + c.bright + c.cyan + '📊  Arena Statistics' + c.reset);
    console.log(c.cyan + '─'.repeat(58) + c.reset);
    console.log('  Total Games:        ' + c.bright + stats.totalGames + c.reset);
    console.log('  White Wins:         ' + c.green + stats.whiteWins + c.reset);
    console.log('  Black Wins:         ' + c.green + stats.blackWins + c.reset);
    console.log('  Draws:              ' + c.yellow + stats.draws + c.reset);
    console.log(c.cyan + '─'.repeat(58) + c.reset + '\n');
  }
}

export default ChessUI;
