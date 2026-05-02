/**
 * Centralized Redis configuration
 * Used across NestJS services and standalone worker processes
 */

export interface RedisConnectionConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
}

/**
 * Get Redis connection configuration from environment variables
 * @returns Redis connection configuration object
 */
export function getRedisConfig(): RedisConnectionConfig {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const db = parseInt(process.env.REDIS_DB || '0', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  console.log('Redis config::', { host, port, db, hasPassword: !!redisPassword });
  return { host, port, db, password: redisPassword };
}
