import { env } from '../config/env';

const PLUGGY_AUTH_URL = 'https://api.pluggy.ai/auth';
const PLUGGY_API_URL = 'https://api.pluggy.ai';
const AUTH_TIMEOUT_MS = 10_000;

type PluggyTokenResponse = {
  apiKey: string;
};

type PluggyCredentials = {
  clientId: string;
  clientSecret: string;
};

export class PluggyCredentialsMissingError extends Error {
  constructor() {
    super('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET must be configured to use Pluggy.');
    this.name = 'PluggyCredentialsMissingError';
  }
}

function parseTokenResponse(input: unknown): PluggyTokenResponse {
  if (
    typeof input !== 'object'
    || input === null
    || !('apiKey' in input)
    || typeof input.apiKey !== 'string'
    || input.apiKey.trim() === ''
  ) {
    throw new Error('Pluggy authentication response did not contain a valid API key.');
  }

  return { apiKey: input.apiKey };
}

/** Requests a Pluggy API key with the supplied credentials. */
export async function requestPluggyToken(
  credentials: PluggyCredentials,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(PLUGGY_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error('Could not reach the Pluggy authentication service.', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Pluggy authentication failed with HTTP status ${response.status}.`);
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch (error) {
    throw new Error('Pluggy authentication returned an invalid JSON response.', { cause: error });
  }

  return parseTokenResponse(responseBody).apiKey;
}

/**
 * Gets a Pluggy API key using credentials loaded from the backend environment.
 * Credentials are required only when a caller starts using the Pluggy integration.
 */
export async function getPluggyToken(): Promise<string> {
  const { pluggyClientId, pluggyClientSecret } = env;
  if (!pluggyClientId || !pluggyClientSecret) {
    throw new PluggyCredentialsMissingError();
  }

  return requestPluggyToken({
    clientId: pluggyClientId,
    clientSecret: pluggyClientSecret,
  });
}

/** Fetches an item's investments without exposing the API key to the caller. */
export async function getPluggyInvestments(
  itemId: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const url = new URL('/investments', PLUGGY_API_URL);
  url.searchParams.set('itemId', itemId);

  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error('Could not reach the Pluggy investments service.', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Pluggy investments request failed with HTTP status ${response.status}.`);
  }

  try {
    return await response.json() as unknown;
  } catch (error) {
    throw new Error('Pluggy investments service returned an invalid JSON response.', { cause: error });
  }
}

/** Fetches the bank accounts associated with a Pluggy item. */
export async function getPluggyAccounts(
  itemId: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const url = new URL('/accounts', PLUGGY_API_URL);
  url.searchParams.set('itemId', itemId);

  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error('Could not reach the Pluggy accounts service.', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Pluggy accounts request failed with HTTP status ${response.status}.`);
  }

  try {
    return await response.json() as unknown;
  } catch (error) {
    throw new Error('Pluggy accounts service returned an invalid JSON response.', { cause: error });
  }
}
