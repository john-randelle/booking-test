export interface RetryOptions {
  attempts?: number;
  /** Delay before the first retry; doubles on each subsequent attempt. */
  baseDelayMs?: number;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn`, retrying with exponential backoff until it succeeds or
 * `attempts` is exhausted. The last error is rethrown.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 5, baseDelayMs = 500, onRetry }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
