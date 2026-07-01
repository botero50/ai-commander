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
export function isFactory<T>(value: unknown): value is Factory<T> {
  return typeof value === 'function';
}

/**
 * Check if a value is an AsyncFactory.
 */
export function isAsyncFactory<T>(value: unknown): value is AsyncFactory<T> {
  return typeof value === 'function';
}
