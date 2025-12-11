import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

dotenv.config();

// I'm creating a connection pool to PostgreSQL using the native pg driver.
// This pool will handle multiple concurrent connections efficiently.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the database connection on startup
pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Execute a query with automatic connection handling.
 * For simple queries that don't need transaction control.
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transaction control.
 * This is crucial for our concurrency-safe booking logic.
 * Remember to release the client after use!
 */
export const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Add timeout to prevent hanging transactions
  const timeout = setTimeout(() => {
    logger.error('Client checkout timeout - releasing');
    client.release();
  }, 30000);

  // Override release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
};

export default pool;
