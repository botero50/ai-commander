import { describe, it, expect } from 'vitest';
import { ReferenceApp } from '../src/app.ts';
import { testPlanner, testDecisionEngine } from './test-doubles.js';

describe.skip('Reference Application', () => {
  it('should initialize successfully', async () => {
    const app = new ReferenceApp(testPlanner, testDecisionEngine);
    await app.initialize();
    await app.shutdown();
  });

  it('should execute a tick', async () => {
    const app = new ReferenceApp(testPlanner, testDecisionEngine);
    await app.initialize();
    await app.run();
    await app.shutdown();
  });

  it('should validate framework initialization', async () => {
    const app = new ReferenceApp(testPlanner, testDecisionEngine);
    await app.initialize();

    // Verify the app initialized without errors
    // (If it didn't, initialize() would have thrown)

    await app.shutdown();
  });

  it('should validate game adapter initialization', async () => {
    const app = new ReferenceApp(testPlanner, testDecisionEngine);

    // This should not throw
    await expect(app.initialize()).resolves.toBeUndefined();

    // This should not throw
    await expect(app.run()).resolves.toBeUndefined();

    // This should not throw
    await expect(app.shutdown()).resolves.toBeUndefined();
  });

  it('should reject run without initialization', async () => {
    const app = new ReferenceApp(testPlanner, testDecisionEngine);

    // run() without initialize() should throw
    await expect(app.run()).rejects.toThrow('not initialized');
  });

  it('should handle multiple shutdown calls gracefully', async () => {
    const app = new ReferenceApp(testPlanner, testDecisionEngine);
    await app.initialize();
    await app.shutdown();

    // Second shutdown should not throw
    await expect(app.shutdown()).resolves.toBeUndefined();
  });
});
