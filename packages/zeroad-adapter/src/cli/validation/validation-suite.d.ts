/**
 * Production Validation Suite
 *
 * Comprehensive testing of all MVP features.
 */
/**
 * Validation test result
 */
export interface ValidationResult {
    readonly name: string;
    readonly status: 'pass' | 'fail' | 'skip';
    readonly message: string;
    readonly duration: number;
    readonly metrics?: Record<string, number | string>;
}
/**
 * Validation scenario
 */
export interface ValidationScenario {
    readonly name: string;
    readonly description: string;
    readonly run: () => Promise<ValidationResult>;
}
/**
 * Validation report
 */
export interface ValidationReport {
    readonly timestamp: string;
    readonly version: string;
    readonly totalTests: number;
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly results: readonly ValidationResult[];
    readonly summary: string;
}
/**
 * Validation test runner
 */
export declare class ValidationSuite {
    private scenarios;
    /**
     * Register a validation scenario
     */
    register(scenario: ValidationScenario): void;
    /**
     * Run all validation scenarios
     */
    run(): Promise<ValidationReport>;
}
/**
 * Create default validation scenarios
 */
export declare function createDefaultScenarios(): ValidationScenario[];
//# sourceMappingURL=validation-suite.d.ts.map