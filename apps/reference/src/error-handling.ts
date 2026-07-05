/**
 * Error Handling & Recovery
 *
 * Provides clear, actionable error messages and recovery strategies
 * - Error classification (transient vs permanent)
 * - User-friendly error messages
 * - Suggested recovery actions
 * - Diagnostic information for debugging
 */

export class AiCommanderError extends Error {
  readonly category: 'initialization' | 'execution' | 'planning' | 'decision' | 'command' | 'unknown';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly recoverable: boolean;
  readonly suggestion?: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    category: 'initialization' | 'execution' | 'planning' | 'decision' | 'command' | 'unknown' = 'unknown',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    recoverable: boolean = false,
    suggestion?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AiCommanderError';
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;
    this.suggestion = suggestion;
    this.context = context;
    Object.setPrototypeOf(this, AiCommanderError.prototype);
  }

  toUserMessage(): string {
    const lines: string[] = [];

    lines.push(`Error: ${this.message}`);

    if (this.suggestion) {
      lines.push(`\nHow to fix: ${this.suggestion}`);
    }

    if (this.context && Object.keys(this.context).length > 0) {
      lines.push('\nContext:');
      for (const [key, value] of Object.entries(this.context)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }

  toLogEntry(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        name: this.name,
        message: this.message,
        category: this.category,
        severity: this.severity,
        recoverable: this.recoverable,
        suggestion: this.suggestion,
        context: this.context,
        stack: this.stack,
      },
      null,
      2
    );
  }
}

export class InitializationError extends AiCommanderError {
  constructor(message: string, suggestion?: string, context?: Record<string, unknown>) {
    super(message, 'initialization', 'high', false, suggestion, context);
  }
}

export class ExecutionError extends AiCommanderError {
  constructor(
    message: string,
    recoverable: boolean = false,
    suggestion?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'execution', recoverable ? 'medium' : 'high', recoverable, suggestion, context);
  }
}

export class PlanningError extends AiCommanderError {
  constructor(message: string, suggestion?: string, context?: Record<string, unknown>) {
    super(message, 'planning', 'medium', true, suggestion, context);
  }
}

export class DecisionError extends AiCommanderError {
  constructor(message: string, suggestion?: string, context?: Record<string, unknown>) {
    super(message, 'decision', 'medium', true, suggestion, context);
  }
}

export class CommandError extends AiCommanderError {
  constructor(message: string, recoverable: boolean = true, suggestion?: string, context?: Record<string, unknown>) {
    super(message, 'command', 'medium', recoverable, suggestion, context);
  }
}

export class ErrorHandler {
  private errors: AiCommanderError[] = [];
  private maxErrors = 100;

  record(error: AiCommanderError): void {
    this.errors.push(error);

    // Prevent unbounded growth
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  getErrors(category?: string): AiCommanderError[] {
    if (!category) return [...this.errors];
    return this.errors.filter((e) => e.category === category);
  }

  getLastError(): AiCommanderError | undefined {
    return this.errors[this.errors.length - 1];
  }

  clear(): void {
    this.errors = [];
  }

  hasRecoverableErrors(): boolean {
    return this.errors.some((e) => e.recoverable && e.severity !== 'critical');
  }

  hasCriticalErrors(): boolean {
    return this.errors.some((e) => e.severity === 'critical');
  }

  getSummary(): {
    readonly total: number;
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
    readonly recoverable: number;
  } {
    return {
      total: this.errors.length,
      critical: this.errors.filter((e) => e.severity === 'critical').length,
      high: this.errors.filter((e) => e.severity === 'high').length,
      medium: this.errors.filter((e) => e.severity === 'medium').length,
      low: this.errors.filter((e) => e.severity === 'low').length,
      recoverable: this.errors.filter((e) => e.recoverable).length,
    };
  }

