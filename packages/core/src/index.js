"use strict";
/**
 * @ai-commander/core
 *
 * Game-agnostic AI tournament framework
 * Reusable across any game with a GameAdapter implementation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Tournament System
__exportStar(require("./tournament/elo-rating"), exports);
__exportStar(require("./tournament/broadcast-server"), exports);
// Brain Framework
__exportStar(require("./brain/ollama-brain"), exports);
__exportStar(require("./brain/ai-loop-orchestrator"), exports);
__exportStar(require("./brain/brain-factory"), exports);
__exportStar(require("./brain/ollama-request-throttler"), exports);
__exportStar(require("./brain/decision-logger"), exports);
// Streaming
__exportStar(require("./streaming/broadcast-state"), exports);
// Analytics
__exportStar(require("./analytics/statistics-analyzer"), exports);
__exportStar(require("./analytics/match-comparison"), exports);
__exportStar(require("./analytics/prediction-system"), exports);
// Commentary
__exportStar(require("./commentary/trash-talk-generator"), exports);
// Config
__exportStar(require("./config/logger"), exports);
// Types
__exportStar(require("./types"), exports);
/**
 * To integrate a new game:
 * 1. Create a GameAdapter implementation
 * 2. Use BrainFactory to create AI brains
 * 3. Use EloRating for tournament rankings
 * 4. Use BroadcastServer for streaming
 */
//# sourceMappingURL=index.js.map