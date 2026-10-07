import { env } from '../config/env';
import { ApiError } from './api-errors';

const API_BASE_URL = 'https://api.pluggy.ai';
const REQUEST_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 100;

type PluggyFailure = 'pluggyAuthenticationFailed' | 'pluggyRequestFailed';

async function readJson(response: Response, failureKey: PluggyFailure): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(502, failureKey);
  }
  if (!response.ok) throw new ApiError(502, failureKey);
  return body;
}

/** Creates one server-side API key for reuse across a synchronization run. */
export async function createPluggyApiKey(): Promise<string> {
  if (!env.pluggyClientId || !env.pluggyClientSecret) {
    throw new ApiError(503, 'pluggyCredentialsRequired');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: env.pluggyClientId,
        clientSecret: env.pluggyClientSecret,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(502, 'pluggyAuthenticationFailed');
  }

  const body = await readJson(response, 'pluggyAuthenticationFailed');
  const apiKey = typeof body === 'object' && body !== null && 'apiKey' in body
    ? body.apiKey
    : undefined;
  if (typeof apiKey !== 'string' || !apiKey) {
    throw new ApiError(502, 'pluggyAuthenticationFailed');
  }
  return apiKey;
}

/** Reads every page for one Pluggy resource while enforcing shared HTTP handling. */
export async function getPluggyPages(
  apiKey: string,
  path: string,
  query: Record<string, string>,
): Promise<unknown[]> {
  const results: unknown[] = [];
  let page = 1;

  while (true) {
    const url = new URL(path, API_BASE_URL);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(PAGE_SIZE));

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'X-API-KEY': apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ApiError(502, 'pluggyRequestFailed');
    }

    const input = await readJson(response, 'pluggyRequestFailed');
    const body = typeof input === 'object' && input !== null && !Array.isArray(input)
      ? input as Record<string, unknown>
      : null;
    if (!body || !Array.isArray(body.results)) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }
    results.push(...body.results);

    const totalPages = body.totalPages;
    if (typeof totalPages === 'number' && Number.isInteger(totalPages) && totalPages >= 0) {
      if (page >= totalPages) break;
    } else if (body.results.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return results;
}