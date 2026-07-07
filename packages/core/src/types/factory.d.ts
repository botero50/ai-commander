/**
 * Factory function for creating instances of type T synchronously.
 */
export interface Factory<T> {
    /**
     * Create a new instance.
     */
    (): T;
}
/**
 * Factory function for creating instances of type T asynchronously.
 */
export interface AsyncFactory<T> {
    /**
     * Create a new instance asynchronously.
     */
    (): Promise<T>;
}
/**
 * Check if a value is a Factory.
 */
export declare function isFactory<T>(value: unknown): value is Factory<T>;
/**
 * Check if a value is an AsyncFactory.
 */
export declare function isAsyncFactory<T>(value: unknown): value is AsyncFactory<T>;
//# sourceMappingURL=factory.d.ts.map