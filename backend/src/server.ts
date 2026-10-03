import type { Server } from 'node:http';
import { pool } from '../database/pool';
import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

let shutdownPromise: Promise<void> | undefined;

// Stop accepting requests before closing the pool so in-flight handlers can finish.
function shutdown(signal: NodeJS.Signals, httpServer: Server): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  console.info(`Received ${signal}; shutting down the API.`);

  shutdownPromise = new Promise<void>((resolve) => {
    httpServer.close((serverError) => {
      if (serverError) {
        console.error('Failed to close the HTTP server cleanly:', serverError);
        process.exitCode = 1;
      }

      void pool.end()
        .catch((poolError: unknown) => {
          console.error('Failed to close the database pool cleanly:', poolError);
          process.exitCode = 1;
        })
        .finally(resolve);
    });
  });

  return shutdownPromise;
}

process.once('SIGINT', () => void shutdown('SIGINT', server));
process.once('SIGTERM', () => void shutdown('SIGTERM', server));