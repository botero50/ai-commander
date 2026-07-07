export class ComplianceTracker {
    constructor() {
        this.auditLogs = [];
    }
    recordMatch(log) {
        this.auditLogs.push({ ...log, timestamp: Date.now() });
    }
    getGuarantee(tournament, config) {
        const cfg = config;
        return {
            mapSeed: cfg.mapSeed || 0,
            brainVersions: cfg.brainVersions || {},
            modelConfigs: cfg.modelConfigs || {},
            gameAdapterId: cfg.gameAdapterId || 'openra',
            maxTicks: cfg.maxTicks || 200,
            framework: 'ai-commander-v2.0',
        };
    }
    exportAudit() {
        const headers = 'Timestamp,Tournament,Match,Red,Blue,Winner,Seed,Red Tokens,Blue Tokens,Red Cost,Blue Cost';
        const rows = this.auditLogs.map((log) => `${log.timestamp},${log.tournament},${log.match},${log.redBrain},${log.blueBrain},${log.winner},${log.seed},${log.tokens.red},${log.tokens.blue},$${log.cost.red.toFixed(6)},$${log.cost.blue.toFixed(6)}`);
        return `${headers}\n${rows.join('\n')}`;
    }
}
//# sourceMappingURL=compliance.js.map