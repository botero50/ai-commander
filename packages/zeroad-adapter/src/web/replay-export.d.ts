/**
 * Replay Export
 *
 * Export replays in multiple formats for sharing and analysis.
 * - JSON export (complete data)
 * - CSV export (summary statistics)
 * - HTML report (readable format)
 * - Metadata export
 */
import type { ReplayMetadata } from './replay-storage.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';
/**
 * Replay export formats
 */
export type ExportFormat = 'json' | 'csv' | 'html' | 'metadata';
/**
 * Export options
 */
export interface ExportOptions {
    readonly includeDecisions?: boolean;
    readonly includeSnapshots?: boolean;
    readonly prettyPrint?: boolean;
}
/**
 * Replay export service
 */
export declare class ReplayExport {
    /**
     * Export replay as JSON
     */
    static toJSON(metadata: ReplayMetadata, decisions: readonly DecisionEvent[], snapshots: readonly TimelineSnapshot[], options?: ExportOptions): string;
    /**
     * Export replay as CSV (summary statistics)
     */
    static toCSV(metadata: ReplayMetadata, decisions: readonly DecisionEvent[]): string;
    /**
     * Export replay as HTML report
     */
    static toHTML(metadata: ReplayMetadata, decisions: readonly DecisionEvent[], snapshots: readonly TimelineSnapshot[]): string;
    /**
     * Export replay metadata
     */
    static toMetadata(metadata: ReplayMetadata): string;
    /**
     * Save export to file
     */
    static saveToFile(filepath: string, content: string): Promise<void>;
    /**
     * Escape HTML special characters
     */
    private static escapeHTML;
    /**
     * Escape CSV special characters
     */
    private static escapeCSV;
}
//# sourceMappingURL=replay-export.d.ts.map