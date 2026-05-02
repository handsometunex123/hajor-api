/**
 * Centralized Redis configuration for scripts
 * Used by test-worker.js and other utility scripts
 */

function getRedisConfig() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  return { host, port, db };
}

module.exports = { getRedisConfig };
