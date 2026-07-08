export interface IPCBridgeOptions {
  readonly host: string;
  readonly port: number;
  readonly connectTimeout: number;
}

export interface IPCMessage {
  readonly type: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: number;
}

export interface IPCBridge {
  readonly isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: IPCMessage): Promise<void>;
  onMessage(callback: (message: IPCMessage) => void): () => void;
  request<T = unknown>(message: IPCMessage, timeoutMs?: number): Promise<T>;
}
