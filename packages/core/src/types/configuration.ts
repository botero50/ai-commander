export interface ZeroADConfiguration {
  gameExecutablePath: string;
  gameDataPath?: string;
  ipcPort?: number;
  ipcHost?: string;
  launchTimeout?: number;
  shutdownTimeout?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
