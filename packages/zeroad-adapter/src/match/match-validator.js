export class MatchValidator {
    match;
    monitor;
    stateMetrics;
    logger;
    rules = [];
    constructor(match, monitor, stateMetrics, logger) {
        this.match = match;
        this.monitor = monitor;
        this.stateMetrics = stateMetrics;
        this.logger = logger;
        this.initializeRules();
    }
    initializeRules() {
        // Match must be active
        this.addRule({
            name: 'Match Active',
            validate: () => this.match.isActive(),
            severity: 'error',
        });
        // Must have recorded observations
        this.addRule({
            name: 'Observations Recorded',
            validate: () => this.monitor.getMetrics().observationCount > 0,
            severity: 'error',
        });
        // Should have minimal errors
        this.addRule({
            name: 'No Critical Errors',
            validate: () => this.monitor.getMetrics().errorCount === 0,
            severity: 'error',
        });
        // World state should be healthy
        this.addRule({
            name: 'Monitor Health',
            validate: () => this.monitor.isHealthy(),
            severity: 'warning',
        });
        // Should have recorded state snapshots
        this.addRule({
            name: 'State Snapshots Recorded',
            validate: () => {
                const snapshots = this.stateMetrics.getAllSnapshots();
                return snapshots.length > 0;
            },
            severity: 'warning',
        });
        // Match metadata valid
        this.addRule({
            name: 'Metadata Valid',
            validate: () => {
                const metadata = this.match.getMetadata();
                return !!(metadata.matchId && metadata.status && metadata.createdAt > 0);
            },
            severity: 'error',
        });
        // State metrics valid
        this.addRule({
            name: 'State Metrics Valid',
            validate: () => {
                const metrics = this.stateMetrics.getMetrics();
                return metrics.snapshotCount >= 0 && metrics.timeSpanMs >= 0;
            },
            severity: 'warning',
        });
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    validate() {
        const issues = [];
        let passedChecks = 0;
        let failedChecks = 0;
        for (const rule of this.rules) {
            try {
                const passed = rule.validate();
                if (passed) {
                    passedChecks++;
                    this.logger.debug(`Validation passed: ${rule.name}`);
                }
                else {
                    failedChecks++;
                    issues.push({
                        ruleName: rule.name,
                        severity: rule.severity,
                        message: `Validation failed: ${rule.name}`,
                        timestamp: Date.now(),
                    });
                    this.logger.warn(`Validation failed: ${rule.name}`, {
                        matchId: this.match.matchId,
                    });
                }
            }
            catch (err) {
                failedChecks++;
                issues.push({
                    ruleName: rule.name,
                    severity: 'error',
                    message: `Validation error: ${rule.name} - ${err instanceof Error ? err.message : String(err)}`,
                    timestamp: Date.now(),
                });
                this.logger.error(`Validation error in ${rule.name}`, err);
            }
        }
        const valid = issues.filter((i) => i.severity === 'error').length === 0;
        const result = {
            valid,
            timestamp: Date.now(),
            matchId: this.match.matchId,
            issues,
            passedChecks,
            failedChecks,
        };
        this.logger.info('Match validation complete', {
            matchId: this.match.matchId,
            valid,
            passed: passedChecks,
            failed: failedChecks,
        });
        return result;
    }
    getSummary() {
        const result = this.validate();
        const errorCount = result.issues.filter((i) => i.severity === 'error').length;
        const warningCount = result.issues.filter((i) => i.severity === 'warning').length;
        return `Match ${result.matchId}: ${result.valid ? 'VALID' : 'INVALID'} (${result.passedChecks} passed, ${result.failedChecks} failed, ${errorCount} errors, ${warningCount} warnings)`;
    }
    getRuleCount() {
        return this.rules.length;
    }
}
//# sourceMappingURL=match-validator.js.map