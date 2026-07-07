import type { AgentConfiguration, AgentRuntime, AgentRuntimeState } from './types/agent-runtime.js';
import type { AgentMetrics } from './types/agent-metrics.js';
import type { Agent } from '@ai-commander/domain';
import { AgentStatus } from './types/agent-status.js';
export declare class DefaultAgentRuntime implements AgentRuntime {
    readonly agentId: Agent;
    private currentStatus;
    private metricsCollector;
    private config;
    private active;
    private paused;
    constructor(config: AgentConfiguration);
    get status(): AgentStatus;
    get metrics(): AgentMetrics;
    initialize(): Promise<void>;
    tick(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    shutdown(): Promise<void>;
    getStatus(): AgentStatus;
    getMetrics(): AgentMetrics;
    getRuntimeState(): AgentRuntimeState;
}
export declare function createAgentRuntime(config: AgentConfiguration): AgentRuntime;
//# sourceMappingURL=agent-runtime.d.ts.map