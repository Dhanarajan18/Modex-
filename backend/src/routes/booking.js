import express from 'express';
import { getClient } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /booking/:showId
 * This is the critical booking endpoint with concurrency control.
 * 
 * My strategy here:
 * 1. Start a transaction
 * 2. Use SELECT ... FOR UPDATE to lock the specific seat rows
 * 3. Check if seats are available
 * 4. Update seats to RESERVED status
 * 5. Create booking record with PENDING status
 * 6. Immediately confirm the booking (atomic operation)
 * 7. Commit transaction
 * 
 * The FOR UPDATE lock prevents other concurrent transactions from 
 * reading or modifying these rows until we commit or rollback.
 * This is how I prevent overbooking!
 */
router.post('/:showId', async (req, res) => {
  const showId = parseInt(req.params.showId);
  const { seat_ids, user_email } = req.body;

  // Input validation
  if (isNaN(showId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid show ID'
    });
  }

  if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'seat_ids must be a non-empty array'
    });
  }

  if (seat_ids.length > 10) {
    return res.status(400).json({
      success: false,
      error: 'Cannot book more than 10 seats at once'
    });
  }

  const client = await getClient();

  try {
    // Start transaction with serializable isolation level for maximum safety
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    logger.info(`Booking attempt for show ${showId}, seats: ${seat_ids.join(',')}`);

    // CRITICAL: Lock the specific seat rows we want to book
    // The FOR UPDATE clause prevents other transactions from modifying these rows
    const seatCheckResult = await client.query(
      `SELECT id, seat_number, status, show_id 
       FROM seats 
       WHERE id = ANY($1::int[]) AND show_id = $2
       FOR UPDATE`,
      [seat_ids, showId]
    );

    // Verify we found all requested seats
    if (seatCheckResult.rows.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'One or more seat IDs are invalid for this show'
      });
    }

    // Check if all seats are available
    const unavailableSeats = seatCheckResult.rows.filter(
      seat => seat.status !== 'AVAILABLE'
    );

    if (unavailableSeats.length > 0) {
      await client.query('ROLLBACK');
      const unavailableSeatNumbers = unavailableSeats.map(s => s.seat_number);
      logger.warn(`Booking failed: seats ${unavailableSeatNumbers.join(',')} not available`);
      
      return res.status(409).json({
        success: false,
        error: 'One or more seats are already booked',
        unavailable_seats: unavailableSeatNumbers
      });
    }

    // Reserve the seats by updating their status to RESERVED
    await client.query(
      `UPDATE seats 
       SET status = 'RESERVED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1::int[])`,
      [seat_ids]
    );

    // Create booking record with PENDING status and 2-minute expiration
    const bookingResult = await client.query(
      `INSERT INTO bookings (show_id, seat_ids, user_email, status, expires_at) 
       VALUES ($1, $2, $3, 'PENDING', CURRENT_TIMESTAMP + INTERVAL '2 minutes')
       RETURNING *`,
      [showId, seat_ids, user_email || null]
    );

    const booking = bookingResult.rows[0];

    // Immediately confirm the booking (simplest flow for this demo)
    // In a real system, you might want a separate payment step here
    await client.query(
      `UPDATE bookings 
       SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [booking.id]
    );

    // Update seats to BOOKED status
    await client.query(
      `UPDATE seats 
       SET status = 'BOOKED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1::int[])`,
      [seat_ids]
    );

    // Commit the transaction - all changes take effect atomically
    await client.query('COMMIT');

    logger.info(`Booking ${booking.id} confirmed successfully`);

    // Fetch the final booking state to return
    const finalBooking = await client.query(
      'SELECT * FROM bookings WHERE id = $1',
      [booking.id]
    );

    res.status(201).json({
      success: true,
      data: {
        booking_id: booking.id,
        status: 'CONFIRMED',
        show_id: showId,
        seat_ids: seat_ids,
        user_email: user_email,
        confirmed_at: finalBooking.rows[0].confirmed_at
      }
    });

  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    
    logger.error('Booking error:', error);
    
    // Handle serialization failures specifically
    if (error.code === '40001') {
      return res.status(409).json({
        success: false,
        error: 'Booking conflict detected. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Booking failed due to server error'
    });

  } finally {
    // Always release the client back to the pool
    client.release();
  }
});

/**
 * GET /booking/:id
 * Check the status of a specific booking.
 */
router.get('/:id', async (req, res) => {
  const bookingId = parseInt(req.params.id);

  if (isNaN(bookingId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid booking ID'
    });
  }

  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT 
        b.*,
        s.name as show_name,
        s.start_time as show_start_time
       FROM bookings b
       JOIN shows s ON b.show_id = s.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /booking/show/:showId
 * Get all bookings for a specific show (useful for admin/debugging)
 */
router.get('/show/:showId', async (req, res) => {
  const showId = parseInt(req.params.showId);

  if (isNaN(showId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid show ID'
    });
  }

  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT * FROM bookings 
       WHERE show_id = $1 
       ORDER BY created_at DESC`,
      [showId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  } finally {
    client.release();
  }
});

export default router;
