import dotenv from 'dotenv';

dotenv.config();

/**
 * Concurrency test script to verify our booking system handles race conditions.
 * 
 * This script simulates 20 concurrent users trying to book the same seats.
 * With proper concurrency control (SELECT FOR UPDATE), only one should succeed
 * and the others should get conflict errors.
 * 
 * Usage: node src/utils/concurrencyTest.js --showId=1 --seatIds=1,2,3
 * Or use: npm run test-concurrency
 */

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function makeBookingRequest(showId, seatIds, userEmail, requestNumber) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/booking/${showId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seat_ids: seatIds,
        user_email: userEmail
      })
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    return {
      requestNumber,
      success: response.ok,
      status: response.status,
      duration,
      data
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      requestNumber,
      success: false,
      status: 'ERROR',
      duration,
      error: error.message
    };
  }
}

async function runConcurrencyTest() {
  console.log('='.repeat(60));
  console.log('Modex Booking System - Concurrency Test');
  console.log('='.repeat(60));
  console.log();

  // Parse command line arguments
  const args = process.argv.slice(2);
  let showId = 1;
  let seatIds = [1, 2, 3];

  args.forEach(arg => {
    if (arg.startsWith('--showId=')) {
      showId = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--seatIds=')) {
      seatIds = arg.split('=')[1].split(',').map(id => parseInt(id));
    }
  });

  console.log(`Testing concurrent bookings for:`);
  console.log(`  Show ID: ${showId}`);
  console.log(`  Seat IDs: ${seatIds.join(', ')}`);
  console.log(`  Concurrent requests: 20`);
  console.log();

  // First, verify the show exists and seats are available
  console.log('Verifying show and seat availability...');
  try {
    const showResponse = await fetch(`${BASE_URL}/shows/${showId}`);
    if (!showResponse.ok) {
      console.error(`Error: Show ${showId} not found. Please check the show ID.`);
      process.exit(1);
    }
    const showData = await showResponse.json();
    const requestedSeats = showData.data.seats.filter(s => seatIds.includes(s.id));
    
    console.log(`✓ Show found: ${showData.data.show.name}`);
    console.log(`✓ Requested seats status:`);
    requestedSeats.forEach(seat => {
      console.log(`  Seat ${seat.seat_number}: ${seat.status}`);
    });
    console.log();

    const unavailable = requestedSeats.filter(s => s.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
      console.warn(`Warning: Some seats are not available. Test may fail immediately.`);
      console.log();
    }

  } catch (error) {
    console.error('Error verifying show:', error.message);
    process.exit(1);
  }

  console.log('Starting concurrent booking test...');
  console.log();

  const startTime = Date.now();

  // Launch 20 concurrent booking requests
  const promises = [];
  for (let i = 1; i <= 20; i++) {
    const userEmail = `test-user-${i}@example.com`;
    promises.push(makeBookingRequest(showId, seatIds, userEmail, i));
  }

  // Wait for all requests to complete
  const results = await Promise.all(promises);

  const totalDuration = Date.now() - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const conflicts = results.filter(r => r.status === 409);
  const errors = results.filter(r => !r.success && r.status !== 409);

  console.log('='.repeat(60));
  console.log('Test Results');
  console.log('='.repeat(60));
  console.log();
  console.log(`Total duration: ${totalDuration}ms`);
  console.log(`Total requests: 20`);
  console.log(`✓ Successful bookings: ${successful.length}`);
  console.log(`⚠ Conflict responses (409): ${conflicts.length}`);
  console.log(`✗ Errors: ${errors.length}`);
  console.log();

  // Show successful bookings
  if (successful.length > 0) {
    console.log('Successful Bookings:');
    successful.forEach(result => {
      console.log(`  Request #${result.requestNumber}: Booking ID ${result.data.data.booking_id} (${result.duration}ms)`);
    });
    console.log();
  }

  // Show conflicts
  if (conflicts.length > 0) {
    console.log('Conflict Responses (Expected):');
    conflicts.slice(0, 5).forEach(result => {
      console.log(`  Request #${result.requestNumber}: ${result.data.error} (${result.duration}ms)`);
    });
    if (conflicts.length > 5) {
      console.log(`  ... and ${conflicts.length - 5} more conflicts`);
    }
    console.log();
  }

  // Show errors
  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(result => {
      console.log(`  Request #${result.requestNumber}: ${result.error || result.data?.error} (${result.duration}ms)`);
    });
    console.log();
  }

  // Verdict
  console.log('='.repeat(60));
  console.log('Test Verdict:');
  console.log('='.repeat(60));
  
  if (successful.length === 1 && conflicts.length === 19) {
    console.log('✓ PASS: Exactly one booking succeeded, all others got conflicts.');
    console.log('  The concurrency control is working correctly!');
  } else if (successful.length === 1 && conflicts.length > 0) {
    console.log('✓ MOSTLY PASS: One booking succeeded, most got conflicts.');
    console.log(`  ${errors.length} requests encountered errors.`);
  } else if (successful.length > 1) {
    console.log('✗ FAIL: Multiple bookings succeeded for the same seats!');
    console.log('  This indicates a concurrency control problem.');
  } else if (successful.length === 0) {
    console.log('⚠ INCONCLUSIVE: No bookings succeeded.');
    console.log('  The seats might already be booked or there\'s a configuration issue.');
  }

  console.log();
  process.exit(successful.length > 1 ? 1 : 0);
}

// Run the test
runConcurrencyTest().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
