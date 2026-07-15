export enum ZeroADAdapterErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  LAUNCH_FAILED = 'LAUNCH_FAILED',
  IPC_CONNECTION_FAILED = 'IPC_CONNECTION_FAILED',
  GAME_CRASH = 'GAME_CRASH',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export class ZeroADAdapterError extends Error {
  constructor(
    public code: ZeroADAdapterErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ZeroADAdapterError';
  }
}
