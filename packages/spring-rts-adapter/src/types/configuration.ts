export interface SpringRTSConfiguration {
  readonly gameExecutablePath: string;
  readonly gameDataPath?: string;
  readonly port: number;
  readonly host: string;
  readonly launchTimeout: number;
  readonly shutdownTimeout: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly deterministicMode: boolean;
  readonly maxPlayers: number;
  readonly aiTimeout: number;
}

export const DEFAULT_CONFIG: SpringRTSConfiguration = {
  gameExecutablePath: process.env.SPRING_EXECUTABLE || 'spring',
  gameDataPath: process.env.SPRING_DATA_PATH,
  port: 6557,
  host: 'localhost',
  launchTimeout: 30000,
  shutdownTimeout: 10000,
  logLevel: 'info',
  deterministicMode: true,
  maxPlayers: 2,
  aiTimeout: 5000,
};
