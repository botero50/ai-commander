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
  readonly tokens: { red: number; blue: number };
  readonly cost: { red: number; blue: number };
}

export class ComplianceTracker {
  private auditLogs: AuditLog[] = [];

  recordMatch(log: AuditLog): void {
    this.auditLogs.push({ ...log, timestamp: Date.now() });
  }

  getGuarantee(tournament: string, config: unknown): ReproducibilityGuarantee {
    const cfg = config as any;
    return {
      mapSeed: cfg.mapSeed || 0,
      brainVersions: cfg.brainVersions || {},
      modelConfigs: cfg.modelConfigs || {},
      gameAdapterId: cfg.gameAdapterId || 'checkers',
      maxTicks: cfg.maxTicks || 200,
      framework: 'ai-commander-v2.0',
    };
  }

  exportAudit(): string {
    const headers = 'Timestamp,Tournament,Match,Red,Blue,Winner,Seed,Red Tokens,Blue Tokens,Red Cost,Blue Cost';
    const rows = this.auditLogs.map((log) =>
      `${log.timestamp},${log.tournament},${log.match},${log.redBrain},${log.blueBrain},${log.winner},${log.seed},${log.tokens.red},${log.tokens.blue},$${log.cost.red.toFixed(6)},$${log.cost.blue.toFixed(6)}`
    );
    return `${headers}\n${rows.join('\n')}`;
  }
}
