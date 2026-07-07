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
export declare function isDisposable(value: unknown): value is Disposable;
/**
 * Check if a value implements AsyncDisposable.
 */
export declare function isAsyncDisposable(value: unknown): value is AsyncDisposable;
/**
 * Dispose of multiple resources in sequence.
 */
export declare function disposeAll(disposables: (Disposable | AsyncDisposable)[]): Promise<void>;
//# sourceMappingURL=disposable.d.ts.map