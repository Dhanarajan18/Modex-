import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple migration runner that executes the SQL file.
 * In production, you'd use a proper migration tool like node-pg-migrate or Flyway.
 * But for this demo, I'm keeping it simple and straightforward.
 */
async function runMigration() {
  logger.info('Starting database migration...');
  
  try {
    const sqlPath = path.join(__dirname, '001_create_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    logger.info('Migration completed successfully!');
    logger.info('Sample shows and seats have been created.');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
