import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationSuite, createDefaultScenarios } from './validation-suite.js';
describe('ValidationSuite', () => {
    let suite;
    beforeEach(() => {
        suite = new ValidationSuite();
    });
    describe('registration and execution', () => {
        it('should register scenarios', () => {
            const scenario = {
                name: 'Test Scenario',
                description: 'A test scenario',
                run: async () => ({
                    name: 'Test',
                    status: 'pass',
                    message: 'Success',
                    duration: 100,
                }),
            };
            suite.register(scenario);
            // Just verify no error is thrown
            expect(true).toBe(true);
        });
        it('should handle passing tests', async () => {
            suite.register({
                name: 'Pass Test',
                description: 'Should pass',
                run: async () => ({
                    name: 'Pass Test',
                    status: 'pass',
                    message: 'Passed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.passed).toBe(1);
            expect(report.failed).toBe(0);
        });
        it('should handle failing tests', async () => {
            suite.register({
                name: 'Fail Test',
                description: 'Should fail',
                run: async () => ({
                    name: 'Fail Test',
                    status: 'fail',
                    message: 'Failed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.failed).toBe(1);
            expect(report.passed).toBe(0);
        });
        it('should handle skipped tests', async () => {
            suite.register({
                name: 'Skip Test',
                description: 'Should skip',
                run: async () => ({
                    name: 'Skip Test',
                    status: 'skip',
                    message: 'Skipped',
                    duration: 10,
                }),
            });
            const report = await suite.run();
            expect(report.skipped).toBe(1);
        });
        it('should handle mixed results', async () => {
            suite.register({
                name: 'Pass Test',
                description: 'Passes',
                run: async () => ({
                    name: 'Pass',
                    status: 'pass',
                    message: 'Passed',
                    duration: 50,
                }),
            });
            suite.register({
                name: 'Fail Test',
                description: 'Fails',
                run: async () => ({
                    name: 'Fail',
                    status: 'fail',
                    message: 'Failed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.passed).toBe(1);
            expect(report.failed).toBe(1);
            expect(report.totalTests).toBe(2);
        });
    });
    describe('report generation', () => {
        it('should generate a report with metadata', async () => {
            suite.register({
                name: 'Test',
                description: 'Test',
                run: async () => ({
                    name: 'Test',
                    status: 'pass',
                    message: 'Passed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.timestamp).toBeDefined();
            expect(report.version).toBe('1.0.0');
            expect(report.summary).toBeDefined();
        });
        it('should include metrics in results', async () => {
            suite.register({
                name: 'Test with Metrics',
                description: 'Test',
                run: async () => ({
                    name: 'Test',
                    status: 'pass',
                    message: 'Passed',
                    duration: 50,
                    metrics: {
                        'key1': 'value1',
                        'key2': 42,
                    },
                }),
            });
            const report = await suite.run();
            expect(report.results[0].metrics).toBeDefined();
            expect(report.results[0].metrics?.key1).toBe('value1');
        });
        it('should calculate correct summary for all passed', async () => {
            suite.register({
                name: 'Test 1',
                description: 'Test',
                run: async () => ({
                    name: 'Test 1',
                    status: 'pass',
                    message: 'Passed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.summary).toContain('All tests passed');
        });
        it('should calculate correct summary for failures', async () => {
            suite.register({
                name: 'Test 1',
                description: 'Test',
                run: async () => ({
                    name: 'Test 1',
                    status: 'fail',
                    message: 'Failed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.summary).toContain('test(s) failed');
        });
    });
    describe('default scenarios', () => {
        it('should create 5 default scenarios', () => {
            const scenarios = createDefaultScenarios();
            expect(scenarios).toHaveLength(5);
        });
        it('should have Ollama vs Ollama scenario', () => {
            const scenarios = createDefaultScenarios();
            const scenario = scenarios.find((s) => s.name.includes('Ollama vs Ollama'));
            expect(scenario).toBeDefined();
        });
        it('should have tournament scenario', () => {
            const scenarios = createDefaultScenarios();
            const scenario = scenarios.find((s) => s.name.includes('Tournament'));
            expect(scenario).toBeDefined();
        });
        it('should have replay export scenario', () => {
            const scenarios = createDefaultScenarios();
            const scenario = scenarios.find((s) => s.name.includes('Replay'));
            expect(scenario).toBeDefined();
        });
        it('should have graceful shutdown scenario', () => {
            const scenarios = createDefaultScenarios();
            const scenario = scenarios.find((s) => s.name.includes('Shutdown'));
            expect(scenario).toBeDefined();
        });
        it('should have error recovery scenario', () => {
            const scenarios = createDefaultScenarios();
            const scenario = scenarios.find((s) => s.name.includes('Error'));
            expect(scenario).toBeDefined();
        });
        it('should all be runnable', async () => {
            const scenarios = createDefaultScenarios();
            for (const scenario of scenarios) {
                const result = await scenario.run();
                expect(result.status).toBeDefined();
                expect(['pass', 'fail', 'skip']).toContain(result.status);
            }
        });
    });
    describe('error handling', () => {
        it('should handle scenario errors', async () => {
            suite.register({
                name: 'Error Test',
                description: 'Should error',
                run: async () => {
                    throw new Error('Test error');
                },
            });
            const report = await suite.run();
            expect(report.failed).toBe(1);
            expect(report.results[0].message).toContain('Error');
        });
        it('should continue after error', async () => {
            suite.register({
                name: 'Error Test',
                description: 'Errors',
                run: async () => {
                    throw new Error('First error');
                },
            });
            suite.register({
                name: 'Pass Test',
                description: 'Passes',
                run: async () => ({
                    name: 'Pass',
                    status: 'pass',
                    message: 'Passed',
                    duration: 50,
                }),
            });
            const report = await suite.run();
            expect(report.totalTests).toBe(2);
            expect(report.failed).toBe(1);
            expect(report.passed).toBe(1);
        });
    });
});
//# sourceMappingURL=validation-suite.test.js.map