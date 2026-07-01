/**
 * Engine configuration.
 */
export interface EngineConfig {
  readonly tickRate: number;
  readonly maxTicks?: number;
  readonly debug?: boolean;
}
