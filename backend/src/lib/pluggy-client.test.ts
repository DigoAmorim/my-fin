import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from './api-errors';
import { getPluggyPages } from './pluggy-client';

test('retrieves all Pluggy pages using the API key header', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: URL; apiKey: string | null }> = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({
      url,
      apiKey: new Headers(init?.headers).get('X-API-KEY'),
    });
    const page = Number(url.searchParams.get('page'));
    return new Response(JSON.stringify({
      totalPages: 2,
      results: [{ id: `record-${page}` }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const results = await getPluggyPages('test-api-key', '/accounts', { itemId: 'item-1' });

    assert.deepEqual(results, [{ id: 'record-1' }, { id: 'record-2' }]);
    assert.deepEqual(requests.map(({ url }) => url.searchParams.get('page')), ['1', '2']);
    assert.ok(requests.every(({ url }) => url.searchParams.get('itemId') === 'item-1'));
    assert.ok(requests.every(({ apiKey }) => apiKey === 'test-api-key'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects malformed Pluggy pages with a typed API error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: null }), { status: 200 });

  try {
    await assert.rejects(
      getPluggyPages('test-api-key', '/accounts', { itemId: 'item-1' }),
      (error: unknown) => error instanceof ApiError && error.messageKey === 'pluggyResponseInvalid',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});