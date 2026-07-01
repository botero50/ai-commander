/**
 * Interface for synchronous resource cleanup.
 * Implement this to ensure resources are properly released.
 */
export interface Disposable {
  /**
   * Release resources held by this object.
   * Should be idempotent (safe to call multiple times).
   */
  dispose(): void;
}

/**
 * Interface for asynchronous resource cleanup.
 * Implement this for async cleanup operations.
 */
export interface AsyncDisposable {
  /**
   * Release resources held by this object asynchronously.
   * Should be idempotent (safe to call multiple times).
   */
  dispose(): Promise<void>;
}

/**
 * Check if a value implements Disposable.
 */
export function isDisposable(value: unknown): value is Disposable {
  return (
    value !== null &&
    typeof value === 'object' &&
    'dispose' in value &&
    typeof (value as Disposable).dispose === 'function'
  );
}

/**
 * Check if a value implements AsyncDisposable.
 */
export function isAsyncDisposable(value: unknown): value is AsyncDisposable {
  return (
    value !== null &&
    typeof value === 'object' &&
    'dispose' in value &&
    typeof (value as AsyncDisposable).dispose === 'function'
  );
}

/**
 * Dispose of multiple resources in sequence.
 */
export async function disposeAll(disposables: (Disposable | AsyncDisposable)[]): Promise<void> {
  for (const disposable of disposables) {
    if (isAsyncDisposable(disposable)) {
      await disposable.dispose();
    } else if (isDisposable(disposable)) {
      disposable.dispose();
    }
  }
}
