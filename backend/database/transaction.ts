import type { PoolClient } from 'pg';
import { pool } from './pool';

type TransactionClient = Pick<PoolClient, 'query' | 'release'>;
type TransactionConnection = () => Promise<TransactionClient>;

const connectClient: TransactionConnection = () => pool.connect();

export async function withTransaction<T>(
  operation: (client: TransactionClient) => Promise<T>,
  connect: TransactionConnection = connectClient,
): Promise<T> {
  const client = await connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Transaction failed and rollback also failed.',
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
