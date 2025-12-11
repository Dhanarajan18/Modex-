import express from 'express';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /admin/shows
 * Admin endpoint to create a new show with seats.
 * I'm using a transaction here to ensure atomicity - either the show 
 * and all its seats are created, or nothing is.
 */
router.post('/shows', async (req, res) => {
  const { name, start_time, total_seats } = req.body;

  // Basic validation
  if (!name || !start_time || !total_seats) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, start_time, total_seats'
    });
  }

  if (total_seats < 1 || total_seats > 1000) {
    return res.status(400).json({
      success: false,
      error: 'total_seats must be between 1 and 1000'
    });
  }

  try {
    // Validate timestamp format
    const startTime = new Date(start_time);
    if (isNaN(startTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_time format. Use ISO 8601 format.'
      });
    }

    // Start a transaction to create show and seats atomically
    const client = await query('BEGIN');

    // Create the show
    const showResult = await query(
      'INSERT INTO shows (name, start_time, total_seats) VALUES ($1, $2, $3) RETURNING *',
      [name, start_time, total_seats]
    );

    const show = showResult.rows[0];
    logger.info(`Created show ${show.id}: ${name}`);

    // Create all seats for this show
    // I'm using a single INSERT with generate_series for efficiency
    await query(
      `INSERT INTO seats (show_id, seat_number, status)
       SELECT $1, generate_series(1, $2), 'AVAILABLE'`,
      [show.id, total_seats]
    );

    await query('COMMIT');

    logger.info(`Created ${total_seats} seats for show ${show.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: show.id,
        name: show.name,
        start_time: show.start_time,
        total_seats: show.total_seats,
        created_at: show.created_at
      }
    });

  } catch (error) {
    await query('ROLLBACK');
    logger.error('Error creating show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create show'
    });
  }
});

/**
 * GET /admin/shows/:id/seats
 * Get detailed seat information for a show (admin view)
 */
router.get('/shows/:id/seats', async (req, res) => {
  const showId = parseInt(req.params.id);

  if (isNaN(showId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid show ID'
    });
  }

  try {
    const result = await query(
      `SELECT id, seat_number, status, updated_at 
       FROM seats 
       WHERE show_id = $1 
       ORDER BY seat_number`,
      [showId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching seats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seats'
    });
  }
});

export default router;
