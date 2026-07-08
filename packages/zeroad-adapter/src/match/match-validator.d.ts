import { Match } from './match.js';
import { ExecutionMonitor, StateMetrics } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';
export interface ValidationRule {
    name: string;
    validate: () => boolean;
    severity: 'error' | 'warning' | 'info';
}
export interface ValidationResult {
    valid: boolean;
    timestamp: number;
    matchId: string;
    issues: ValidationIssue[];
    passedChecks: number;
    failedChecks: number;
}
export interface ValidationIssue {
    ruleName: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
}
export declare class MatchValidator {
    private match;
    private monitor;
    private stateMetrics;
    private logger;
    private rules;
    constructor(match: Match, monitor: ExecutionMonitor, stateMetrics: StateMetrics, logger: Logger);
    private initializeRules;
    addRule(rule: ValidationRule): void;
    validate(): ValidationResult;
    getSummary(): string;
    getRuleCount(): number;
}
//# sourceMappingURL=match-validator.d.ts.map