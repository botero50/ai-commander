import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IPCBridgeImpl } from './ipc-bridge-impl.js';
import type { IPCMessage } from '../types/ipc-bridge.js';

describe('IPCBridgeImpl', () => {
  let bridge: IPCBridgeImpl;

  beforeEach(() => {
    bridge = new IPCBridgeImpl({
      host: 'localhost',
      port: 6557,
      connectTimeout: 5000,
    });
  });

  it('should initialize disconnected', () => {
    expect(bridge.isConnected).toBe(false);
  });

  it('should connect successfully', async () => {
    await bridge.connect();
    expect(bridge.isConnected).toBe(true);
  });

  it('should disconnect successfully', async () => {
    await bridge.connect();
    await bridge.disconnect();
    expect(bridge.isConnected).toBe(false);
  });

  it('should prevent send when disconnected', async () => {
    const message: IPCMessage = {
      type: 'test',
      data: {},
      timestamp: Date.now(),
    };

    await expect(bridge.send(message)).rejects.toThrow('not connected');
  });

  it('should allow send when connected', async () => {
    await bridge.connect();

    const message: IPCMessage = {
      type: 'test',
      data: { foo: 'bar' },
      timestamp: Date.now(),
    };

    await expect(bridge.send(message)).resolves.toBeUndefined();
  });

  it('should handle message callbacks', async () => {
    const callback = vi.fn();
    await bridge.connect();

    const unsubscribe = bridge.onMessage(callback);

    const message: IPCMessage = {
      type: 'test',
      data: {},
      timestamp: Date.now(),
    };

    await bridge.send(message);

    // Give async handler time to fire
    await new Promise(r => setTimeout(r, 10));

    expect(callback).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(message);

    unsubscribe();
  });

  it('should timeout on long requests', async () => {
    await bridge.connect();

    const message: IPCMessage = {
      type: 'slow',
      data: {},
      timestamp: Date.now(),
    };

    await expect(bridge.request(message, 100)).rejects.toThrow('timeout');
  });

  it('should resolve pending requests', async () => {
    await bridge.connect();

    const message: IPCMessage = {
      type: 'test',
      data: { key: 'value' },
      timestamp: Date.now(),
    };

    // Start request
    const requestPromise = bridge.request<{ success: boolean }>(message, 5000);

    // Simulate response
    setTimeout(() => {
      bridge.resolveRequest(0, { success: true });
    }, 50);

    const response = await requestPromise;
    expect(response).toEqual({ success: true });
  });

  it('should reject pending requests with error', async () => {
    await bridge.connect();

    const message: IPCMessage = {
      type: 'test',
      data: {},
      timestamp: Date.now(),
    };

    // Start request
    const requestPromise = bridge.request(message, 5000);

    // Simulate error response
    setTimeout(() => {
      bridge.rejectRequest(0, new Error('Request failed'));
    }, 50);

    await expect(requestPromise).rejects.toThrow('Request failed');
  });
});
