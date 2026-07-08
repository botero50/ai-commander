export interface IPCBridge {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendMessage(message: object): Promise<void>;
  sendRequest(type: string, data?: object): Promise<unknown>;
  onMessage(handler: (message: object) => void): void;
  heartbeat(): Promise<boolean>;
}
