import { getClient } from '../db.js';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Background job to expire PENDING bookings after 2 minutes.
 * 
 * I'm running this as a cron-like job that can be triggered periodically
 * (e.g., every minute via a scheduler like node-cron or external cron).
 * 
 * The job:
 * 1. Finds PENDING bookings that have exceeded their expiration time
 * 2. Marks them as FAILED
 * 3. Releases the associated seats back to AVAILABLE status
 * 
 * In production, you'd run this with a proper job scheduler or 
 * use PostgreSQL's pg_cron extension.
 */
async function expirePendingBookings() {
  const client = await getClient();

  try {
    logger.info('Starting booking expiration job...');

    // Start a transaction
    await client.query('BEGIN');

    // Find expired PENDING bookings
    const expiredBookingsResult = await client.query(
      `SELECT id, seat_ids, show_id 
       FROM bookings 
       WHERE status = 'PENDING' 
       AND expires_at < CURRENT_TIMESTAMP
       FOR UPDATE`
    );

    const expiredBookings = expiredBookingsResult.rows;

    if (expiredBookings.length === 0) {
      logger.info('No expired bookings found.');
      await client.query('COMMIT');
      return;
    }

    logger.info(`Found ${expiredBookings.length} expired bookings to process`);

    // Mark bookings as FAILED
    const bookingIds = expiredBookings.map(b => b.id);
    await client.query(
      `UPDATE bookings 
       SET status = 'FAILED' 
       WHERE id = ANY($1::int[])`,
      [bookingIds]
    );

    // Release all associated seats back to AVAILABLE
    for (const booking of expiredBookings) {
      await client.query(
        `UPDATE seats 
         SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ANY($1::int[]) AND status = 'RESERVED'`,
        [booking.seat_ids]
      );
      
      logger.info(`Released seats for booking ${booking.id}: ${booking.seat_ids.join(',')}`);
    }

    await client.query('COMMIT');

    logger.info(`Successfully expired ${expiredBookings.length} bookings`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in expiration job:', error);
    throw error;

  } finally {
    client.release();
  }
}

// If this script is run directly (not imported), execute the job
if (import.meta.url === `file://${process.argv[1]}`) {
  expirePendingBookings()
    .then(() => {
      logger.info('Expiration job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Expiration job failed:', error);
      process.exit(1);
    });
}

export default expirePendingBookings;
