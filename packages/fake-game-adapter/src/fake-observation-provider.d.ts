import type { ObservationProvider } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import type { FakeWorldSnapshot } from './world/fake-world-state.js';
/**
 * Fake observation provider.
 *
 * Converts FakeWorldSnapshot to framework WorldState.
 * Provides immutable snapshots of the in-memory world.
 */
export declare class FakeObservationProvider implements ObservationProvider {
    private available;
    private worldHistory;
    constructor(initialWorld: FakeWorldSnapshot);
    isObservationAvailable(): Promise<boolean>;
    getWorldState(): Promise<WorldState>;
    getWorldStateAt(tick: number): Promise<WorldState>;
    recordWorldState(world: FakeWorldSnapshot): void;
    markUnavailable(): void;
    markAvailable(): void;
    private convertToWorldState;
}
//# sourceMappingURL=fake-observation-provider.d.ts.map