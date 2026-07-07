import type { WorldObservation } from "@ai-commander/brain";
import type { OpenRAGameState } from "./state-reader";
export declare class WorldMapper {
    static mapToObservation(gameState: OpenRAGameState, playerName: string): WorldObservation;
    private static calculatePlayerHealth;
}
//# sourceMappingURL=world-mapper.d.ts.map