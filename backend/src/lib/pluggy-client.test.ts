import assert from 'node:assert/strict';
import test from 'node:test';
import { getPluggyAccounts, getPluggyInvestments, requestPluggyToken } from './pluggy-client';

test('requests and returns the Pluggy apiKey', async () => {
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;
  const token = await requestPluggyToken(
    { clientId: 'client-id', clientSecret: 'client-secret' },
    async (input, init) => {
      requestedUrl = String(input);
      requestInit = init;
      return Response.json({ apiKey: 'pluggy-api-key' });
    },
  );

  assert.equal(token, 'pluggy-api-key');
  assert.equal(requestedUrl, 'https://api.pluggy.ai/auth');
  assert.equal(requestInit?.method, 'POST');
  const requestHeaders = new Headers(requestInit?.headers);
  assert.equal(requestHeaders.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    clientId: 'client-id',
    clientSecret: 'client-secret',
  });
});

test('surfaces Pluggy authentication failures without exposing credentials or response bodies', async () => {
  await assert.rejects(
    requestPluggyToken(
      { clientId: 'client-id', clientSecret: 'secret-value' },
      async () => new Response('sensitive upstream details', { status: 401 }),
    ),
    (error: unknown) => error instanceof Error
      && error.message === 'Pluggy authentication failed with HTTP status 401.'
      && !error.message.includes('secret-value'),
  );
});

test('rejects successful responses that do not contain an API key', async () => {
  await assert.rejects(
    requestPluggyToken(
      { clientId: 'client-id', clientSecret: 'client-secret' },
      async () => Response.json({ token: 'wrong-field' }),
    ),
    /did not contain a valid API key/,
  );
});

test('requests investment data for the selected item with the Pluggy API key', async () => {
  let requestedUrl = '';
  let requestHeaders: Headers | undefined;
  const response = await getPluggyInvestments(
    'item id/with special',
    'api-key',
    async (input, init) => {
      requestedUrl = String(input);
      requestHeaders = new Headers(init?.headers);
      return Response.json({ results: [] });
    },
  );

  assert.deepEqual(response, { results: [] });
  assert.equal(
    requestedUrl,
    'https://api.pluggy.ai/investments?itemId=item+id%2Fwith+special',
  );
  assert.equal(requestHeaders?.get('X-API-KEY'), 'api-key');
});

test('requests bank account data for the selected item', async () => {
  let requestedUrl = '';
  const response = await getPluggyAccounts(
    'bb-item',
    'api-key',
    async (input) => {
      requestedUrl = String(input);
      return Response.json({ results: [] });
    },
  );

  assert.deepEqual(response, { results: [] });
  assert.equal(requestedUrl, 'https://api.pluggy.ai/accounts?itemId=bb-item');
});
