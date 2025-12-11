import express from 'express';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /shows
 * Public endpoint to list all available shows.
 * I'm including seat availability counts to help users decide.
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        s.id,
        s.name,
        s.start_time,
        s.total_seats,
        s.created_at,
        COUNT(CASE WHEN st.status = 'AVAILABLE' THEN 1 END) as available_seats,
        COUNT(CASE WHEN st.status = 'BOOKED' THEN 1 END) as booked_seats
      FROM shows s
      LEFT JOIN seats st ON s.id = st.show_id
      GROUP BY s.id
      ORDER BY s.start_time ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching shows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shows'
    });
  }
});

/**
 * GET /shows/:id
 * Get detailed information about a specific show including seat layout.
 * This is what the frontend calls when rendering the booking page.
 */
router.get('/:id', async (req, res) => {
  const showId = parseInt(req.params.id);

  if (isNaN(showId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid show ID'
    });
  }

  try {
    // Fetch show details
    const showResult = await query(
      'SELECT * FROM shows WHERE id = $1',
      [showId]
    );

    if (showResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Show not found'
      });
    }

    const show = showResult.rows[0];

    // Fetch all seats for this show
    const seatsResult = await query(
      `SELECT id, seat_number, status 
       FROM seats 
       WHERE show_id = $1 
       ORDER BY seat_number`,
      [showId]
    );

    res.json({
      success: true,
      data: {
        show: show,
        seats: seatsResult.rows
      }
    });

  } catch (error) {
    logger.error('Error fetching show details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch show details'
    });
  }
});

export default router;
