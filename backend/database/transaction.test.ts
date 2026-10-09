import assert from 'node:assert/strict';
import test from 'node:test';
import { withTransaction } from './transaction';

function createConnection(options: {
  failOn?: string;
} = {}) {
  const queries: string[] = [];
  let released = false;
  const connect = async () => ({
    query: async (sql: string) => {
      queries.push(sql);
      if (sql === options.failOn) throw new Error(`${sql} failed`);
    },
    release: () => {
      released = true;
    },
  });

  return {
    connect,
    queries,
    wasReleased: () => released,
  };
}

test('commits successful work and releases the client', async () => {
  const connection = createConnection();
  const result = await withTransaction(async (client) => {
    await client.query('SELECT 1');
    return 'complete';
  }, connection.connect);

  assert.equal(result, 'complete');
  assert.deepEqual(connection.queries, ['BEGIN', 'SELECT 1', 'COMMIT']);
  assert.equal(connection.wasReleased(), true);
});

test('rolls back failed work, rethrows the error, and releases the client', async () => {
  const connection = createConnection();

  await assert.rejects(
    withTransaction(async (client) => {
      await client.query('UPDATE account');
      throw new Error('operation failed');
    }, connection.connect),
    { message: 'operation failed' },
  );

  assert.deepEqual(connection.queries, ['BEGIN', 'UPDATE account', 'ROLLBACK']);
  assert.equal(connection.wasReleased(), true);
});

test('surfaces both operation and rollback failures', async () => {
  const connection = createConnection({ failOn: 'ROLLBACK' });

  await assert.rejects(
    withTransaction(async () => {
      throw new Error('operation failed');
    }, connection.connect),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(
        [...error.errors].map((cause) => cause instanceof Error ? cause.message : String(cause)),
        ['operation failed', 'ROLLBACK failed'],
      );
      return true;
    },
  );

  assert.deepEqual(connection.queries, ['BEGIN', 'ROLLBACK']);
  assert.equal(connection.wasReleased(), true);
});
