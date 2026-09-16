import { createProductionApp } from './http/production-runtime';

const { app, pool } = createProductionApp();
const port = Number.parseInt(process.env.PORT ?? '3001', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`PRODX POS API listening on port ${port}`);
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down PRODX POS API.`);
  server.close(async error => {
    try {
      await pool.end();
      if (error) {
        console.error('HTTP server shutdown failed.', error);
        process.exitCode = 1;
      }
    } catch (poolError) {
      console.error('PostgreSQL pool shutdown failed.', poolError);
      process.exitCode = 1;
    }
  });
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
