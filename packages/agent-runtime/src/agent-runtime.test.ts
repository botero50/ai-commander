/**
 * Agent Runtime Tests
 *
 * Tests for AI agent execution environment
 * - Agent initialization and loading
 * - Message passing and communication
 * - Execution context management
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface AgentConfig {
  name: string;
  type: 'decision' | 'analysis' | 'learning';
  enabled: boolean;
}

interface Message {
  from: string;
  to: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

interface AgentContext {
  agentId: string;
  sessionId: string;
  timeoutMs: number;
  maxRetries: number;
}

class MockAgentRuntime {
  private agents: Map<string, AgentConfig> = new Map();
  private messageQueue: Message[] = [];
  private context: AgentContext;
  private isRunning = false;

  constructor(context: AgentContext) {
    this.context = context;
  }

  loadAgent(config: AgentConfig): void {
    this.agents.set(config.name, config);
  }

  unloadAgent(name: string): void {
    this.agents.delete(name);
  }

  startRuntime(): void {
    this.isRunning = true;
  }

  stopRuntime(): void {
    this.isRunning = false;
  }

  sendMessage(message: Message): boolean {
    if (!this.isRunning) return false;

    message.timestamp = Date.now();
    this.messageQueue.push(message);
    return true;
  }

  getMessages(agentName: string): Message[] {
    return this.messageQueue.filter(m => m.to === agentName);
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  getAgent(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getMessageCount(): number {
    return this.messageQueue.length;
  }

  clearMessages(): void {
    this.messageQueue = [];
  }

  isHealthy(): boolean {
    return this.isRunning && this.getAgentCount() > 0;
  }

  executeAgent(name: string, input: unknown): { success: boolean; output: unknown } {
    const agent = this.agents.get(name);
    if (!agent || !agent.enabled || !this.isRunning) {
      return { success: false, output: null };
    }

    return {
      success: true,
      output: { agentName: name, input, processedAt: Date.now() },
    };
  }

  getContext(): AgentContext {
    return { ...this.context };
  }
}

describe('AgentRuntime', () => {
  let runtime: MockAgentRuntime;
  let context: AgentContext;

  beforeEach(() => {
    context = {
      agentId: 'runtime-1',
      sessionId: 'session-1',
      timeoutMs: 5000,
      maxRetries: 3,
    };
    runtime = new MockAgentRuntime(context);
  });

  describe('Runtime Lifecycle', () => {
    it('should initialize with context', () => {
      const ctx = runtime.getContext();
      expect(ctx.agentId).toBe('runtime-1');
      expect(ctx.sessionId).toBe('session-1');
    });

    it('should start runtime', () => {
      runtime.startRuntime();
      expect(runtime['isRunning']).toBe(true);
    });

    it('should stop runtime', () => {
      runtime.startRuntime();
      runtime.stopRuntime();
      expect(runtime['isRunning']).toBe(false);
    });

    it('should report health status', () => {
      expect(runtime.isHealthy()).toBe(false); // No agents yet

      const config: AgentConfig = {
        name: 'agent1',
        type: 'decision',
        enabled: true,
      };
      runtime.loadAgent(config);
      runtime.startRuntime();

      expect(runtime.isHealthy()).toBe(true);
    });
  });

  describe('Agent Management', () => {
    it('should load agent', () => {
      const config: AgentConfig = {
        name: 'analyzer',
        type: 'analysis',
        enabled: true,
      };

      runtime.loadAgent(config);
      expect(runtime.getAgentCount()).toBe(1);
    });

    it('should load multiple agents', () => {
      const agents: AgentConfig[] = [
        { name: 'agent1', type: 'decision', enabled: true },
        { name: 'agent2', type: 'analysis', enabled: true },
        { name: 'agent3', type: 'learning', enabled: false },
      ];

      agents.forEach(a => runtime.loadAgent(a));
      expect(runtime.getAgentCount()).toBe(3);
    });

    it('should unload agent', () => {
      const config: AgentConfig = {
        name: 'temporary',
        type: 'decision',
        enabled: true,
      };

      runtime.loadAgent(config);
      expect(runtime.getAgentCount()).toBe(1);

      runtime.unloadAgent('temporary');
      expect(runtime.getAgentCount()).toBe(0);
    });

    it('should retrieve agent config', () => {
      const config: AgentConfig = {
        name: 'detector',
        type: 'analysis',
        enabled: true,
      };

      runtime.loadAgent(config);
      const retrieved = runtime.getAgent('detector');

      expect(retrieved).toEqual(config);
    });

    it('should list all agents', () => {
      const configs: AgentConfig[] = [
        { name: 'a1', type: 'decision', enabled: true },
        { name: 'a2', type: 'analysis', enabled: true },
      ];

      configs.forEach(c => runtime.loadAgent(c));
      const all = runtime.getAllAgents();

      expect(all).toHaveLength(2);
      expect(all.map(a => a.name)).toContain('a1');
      expect(all.map(a => a.name)).toContain('a2');
    });
  });

  describe('Message Passing', () => {
    it('should send message when running', () => {
      runtime.startRuntime();
      const message: Message = {
        from: 'agent1',
        to: 'agent2',
        type: 'decision',
        payload: { action: 'move' },
        timestamp: 0,
      };

      const sent = runtime.sendMessage(message);
      expect(sent).toBe(true);
      expect(runtime.getMessageCount()).toBe(1);
    });

    it('should not send message when stopped', () => {
      const message: Message = {
        from: 'agent1',
        to: 'agent2',
        type: 'decision',
        payload: {},
        timestamp: 0,
      };

      const sent = runtime.sendMessage(message);
      expect(sent).toBe(false);
    });

    it('should retrieve messages for agent', () => {
      runtime.startRuntime();

      const msg1: Message = {
        from: 'a1',
        to: 'a2',
        type: 'info',
        payload: {},
        timestamp: 0,
      };
      const msg2: Message = {
        from: 'a3',
        to: 'a2',
        type: 'info',
        payload: {},
        timestamp: 0,
      };

      runtime.sendMessage(msg1);
      runtime.sendMessage(msg2);

      const messagesForA2 = runtime.getMessages('a2');
      expect(messagesForA2).toHaveLength(2);
    });

    it('should queue multiple messages', () => {
      runtime.startRuntime();

      for (let i = 0; i < 10; i++) {
        runtime.sendMessage({
          from: 'sender',
          to: 'receiver',
          type: 'data',
          payload: { id: i },
          timestamp: 0,
        });
      }

      expect(runtime.getMessageCount()).toBe(10);
    });

    it('should clear message queue', () => {
      runtime.startRuntime();
      runtime.sendMessage({
        from: 'a1',
        to: 'a2',
        type: 'test',
        payload: {},
        timestamp: 0,
      });

      expect(runtime.getMessageCount()).toBeGreaterThan(0);
      runtime.clearMessages();
      expect(runtime.getMessageCount()).toBe(0);
    });
  });

  describe('Agent Execution', () => {
    it('should execute enabled agent', () => {
      runtime.startRuntime();
      runtime.loadAgent({
        name: 'executor',
        type: 'decision',
        enabled: true,
      });

      const result = runtime.executeAgent('executor', { task: 'test' });
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should not execute disabled agent', () => {
      runtime.startRuntime();
      runtime.loadAgent({
        name: 'disabled',
        type: 'decision',
        enabled: false,
      });

      const result = runtime.executeAgent('disabled', {});
      expect(result.success).toBe(false);
    });

    it('should not execute non-existent agent', () => {
      runtime.startRuntime();
      const result = runtime.executeAgent('nonexistent', {});
      expect(result.success).toBe(false);
    });

    it('should return agent output', () => {
      runtime.startRuntime();
      runtime.loadAgent({
        name: 'processor',
        type: 'analysis',
        enabled: true,
      });

      const input = { data: 'test' };
      const result = runtime.executeAgent('processor', input);

      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty('agentName');
      expect(result.output).toHaveProperty('input');
    });
  });

  describe('Context Management', () => {
    it('should provide execution context', () => {
      const ctx = runtime.getContext();

      expect(ctx.agentId).toBeDefined();
      expect(ctx.sessionId).toBeDefined();
      expect(ctx.timeoutMs).toBe(5000);
      expect(ctx.maxRetries).toBe(3);
    });

    it('should maintain context throughout lifecycle', () => {
      const ctx1 = runtime.getContext();
      runtime.startRuntime();
      const ctx2 = runtime.getContext();

      expect(ctx1.agentId).toBe(ctx2.agentId);
      expect(ctx1.sessionId).toBe(ctx2.sessionId);
    });
  });

  describe('Performance', () => {
    it('should load many agents efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        runtime.loadAgent({
          name: `agent-${i}`,
          type: 'decision',
          enabled: i % 2 === 0,
        });
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(runtime.getAgentCount()).toBe(100);
    });

    it('should handle rapid messaging', () => {
      runtime.startRuntime();

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        runtime.sendMessage({
          from: `s${i % 10}`,
          to: `r${i % 10}`,
          type: 'msg',
          payload: { seq: i },
          timestamp: 0,
        });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
      expect(runtime.getMessageCount()).toBe(1000);
    });

    it('should execute agents efficiently', () => {
      runtime.startRuntime();

      for (let i = 0; i < 10; i++) {
        runtime.loadAgent({
          name: `exec-${i}`,
          type: 'decision',
          enabled: true,
        });
      }

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        runtime.executeAgent(`exec-${i % 10}`, { iteration: i });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });
  });
});
