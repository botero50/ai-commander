"use strict";
/**
 * AI Loop Orchestrator
 *
 * Connects the complete loop:
 * Observe → WorldState → Brain Decision → Execute → Observe
 *
 * Measures:
 * - Latency per tick
 * - Observation quality
 * - Command execution success
 * - Brain responsiveness
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILoopOrchestrator = exports.DummyBrain = void 0;
/**
 * Simple test brain that makes random moves
 */
class DummyBrain {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async decide(worldState) {
        // Just observe, don't act
        return {
            playerID: 1,
            commands: [],
            reasoning: 'Dummy brain - observing only',
            timestamp: new Date(),
        };
    }
}
exports.DummyBrain = DummyBrain;
class AILoopOrchestrator {
    client;
    observationReceiver;
    commandExecutor;
    worldStateMapper;
    brain;
    logger;
    state = {
        running: false,
        currentTick: 0,
        totalTicks: 0,
        metrics: [],
        startTime: new Date(),
    };
    constructor(client, observationReceiver, commandExecutor, worldStateMapper, brain, logger) {
        this.client = client;
        this.observationReceiver = observationReceiver;
        this.commandExecutor = commandExecutor;
        this.worldStateMapper = worldStateMapper;
        this.brain = brain;
        this.logger = logger;
    }
    /**
     * Run the complete AI loop for N ticks
     *
     * Non-blocking mode: While brain decides, advance game with empty ticks.
     * Only decision ticks count toward the N ticks limit.
     */
    async runLoop(ticks) {
        this.state.running = true;
        this.state.currentTick = 0;
        this.state.totalTicks = ticks;
        this.state.startTime = new Date();
        this.state.metrics = [];
        try {
            // Initialize brain
            if (this.brain.initialize) {
                await this.brain.initialize();
            }
            let decisionCount = 0;
            let lastDecision = null;
            let lastRawState = null;
            let lastWorldState = null;
            // Main loop - advance game continuously
            while (decisionCount < ticks) {
                // Step 1: Collect observation (no decision tick yet)
                const obsStart = Date.now();
                const rawState = await this.client.step(lastDecision ? [] : []);
                const obsTime = Date.now() - obsStart;
                // Step 2: If last decision finished, execute it
                let decisionMetrics = null;
                if (lastDecision && lastRawState && lastWorldState) {
                    try {
                        const decision = await lastDecision;
                        decisionMetrics = await this.executeDecision(lastRawState, lastWorldState, decision, obsTime);
                        this.state.metrics.push(decisionMetrics);
                        decisionCount++;
                        this.state.currentTick = decisionMetrics.tick;
                        lastDecision = null;
                        // Log progress
                        if (decisionCount % Math.max(1, Math.floor(ticks / 10)) === 0) {
                            this.logger.info(`AI Loop progress: ${decisionCount}/${ticks} ticks`, {
                                avgLatency: this.getAverageLatency(),
                            });
                        }
                    }
                    catch (error) {
                        this.logger.error('Failed to execute decision', { error: String(error) });
                        lastDecision = null;
                    }
                }
                // Step 3: If no decision pending, start a new one
                if (!lastDecision && decisionCount < ticks) {
                    // Validate observation
                    const validation = await this.observationReceiver.receiveObservation(rawState);
                    // Map to WorldState
                    try {
                        const worldState = this.worldStateMapper.mapObservationToWorldState(rawState);
                        // Start brain decision in background (don't wait)
                        lastDecision = this.brain.decide(worldState);
                        lastRawState = rawState;
                        lastWorldState = worldState;
                        this.logger.debug('Brain decision started (non-blocking)', {
                            decisionNumber: decisionCount + 1,
                        });
                    }
                    catch (error) {
                        this.logger.error('Failed to map observation', { error: String(error) });
                    }
                }
                // Step 4: Continue advancing game (empty ticks) if decision is pending
                if (lastDecision) {
                    // Non-blocking: just advance the game, collect observations
                    // Don't wait for decision
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to avoid busy loop
                }
            }
            // Wait for any final pending decision
            if (lastDecision && lastRawState && lastWorldState && decisionCount < ticks) {
                try {
                    const decision = await lastDecision;
                    const decisionMetrics = await this.executeDecision(lastRawState, lastWorldState, decision, 0);
                    this.state.metrics.push(decisionMetrics);
                    decisionCount++;
                    this.state.currentTick = decisionMetrics.tick;
                }
                catch (error) {
                    this.logger.error('Failed to execute final decision', { error: String(error) });
                }
            }
            this.state.running = false;
            // Shutdown brain
            if (this.brain.shutdown) {
                await this.brain.shutdown();
            }
            return this.state;
        }
        catch (error) {
            this.state.running = false;
            this.logger.error('AI loop failed', { error: String(error) });
            throw error;
        }
    }
    /**
     * Execute a decision that has finished
     */
    async executeDecision(rawState, worldState, decision, observationTime) {
        const tickStart = Date.now();
        const metrics = {
            tick: (rawState.tick || 0) / 4000, // Approximate tick number
            timestamp: new Date(),
            observationTime,
            mappingTime: 0,
            brainTime: 0,
            executionTime: 0,
            totalTime: 0,
            observationValid: true,
            commandsExecuted: 0,
            commandsSuccessful: 0,
        };
        // Execute commands
        const execStart = Date.now();
        if (decision.commands && decision.commands.length > 0) {
            try {
                const batchCommands = decision.commands.map((cmd) => ({
                    playerID: cmd.playerID,
                    command: cmd.json_cmd,
                }));
                await this.commandExecutor.executeCommandBatch(batchCommands);
                metrics.commandsExecuted = decision.commands.length;
                metrics.commandsSuccessful = decision.commands.length;
            }
            catch (error) {
                this.logger.warn('Command execution failed', {
                    error: String(error),
                    commandCount: decision.commands.length,
                });
                metrics.commandsExecuted = decision.commands.length;
                metrics.commandsSuccessful = 0;
            }
        }
        metrics.executionTime = Date.now() - execStart;
        metrics.totalTime = Date.now() - tickStart;
        return metrics;
    }
    /**
     * Run a single tick of the loop
     */
    async runTick() {
        const tickStart = Date.now();
        const metrics = {
            tick: this.state.currentTick + 1,
            timestamp: new Date(),
            observationTime: 0,
            mappingTime: 0,
            brainTime: 0,
            executionTime: 0,
            totalTime: 0,
            observationValid: false,
            commandsExecuted: 0,
            commandsSuccessful: 0,
        };
        try {
            // Phase 1: Observe
            const obsStart = Date.now();
            const rawState = await this.client.step([]);
            metrics.observationTime = Date.now() - obsStart;
            // Validate observation
            const validation = await this.observationReceiver.receiveObservation(rawState);
            metrics.observationValid = validation.isValid;
            if (!validation.isValid) {
                this.logger.warn('Invalid observation received', {
                    tick: metrics.tick,
                    errors: validation.errors,
                });
            }
            // Phase 2: Map to WorldState
            const mapStart = Date.now();
            let worldState;
            try {
                worldState = this.worldStateMapper.mapObservationToWorldState(rawState);
                metrics.mappingTime = Date.now() - mapStart;
            }
            catch (error) {
                this.logger.error('Failed to map observation', {
                    error: String(error),
                });
                throw error;
            }
            // Phase 3: Brain decision
            const brainStart = Date.now();
            let decision;
            try {
                decision = await this.brain.decide(worldState);
                metrics.brainTime = Date.now() - brainStart;
            }
            catch (error) {
                // Suppress AbortError (expected during shutdown/reconnection)
                const isAbortError = error instanceof Error && error.name === 'AbortError';
                if (!isAbortError) {
                    this.logger.error('Brain decision failed', {
                        error: String(error),
                    });
                }
                throw error;
            }
            // Phase 4: Execute commands
            const execStart = Date.now();
            let commandsSuccessful = 0;
            if (decision.commands && decision.commands.length > 0) {
                try {
                    const batchCommands = decision.commands.map((cmd) => ({
                        playerID: cmd.playerID,
                        command: cmd.json_cmd,
                    }));
                    const execState = await this.commandExecutor.executeCommandBatch(batchCommands);
                    commandsSuccessful = decision.commands.length; // Assume all succeeded if no error
                    metrics.commandsExecuted = decision.commands.length;
                    metrics.commandsSuccessful = commandsSuccessful;
                }
                catch (error) {
                    this.logger.warn('Command execution failed', {
                        error: String(error),
                        commandCount: decision.commands.length,
                    });
                    metrics.commandsExecuted = decision.commands.length;
                    metrics.commandsSuccessful = 0;
                }
            }
            metrics.executionTime = Date.now() - execStart;
            metrics.totalTime = Date.now() - tickStart;
            return metrics;
        }
        catch (error) {
            metrics.totalTime = Date.now() - tickStart;
            throw error;
        }
    }
    /**
     * Get average latency across all ticks
     */
    getAverageLatency() {
        if (this.state.metrics.length === 0)
            return 0;
        const total = this.state.metrics.reduce((sum, m) => sum + m.totalTime, 0);
        return Math.round(total / this.state.metrics.length);
    }
    /**
     * Generate performance report
     */
    generateReport() {
        const lines = [];
        lines.push('╔═══════════════════════════════════════════════════════╗');
        lines.push('║            AI LOOP PERFORMANCE REPORT               ║');
        lines.push('╚═══════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push('Summary:');
        lines.push(`  Ticks:              ${this.state.metrics.length}/${this.state.totalTicks}`);
        lines.push(`  Duration:           ${((Date.now() - this.state.startTime.getTime()) / 1000).toFixed(1)}s`);
        lines.push('');
        // Latency statistics
        if (this.state.metrics.length > 0) {
            const latencies = this.state.metrics.map((m) => m.totalTime);
            const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
            const minLatency = Math.min(...latencies);
            const maxLatency = Math.max(...latencies);
            lines.push('Latency:');
            lines.push(`  Average:            ${avgLatency.toFixed(1)}ms`);
            lines.push(`  Min:                ${minLatency.toFixed(1)}ms`);
            lines.push(`  Max:                ${maxLatency.toFixed(1)}ms`);
            lines.push('');
            // Phase breakdown
            const avgObs = this.state.metrics.reduce((a, b) => a + b.observationTime, 0) /
                this.state.metrics.length;
            const avgMap = this.state.metrics.reduce((a, b) => a + b.mappingTime, 0) /
                this.state.metrics.length;
            const avgBrain = this.state.metrics.reduce((a, b) => a + b.brainTime, 0) /
                this.state.metrics.length;
            const avgExec = this.state.metrics.reduce((a, b) => a + b.executionTime, 0) /
                this.state.metrics.length;
            lines.push('Phase Breakdown (avg):');
            lines.push(`  Observe:            ${avgObs.toFixed(1)}ms`);
            lines.push(`  Map to WorldState:  ${avgMap.toFixed(1)}ms`);
            lines.push(`  Brain Decision:     ${avgBrain.toFixed(1)}ms`);
            lines.push(`  Execute Commands:   ${avgExec.toFixed(1)}ms`);
            lines.push('');
            // Command statistics
            const totalCommands = this.state.metrics.reduce((a, b) => a + b.commandsExecuted, 0);
            const successfulCommands = this.state.metrics.reduce((a, b) => a + b.commandsSuccessful, 0);
            lines.push('Commands:');
            lines.push(`  Total:              ${totalCommands}`);
            lines.push(`  Successful:         ${successfulCommands}`);
            lines.push(`  Success Rate:       ${totalCommands > 0 ? ((successfulCommands / totalCommands) * 100).toFixed(1) : 'N/A'}%`);
            lines.push('');
            // Observation quality
            const validObservations = this.state.metrics.filter((m) => m.observationValid).length;
            lines.push('Observation Quality:');
            lines.push(`  Valid:              ${validObservations}/${this.state.metrics.length}`);
            lines.push('');
        }
        lines.push('Loop Status:');
        lines.push(`  ${this.state.running ? '🔄 RUNNING' : '✓ COMPLETE'}`);
        lines.push('');
        return lines.join('\n');
    }
}
exports.AILoopOrchestrator = AILoopOrchestrator;
//# sourceMappingURL=ai-loop-orchestrator.js.map