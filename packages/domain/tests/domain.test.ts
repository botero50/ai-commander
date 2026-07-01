import { describe, it, expect } from 'vitest';
import type { Entity, Agent } from '../src/index.js';

describe('domain', () => {
  it('should export core types', () => {
    const entity: Entity = {
      id: 'entity-1',
      type: 'game-object',
    };

    expect(entity.id).toBe('entity-1');
    expect(entity.type).toBe('game-object');
  });

  it('should support agent type', () => {
    const agent: Agent = {
      id: 'agent-1',
      type: 'agent',
      name: 'TestAgent',
    };

    expect(agent.id).toBe('agent-1');
    expect(agent.type).toBe('agent');
    expect(agent.name).toBe('TestAgent');
  });
});
