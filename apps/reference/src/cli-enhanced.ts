/**
 * Enhanced CLI with improved user experience
 *
 * Features:
 * - Color-coded output
 * - Progress indicators
 * - Better error messages
 * - Accessible design (respects NO_COLOR)
 * - Helpful navigation hints
 * - Clear status reporting
 */

export interface CliColors {
  readonly reset: string;
  readonly bold: string;
  readonly dim: string;
  readonly red: string;
  readonly green: string;
  readonly yellow: string;
  readonly blue: string;
  readonly cyan: string;
  readonly magenta: string;
}

export class CliFormatter {
  private readonly colors: CliColors;
  private readonly useColor: boolean;

  constructor(useColor: boolean = !process.env.NO_COLOR) {
    this.useColor = useColor;
    this.colors = this.createColorSet(useColor);
  }

  private createColorSet(enabled: boolean): CliColors {
    if (!enabled) {
      return {
        reset: '',
        bold: '',
        dim: '',
        red: '',
        green: '',
        yellow: '',
        blue: '',
        cyan: '',
        magenta: '',
      };
    }

    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
    };
  }

  section(title: string): string {
    return `\n${this.colors.bold}${this.colors.cyan}═══ ${title} ═══${this.colors.reset}\n`;
  }

  success(message: string): string {
    return `${this.colors.green}✓${this.colors.reset} ${message}`;
  }

  error(message: string): string {
    return `${this.colors.red}✗${this.colors.reset} ${message}`;
  }

  warning(message: string): string {
    return `${this.colors.yellow}⚠${this.colors.reset} ${message}`;
  }

  info(message: string): string {
    return `${this.colors.cyan}ℹ${this.colors.reset} ${message}`;
  }

  progress(current: number, total: number, label: string = ''): string {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((percent / 100) * 20);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    const prefix = label ? `${label}: ` : '';
    const percentage = `${percent.toString().padStart(3)}%`;

    return `${prefix}${this.colors.cyan}${bar}${this.colors.reset} ${percentage}`;
  }

  metric(label: string, value: string | number, unit: string = ''): string {
    const unitStr = unit ? ` ${unit}` : '';
    return `${label.padEnd(25)} ${this.colors.bold}${value}${this.colors.reset}${unitStr}`;
  }

  hint(message: string): string {
    return `${this.colors.dim}💡 ${message}${this.colors.reset}`;
  }

  divider(): string {
    return this.colors.dim + '─'.repeat(60) + this.colors.reset;
  }

  code(text: string): string {
    return `${this.colors.magenta}\`${text}\`${this.colors.reset}`;
  }

  highlight(text: string): string {
    return `${this.colors.bold}${this.colors.yellow}${text}${this.colors.reset}`;
  }

  label(text: string): string {
    return `${this.colors.bold}${text}${this.colors.reset}`;
  }

  formatMetricTable(metrics: Record<string, string | number>): string {
    const lines: string[] = [];
    const maxLabelLen = Math.max(...Object.keys(metrics).map((k) => k.length));

    for (const [label, value] of Object.entries(metrics)) {
      lines.push(this.metric(label, value));
    }

    return lines.join('\n');
  }

  formatErrorDetails(error: unknown): string {
    const lines: string[] = [];

    if (error instanceof Error) {
      lines.push(this.error(error.message));
      if (error.stack) {
        lines.push(this.colors.dim + error.stack + this.colors.reset);
      }
    } else {
      lines.push(this.error(String(error)));
    }

    return lines.join('\n');
  }
}

export class ProgressIndicator {
  private current = 0;
  private total = 0;
  private label = '';
  private formatter: CliFormatter;
  private lastUpdate = 0;
  private updateInterval = 100; // ms

  constructor(total: number, label: string = '', useColor: boolean = !process.env.NO_COLOR) {
    this.total = total;
    this.label = label;
    this.formatter = new CliFormatter(useColor);
  }

  update(current: number): void {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;

    this.current = current;
    this.lastUpdate = now;

    const progress = this.formatter.progress(this.current, this.total, this.label);
    process.stdout.write(`\r${progress}`);
  }

  complete(): void {
    this.current = this.total;
    const progress = this.formatter.progress(this.current, this.total, this.label);
    console.log(`\r${progress}`);
  }

  reset(total: number, label: string = ''): void {
    this.current = 0;
    this.total = total;
    this.label = label;
    this.lastUpdate = 0;
  }
}

export class InteractivePrompt {
  private formatter: CliFormatter;

  constructor(useColor: boolean = !process.env.NO_COLOR) {
    this.formatter = new CliFormatter(useColor);
  }

  confirm(message: string, defaultValue: boolean = true): boolean {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    const prompt = `${message} [${defaultStr}]: `;

    process.stdout.write(prompt);

    // In CLI context, we can't actually wait for user input
    // Return the default value
    return defaultValue;
  }

  showHelp(title: string, options: Record<string, string>): void {
    console.log(this.formatter.section(title));

    for (const [flag, description] of Object.entries(options)) {
      console.log(`  ${this.formatter.code(flag)}`);
      console.log(`    ${description}\n`);
    }
  }

  showExample(title: string, command: string): void {
    console.log(this.formatter.section(title));
    console.log(`  ${this.formatter.code(command)}\n`);
  }
}

export class LogLevel {
  static readonly DEBUG = 0;
  static readonly INFO = 1;
  static readonly WARN = 2;
  static readonly ERROR = 3;
  static readonly SILENT = 4;
}

export class Logger {
  private level: number;
  private formatter: CliFormatter;
  private prefix: string;

  constructor(
    prefix: string = 'AI Commander',
    level: number = LogLevel.INFO,
    useColor: boolean = !process.env.NO_COLOR
  ) {
    this.prefix = prefix;
    this.level = level;
    this.formatter = new CliFormatter(useColor);
  }

  setLevel(level: number): void {
    this.level = level;
  }

  debug(message: string): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[${this.prefix}] ${this.formatter.colors.dim}${message}${this.formatter.colors.reset}`);
    }
  }

  info(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${this.prefix}] ${this.formatter.info(message)}`);
    }
  }

  warn(message: string): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.prefix}] ${this.formatter.warning(message)}`);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${this.prefix}] ${this.formatter.error(message)}`);
      if (error) {
        console.error(this.formatter.formatErrorDetails(error));
      }
    }
  }

  success(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${this.prefix}] ${this.formatter.success(message)}`);
    }
  }

  section(title: string): void {
    console.log(this.formatter.section(title));
  }

  divider(): void {
    console.log(this.formatter.divider());
  }
}

export class AccessibilityHelper {
  /**
   * Format output that respects accessibility settings
   */
  static formatForScreen(text: string): string {
    // Remove ANSI codes if NO_COLOR is set
    if (process.env.NO_COLOR) {
      return text.replace(/\x1b\[[0-9;]*m/g, '');
    }
    return text;
  }

  /**
   * Check if output should use colors
   */
  static supportsColor(): boolean {
    const noColor = process.env.NO_COLOR;
    const forceColor = process.env.FORCE_COLOR;

    if (noColor) return false;
    if (forceColor) return true;

    // Check terminal capabilities
    const term = process.env.TERM;
    if (!term || term === 'dumb') return false;

    return process.stdout.isTTY ?? false;
  }

  /**
   * Format text with minimal reliance on color
   */
  static formatAccessible(
    text: string,
    label: string,
    importance: 'low' | 'medium' | 'high'
  ): string {
    const prefix = importance === 'high' ? '!!!' : importance === 'medium' ? '!!' : ' ';
    return `[${prefix}] ${label}: ${text}`;
  }
}
