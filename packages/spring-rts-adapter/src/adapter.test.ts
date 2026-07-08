import { describe, it, expect, beforeEach } from 'vitest';
import { SpringRTSAdapter } from './adapter.js';

describe('SpringRTSAdapter', () => {
  let adapter: SpringRTSAdapter;

  beforeEach(() => {
    adapter = new SpringRTSAdapter();
  });

  it('should initialize with default config', () => {
    expect(adapter.adapterId).toBe('spring-rts-adapter');
    expect(adapter.displayName).toBe('Spring RTS Adapter');
  });

  it('should initialize with custom config', () => {
    const customAdapter = new SpringRTSAdapter({
      port: 9999,
      launchTimeout: 60000,
    });

    const config = customAdapter.getConfig();
    expect(config.port).toBe(9999);
    expect(config.launchTimeout).toBe(60000);
  });

  it('should have correct capabilities', () => {
    expect(adapter.capabilities.supportsMultipleAgents).toBe(true);
    expect(adapter.capabilities.supportsDeterministicMode).toBe(true);
    expect(adapter.capabilities.supportsReplay).toBe(true);
  });

  it('should allow initialization', async () => {
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('should prevent double initialization', async () => {
    await adapter.initialize();
    // Second call should return without error
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('should reject session creation before initialization', async () => {
    const uninitializedAdapter = new SpringRTSAdapter();
    await expect(uninitializedAdapter.createSession()).rejects.toThrow(
      'Adapter not initialized'
    );
  });

  it('should provide adapter info', async () => {
    const info = await adapter.getAdapterInfo();
    expect(info.version).toBe('1.0.0');
    expect(info.gameVersion).toBe('Spring Engine 104+');
  });

  it('should allow shutdown', async () => {
    await adapter.initialize();
    await expect(adapter.shutdown()).resolves.toBeUndefined();
  });

  it('should sanitize config in logs', () => {
    const config = {
      gameExecutablePath: '/path/to/spring',
      gameDataPath: '/path/to/data',
      port: 6557,
      host: 'localhost',
      launchTimeout: 30000,
      shutdownTimeout: 10000,
      logLevel: 'info' as const,
      deterministicMode: true,
      maxPlayers: 2,
      aiTimeout: 5000,
    };

    const sanitized = (adapter as any).sanitizeConfig(config);
    expect(sanitized.gameExecutablePath).toBe('<hidden>');
    expect(sanitized.gameDataPath).toBe('<hidden>');
    expect(sanitized.port).toBe(6557);
  });
});
