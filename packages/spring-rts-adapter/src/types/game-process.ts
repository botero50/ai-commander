export interface GameProcessOptions {
  readonly executablePath: string;
  readonly launchTimeout: number;
  readonly shutdownTimeout: number;
}

export interface GameProcess {
  readonly isRunning: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: string): Promise<void>;
  onMessage(callback: (message: string) => void): void;
  getProcessId(): number | null;
}
