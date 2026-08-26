import { ApiError } from './errors';
import { useAuthStore } from '@/stores/useAuthStore';
import { env } from '@/config/env';

const DEFAULT_TIMEOUT_MS = 15000;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  /** Set false for public endpoints that must not attach an auth header. */
  authenticated?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${env.apiBaseUrl.replace(/\/$/, '')}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Single shared HTTP client. Every feature fetcher goes through this —
 * never construct a raw fetch/axios call in `features/*\/api` (§9). Handles
 * auth header injection, timeout, and normalizes all failures into ApiError.
 */
export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', body, query, timeoutMs = DEFAULT_TIMEOUT_MS, authenticated = true, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (authenticated) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await safeJson(response);
      const apiError = ApiError.fromResponse(response.status, errorBody);
      if (apiError.code === 'unauthorized') {
        useAuthStore.getState().handleSessionExpired();
      }
      throw apiError;
    }

    if (response.status === 204) return undefined as TResponse;
    return (await response.json()) as TResponse;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') throw ApiError.timeout();
    throw ApiError.network(err instanceof Error ? err.message : undefined);
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
