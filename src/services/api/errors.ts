export type ApiErrorCode =
  | 'network_error'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'server_error'
  | 'unknown';

/**
 * Every fetcher throws this shape — never a raw Axios/fetch error (§15).
 * `retryable` lets calling code (React Query retry config, UI retry buttons)
 * make a consistent decision without re-parsing status codes everywhere.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, message: string, status?: number, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const message = extractMessage(body) ?? `Request failed with status ${status}`;
    if (status === 401) return new ApiError('unauthorized', message, status, false);
    if (status === 403) return new ApiError('forbidden', message, status, false);
    if (status === 404) return new ApiError('not_found', message, status, false);
    if (status === 400 || status === 413 || status === 415 || status === 422) {
      return new ApiError('validation_error', message, status, false);
    }
    if (status >= 500) return new ApiError('server_error', message, status, true);
    return new ApiError('unknown', message, status, false);
  }

  static network(originalMessage?: string): ApiError {
    return new ApiError('network_error', originalMessage ?? 'Network request failed', undefined, true);
  }

  static timeout(): ApiError {
    return new ApiError('timeout', 'Request timed out', undefined, true);
  }
}

function extractMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
    return (body as { message: string }).message;
  }
  if (body && typeof body === 'object' && 'detail' in body && typeof (body as { detail: unknown }).detail === 'string') {
    return (body as { detail: string }).detail;
  }
  return undefined;
}
