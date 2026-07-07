/**
 * Production validation framework for autonomous RTS gameplay
 */
export interface HealthCheck {
    readonly name: string;
    readonly status: 'pass' | 'fail' | 'warn';
    readonly message: string;
    readonly timestamp: number;
}
export interface IntegrationTest {
    readonly name: string;
    readonly passed: boolean;
    readonly durationMs: number;
    readonly details: string;
    readonly timestamp: number;
}
export interface ReleaseReadinessReport {
    readonly timestamp: number;
    readonly readinessScore: number;
    readonly canRelease: boolean;
    readonly healthChecks: ReadonlyArray<HealthCheck>;
    readonly integrationTests: ReadonlyArray<IntegrationTest>;
    readonly systemMetrics: SystemMetrics;
    readonly summary: ReleaseSummary;
}
export interface SystemMetrics {
    readonly uptime: number;
    readonly totalMatches: number;
    readonly totalTicks: number;
    readonly avgMatchDuration: number;
    readonly commandThroughput: number;
    readonly errorRate: number;
    readonly memoryUsageMb: number;
    readonly cpuUsagePercent: number;
}
export interface ReleaseSummary {
    readonly healthStatus: 'healthy' | 'degraded' | 'critical';
    readonly criticalIssues: number;
    readonly warningCount: number;
    readonly passedChecks: number;
    readonly failedChecks: number;
    readonly recommendedActions: ReadonlyArray<string>;
}
/**
 * Production validator for release readiness
 */
export declare class ProductionValidator {
    private startTime;
    private matchCount;
    private tickCount;
    private commandCount;
    private errorCount;
    private healthChecks;
    private integrationTests;
    recordMatch(durationTicks: number): void;
    recordCommand(): void;
    recordError(): void;
    runHealthCheck(name: string, checkFn: () => boolean, warningCondition?: () => boolean): HealthCheck;
    runIntegrationTest(name: string, testFn: () => Promise<boolean> | boolean): Promise<IntegrationTest>;
    private calculateSystemMetrics;
    generateReport(): ReleaseReadinessReport;
    generateReportText(): string;
    reset(): void;
}
/**
 * Global production validator instance
 */
export declare const globalValidator: ProductionValidator;
//# sourceMappingURL=production-validator.d.ts.map