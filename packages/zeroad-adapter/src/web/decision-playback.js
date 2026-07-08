/**
 * Decision Playback
 *
 * Frame-by-frame playback of decisions with state visualization.
 * - Playback state machine
 * - Frame navigation
 * - Speed control
 * - Change detection
 */
/**
 * Playback controller
 */
export class DecisionPlayback {
    replay;
    timeline;
    currentTick = 0;
    playbackState = 'stopped';
    playbackSpeed = 1;
    listeners = new Set();
    lastSeenState = new Map();
    playbackInterval = null;
    constructor(replay, timeline) {
        this.replay = replay;
        this.timeline = timeline;
    }
    /**
     * Subscribe to playback changes
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    /**
     * Start playback from current tick
     */
    play() {
        if (this.playbackState === 'finished') {
            return;
        }
        this.playbackState = 'playing';
        this.startPlayback();
    }
    /**
     * Pause playback
     */
    pause() {
        this.playbackState = 'paused';
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }
    /**
     * Stop and reset to tick 0
     */
    stop() {
        this.playbackState = 'stopped';
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        this.seek(0);
    }
    /**
     * Step forward one tick
     */
    stepForward() {
        this.pause();
        const nextTick = this.currentTick + 1;
        const position = this.replay.getCurrentPosition();
        if (nextTick <= position.maxTick) {
            this.seek(nextTick);
        }
    }
    /**
     * Step backward one tick
     */
    stepBackward() {
        this.pause();
        const prevTick = Math.max(0, this.currentTick - 1);
        this.seek(prevTick);
    }
    /**
     * Seek to specific tick
     */
    seek(tick) {
        const frame = this.replay.seek(tick);
        if (frame) {
            this.currentTick = tick;
            this.emitFrame();
        }
    }
    /**
     * Set playback speed
     */
    setSpeed(speed) {
        this.playbackSpeed = speed;
        // Restart playback if playing to apply new speed
        if (this.playbackState === 'playing') {
            this.pause();
            this.play();
        }
    }
    /**
     * Get current tick
     */
    getCurrentTick() {
        return this.currentTick;
    }
    /**
     * Get max tick
     */
    getMaxTick() {
        return this.replay.getCurrentPosition().maxTick;
    }
    /**
     * Get current state
     */
    getState() {
        return this.playbackState;
    }
    /**
     * Get current speed
     */
    getSpeed() {
        return this.playbackSpeed;
    }
    /**
     * Private: Start playback loop
     */
    startPlayback() {
        // Calculate interval based on speed (1x = 50ms per tick)
        const baseInterval = 50;
        const interval = Math.max(10, Math.round(baseInterval / this.playbackSpeed));
        this.playbackInterval = setInterval(() => {
            const nextTick = this.currentTick + 1;
            const position = this.replay.getCurrentPosition();
            if (nextTick > position.maxTick) {
                this.playbackState = 'finished';
                this.pause();
                this.emitFrame();
                return;
            }
            this.seek(nextTick);
        }, interval);
    }
    /**
     * Private: Emit current frame to listeners
     */
    emitFrame() {
        const frame = this.replay.getFrame(this.currentTick);
        const decision = this.timeline.getDecision(this.currentTick);
        const changes = this.detectChanges(frame);
        const playbackFrame = {
            tick: this.currentTick,
            decision: decision || null,
            state: frame || null,
            changes,
            isDecisionTick: !!decision,
        };
        for (const listener of this.listeners) {
            try {
                listener(playbackFrame);
            }
            catch (err) {
                console.error('Playback listener error:', err);
            }
        }
    }
    /**
     * Private: Detect state changes between ticks
     */
    detectChanges(frame) {
        if (!frame || !frame.state) {
            return [];
        }
        const changes = [];
        const gameState = frame.state.gameState;
        // Unit count change
        const prevUnitCount = this.lastSeenState.get('units') ?? 0;
        if (gameState.unitCount !== prevUnitCount) {
            if (gameState.unitCount > prevUnitCount) {
                changes.push({
                    type: 'unit_created',
                    description: `${gameState.unitCount - prevUnitCount} unit(s) created`,
                    before: prevUnitCount,
                    after: gameState.unitCount,
                });
            }
            else {
                changes.push({
                    type: 'unit_destroyed',
                    description: `${prevUnitCount - gameState.unitCount} unit(s) destroyed`,
                    before: prevUnitCount,
                    after: gameState.unitCount,
                });
            }
            this.lastSeenState.set('units', gameState.unitCount);
        }
        // Building count change
        const prevBuildingCount = this.lastSeenState.get('buildings') ?? 0;
        if (gameState.buildingCount !== prevBuildingCount) {
            if (gameState.buildingCount > prevBuildingCount) {
                changes.push({
                    type: 'building_created',
                    description: `${Math.round((gameState.buildingCount - prevBuildingCount) * 10) / 10} building(s) created`,
                    before: prevBuildingCount,
                    after: gameState.buildingCount,
                });
            }
            else {
                changes.push({
                    type: 'building_destroyed',
                    description: `${Math.round((prevBuildingCount - gameState.buildingCount) * 10) / 10} building(s) destroyed`,
                    before: prevBuildingCount,
                    after: gameState.buildingCount,
                });
            }
            this.lastSeenState.set('buildings', gameState.buildingCount);
        }
        return changes;
    }
}
//# sourceMappingURL=decision-playback.js.map