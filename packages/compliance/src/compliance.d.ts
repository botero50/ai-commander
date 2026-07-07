export interface ReproducibilityGuarantee {
    readonly mapSeed: number;
    readonly brainVersions: Record<string, string>;
    readonly modelConfigs: Record<string, Record<string, unknown>>;
    readonly gameAdapterId: string;
    readonly maxTicks: number;
    readonly framework: 'ai-commander-v2.0';
}
export interface AuditLog {
    readonly timestamp: number;
    readonly tournament: string;
    readonly match: string;
    readonly redBrain: string;
    readonly blueBrain: string;
    readonly winner: string;
    readonly seed: number;
    readonly tokens: {
        red: number;
        blue: number;
    };
    readonly cost: {
        red: number;
        blue: number;
    };
}
export declare class ComplianceTracker {
    private auditLogs;
    recordMatch(log: AuditLog): void;
    getGuarantee(tournament: string, config: unknown): ReproducibilityGuarantee;
    exportAudit(): string;
}
//# sourceMappingURL=compliance.d.ts.map