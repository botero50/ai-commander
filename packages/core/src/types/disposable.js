/**
 * Check if a value implements Disposable.
 */
export function isDisposable(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'dispose' in value &&
        typeof value.dispose === 'function');
}
/**
 * Check if a value implements AsyncDisposable.
 */
export function isAsyncDisposable(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'dispose' in value &&
        typeof value.dispose === 'function');
}
/**
 * Dispose of multiple resources in sequence.
 */
export async function disposeAll(disposables) {
    for (const disposable of disposables) {
        if (isAsyncDisposable(disposable)) {
            await disposable.dispose();
        }
        else if (isDisposable(disposable)) {
            disposable.dispose();
        }
    }
}
//# sourceMappingURL=disposable.js.map