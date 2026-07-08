import { ObservationProvider as IObservationProvider } from '@ai-commander/adapter';
import { WorldState } from '@ai-commander/domain';
import { Logger } from '../config/logger.js';
import { ObservationProvider } from '../observation/observation-provider.js';
export declare class ZeroADObservationProvider implements IObservationProvider {
    private observationLoop;
    private logger;
    constructor(observationLoop: ObservationProvider, logger: Logger);
    getWorldState(): Promise<WorldState>;
    getWorldStateAt(tick: number): Promise<WorldState | undefined>;
    isObservationAvailable(): Promise<boolean>;
}
//# sourceMappingURL=observation-provider.d.ts.map