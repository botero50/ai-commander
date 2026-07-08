export class MatchLoop {
    constructor(match, config, callbacks, logger) {
        this.running = false;
        this.loopInterval = null;
        this.iterationCount = 0;
        this.observeLatencies = [];
        this.decideLatencies = [];
        this.executeLatencies = [];
        this.match = match;
        this.config = {
            observeTimeoutMs: 5000,
            ...config,
        };
        this.callbacks = callbacks;
        this.logger = logger;
    }
    async start() {
        if (this.running) {
            throw new Error('Loop already running');
        }
        if (!this.match.isActive()) {
            throw new Error('Match not active');
        }
        this.running = true;
        this.iterationCount = 0;
        this.observeLatencies = [];
        this.decideLatencies = [];
        this.executeLatencies = [];
        this.logger.info('Starting match loop', {
            matchId: this.match.matchId,
            tickDurationMs: this.config.tickDurationMs,
        });
        this.loopInterval = setInterval(() => {
            this.tick();
        }, this.config.tickDurationMs);
    }
    async stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
        this.logger.info('Match loop stopped', {
            matchId: this.match.matchId,
            iterations: this.iterationCount,
        });
    }
    async tick() {
        if (!this.running) {
            return;
        }
        if (this.config.maxIterations && this.iterationCount >= this.config.maxIterations) {
            await this.stop();
            this.logger.info('Match loop max iterations reached', {
                matchId: this.match.matchId,
                maxIterations: this.config.maxIterations,
            });
            return;
        }
        try {
            this.iterationCount++;
            // Observe
            const observeStart = Date.now();
            const worldState = await this.observe();
            const observeLatency = Date.now() - observeStart;
            this.observeLatencies.push(observeLatency);
            if (!worldState) {
                this.logger.warn('Failed to observe world state', {
                    matchId: this.match.matchId,
                    iteration: this.iterationCount,
                });
                return;
            }
            // Callback: onObserve
            if (this.callbacks.onObserve) {
                try {
                    await this.callbacks.onObserve(worldState);
                }
                catch (err) {
                    this.logger.warn('onObserve callback error', err);
                }
            }
            // Decide
            const decideStart = Date.now();
            let commands = [];
            try {
                commands = await this.decide(worldState);
            }
            catch (decideErr) {
                const decideLatency = Date.now() - decideStart;
                this.decideLatencies.push(decideLatency);
                if (this.callbacks.onError) {
                    try {
                        await this.callbacks.onError(decideErr instanceof Error ? decideErr : new Error(String(decideErr)));
                    }
                    catch (callbackErr) {
                        this.logger.error('onError callback error', callbackErr);
                    }
                }
                return;
            }
            const decideLatency = Date.now() - decideStart;
            this.decideLatencies.push(decideLatency);
            if (!commands || commands.length === 0) {
                // No commands to execute this iteration
                return;
            }
            // Execute
            const executeStart = Date.now();
            await this.execute(commands);
            const executeLatency = Date.now() - executeStart;
            this.executeLatencies.push(executeLatency);
            if (this.iterationCount % 100 === 0) {
                this.logger.debug('Loop iteration metrics', {
                    iteration: this.iterationCount,
                    observeLatencyMs: observeLatency,
                    decideLatencyMs: decideLatency,
                    executeLatencyMs: executeLatency,
                });
            }
        }
        catch (err) {
            this.logger.error('Loop iteration error', err);
            if (this.callbacks.onError) {
                try {
                    await this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
                }
                catch (callbackErr) {
                    this.logger.error('onError callback error', callbackErr);
                }
            }
        }
    }
    async observe() {
        try {
            const state = await this.match.getCurrentWorldState();
            return state;
        }
        catch (err) {
            this.logger.error('Observation error', err);
            return null;
        }
    }
    async decide(state) {
        if (!this.callbacks.onDecide) {
            return [];
        }
        try {
            const commands = await this.callbacks.onDecide(state);
            return commands || [];
        }
        catch (err) {
            this.logger.error('Decision error', err);
            return [];
        }
    }
    async execute(commands) {
        if (!this.callbacks.onExecute) {
            return;
        }
        try {
            await this.callbacks.onExecute(commands);
        }
        catch (err) {
            this.logger.error('Execution error', err);
            throw err;
        }
    }
    isRunning() {
        return this.running;
    }
    getMetrics() {
        const avgObserve = this.observeLatencies.length > 0
            ? this.observeLatencies.reduce((a, b) => a + b, 0) / this.observeLatencies.length
            : 0;
        const avgDecide = this.decideLatencies.length > 0
            ? this.decideLatencies.reduce((a, b) => a + b, 0) / this.decideLatencies.length
            : 0;
        const avgExecute = this.executeLatencies.length > 0
            ? this.executeLatencies.reduce((a, b) => a + b, 0) / this.executeLatencies.length
            : 0;
        const totalLatency = this.observeLatencies.reduce((a, b) => a + b, 0)
            + this.decideLatencies.reduce((a, b) => a + b, 0)
            + this.executeLatencies.reduce((a, b) => a + b, 0);
        return {
            iterationCount: this.iterationCount,
            observeCount: this.observeLatencies.length,
            decideCount: this.decideLatencies.length,
            executeCount: this.executeLatencies.length,
            avgObserveLatencyMs: parseFloat(avgObserve.toFixed(2)),
            avgDecideLatencyMs: parseFloat(avgDecide.toFixed(2)),
            avgExecuteLatencyMs: parseFloat(avgExecute.toFixed(2)),
            totalLatencyMs: totalLatency,
        };
    }
}
//# sourceMappingURL=match-loop.js.map