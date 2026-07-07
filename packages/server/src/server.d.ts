/**
 * HTTP API Server — Remote tournament execution
 *
 * Endpoints:
 * POST /matches — Execute a match
 * POST /tournaments — Execute a tournament
 * GET /tournaments/:id — Get tournament status
 * GET /results/:id — Get results
 * GET /health — Server status
 */
export declare class AICommanderServer {
    private port;
    private tournamentJobs;
    constructor(port?: number);
    start(): void;
    private handleHealth;
    private handleMatch;
    private handleTournament;
    private handleGetTournament;
    private handleGetResult;
    private parseJSON;
}
//# sourceMappingURL=server.d.ts.map