  export(): string {
    return JSON.stringify(
      this.errors.map((e) => ({
        message: e.message,
        category: e.category,
        severity: e.severity,
        recoverable: e.recoverable,
        suggestion: e.suggestion,
        context: e.context,
        timestamp: new Date().toISOString(),
      })),
      null,
      2
    );
  }
}

export class UserFacingErrors {
  static gameAdapterInitializationFailed(): AiCommanderError {
    return new InitializationError(
      'Failed to initialize game adapter',
      'Make sure the game server is running and accessible. Check logs for connection details.',
      { component: 'game-adapter' }
    );
  }

  static worldStateEmpty(): AiCommanderError {
    return new ExecutionError(
      'World state is empty - no agents or resources detected',
      true,
      'The game may not have started yet. Wait for the game to initialize and try again.',
      { component: 'world-state' }
    );
  }

  static planGenerationFailed(reason: string): AiCommanderError {
    return new PlanningError(
      `Failed to generate plan: ${reason}`,
      'The planner could not find a valid sequence of actions. Try changing the goal or adjusting parameters.',
      { reason }
    );
  }

  static decisionSelectionFailed(): AiCommanderError {
    return new DecisionError(
      'No valid decision could be selected',
      'The decision engine could not find an appropriate action. This may be a temporary state.',
      { component: 'decision-engine' }
    );
  }

  static commandExecutionFailed(command: string, reason: string): AiCommanderError {
    return new CommandError(
      `Failed to execute command: ${command}. Reason: ${reason}`,
      true,
      'The command may not be valid for the current game state. The agent will try a different action.',
      { command, reason }
    );
  }

  static goalNotFeasible(goal: string): AiCommanderError {
    return new PlanningError(
      `Goal not feasible: ${goal}`,
      'This goal cannot be completed with current resources. The agent will switch to a different goal.',
      { goal }
    );
  }

  static resourceInsufficient(resource: string, required: number, available: number): AiCommanderError {
    return new ExecutionError(
      `Insufficient ${resource}: need ${required}, have ${available}`,
      true,
      `The agent will wait for more ${resource} to become available or switch to a different goal.`,
      { resource, required, available }
    );
  }

  static unknownError(error: unknown): AiCommanderError {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    return new AiCommanderError(
      `Unknown error occurred: ${message}`,
      'unknown',
      'high',
      false,
      'Check the logs for more information. If the problem persists, file a bug report.',
      { originalError: message, stack }
    );
  }
}

export class ValidationErrors {
  static invalidTargetCoordinates(x: number, y: number, bounds: { max: number }): AiCommanderError {
    return new InitializationError(
      `Invalid target coordinates: (${x}, ${y}). Must be within [0, ${bounds.max}].`,
      `Use coordinates between 0 and ${bounds.max}, inclusive.`,
      { x, y, maxCoordinate: bounds.max }
    );
  }

  static missionConfigInvalid(field: string, value: unknown, expected: string): AiCommanderError {
    return new InitializationError(
      `Invalid mission config: ${field} = ${value}. Expected: ${expected}.`,
      `Update the mission configuration and try again.`,
      { field, value, expected }
    );
  }

  static invalidGoalPriority(priority: number): AiCommanderError {
    return new InitializationError(
      `Invalid goal priority: ${priority}. Must be between 0.0 and 1.0.`,
      'Use a decimal value between 0 and 1 for goal priority.',
      { priority }
    );
  }
}

export class ConfigurationErrors {
  static configFileMissing(path: string): AiCommanderError {
    return new InitializationError(
      `Configuration file not found: ${path}`,
      `Create the file at ${path} or use default configuration.`,
      { path }
    );
  }

  static configFileInvalid(path: string, reason: string): AiCommanderError {
    return new InitializationError(
      `Configuration file invalid: ${path}. ${reason}`,
      'Fix the syntax errors in the configuration file and try again.',
      { path, reason }
    );
  }

  static configValueInvalid(key: string, value: unknown, expected: string): AiCommanderError {
    return new InitializationError(
      `Config value invalid: ${key} = ${value}. Expected: ${expected}.`,
      `Update the configuration and try again.`,
      { key, value, expected }
    );
  }
}
