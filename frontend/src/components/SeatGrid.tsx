import { useState } from 'react';
import { Seat, bookSeats } from '../api/client';

interface SeatGridProps {
  showId: number;
  seats: Seat[];
  onBookingComplete: () => void;
}

/**
 * SeatGrid component - The heart of the booking interface.
 * 
 * I'm displaying seats in a grid layout where users can:
 * - See which seats are available (green), reserved (yellow), or booked (gray)
 * - Select multiple seats by clicking them
 * - Submit a booking request
 * - See real-time feedback on booking status
 */
export default function SeatGrid({ showId, seats, onBookingComplete }: SeatGridProps) {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function toggleSeat(seatId: number, status: string) {
    // Can only select AVAILABLE seats
    if (status !== 'AVAILABLE') {
      return;
    }

    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      } else {
        // Limit to 10 seats per booking
        if (prev.length >= 10) {
          setMessage({ type: 'error', text: 'Maximum 10 seats per booking' });
          return prev;
        }
        return [...prev, seatId];
      }
    });
  }

  async function handleBooking() {
    if (selectedSeats.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one seat' });
      return;
    }

    if (!userEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    setBooking(true);
    setMessage(null);

    const response = await bookSeats(showId, selectedSeats, userEmail);

    if (response.success && response.data) {
      setMessage({
        type: 'success',
        text: `Booking confirmed! Booking ID: ${response.data.booking_id}. Check your email for details.`,
      });
      setSelectedSeats([]);
      setUserEmail('');
      // Refresh the seat layout
      setTimeout(() => {
        onBookingComplete();
      }, 1500);
    } else {
      let errorText = response.error || 'Booking failed';
      
      // Show which seats were unavailable if the error is a conflict
      if (response.unavailable_seats && response.unavailable_seats.length > 0) {
        const unavailableNumbers = response.unavailable_seats
          .map((seatId) => {
            const seat = seats.find((s) => s.id === seatId);
            return seat ? seat.seat_number : seatId;
          })
          .join(', ');
        errorText = `Seats ${unavailableNumbers} are no longer available. Please refresh and try again.`;
      }

      setMessage({
        type: 'error',
        text: errorText,
      });
    }

    setBooking(false);
  }

  function getSeatClass(seat: Seat): string {
    if (selectedSeats.includes(seat.id)) {
      return 'seat selected';
    }
    switch (seat.status) {
      case 'AVAILABLE':
        return 'seat available';
      case 'RESERVED':
        return 'seat reserved';
      case 'BOOKED':
        return 'seat booked';
      default:
        return 'seat';
    }
  }

  // Calculate grid dimensions (try to make it roughly square)
  const totalSeats = seats.length;
  const seatsPerRow = Math.ceil(Math.sqrt(totalSeats));

  return (
    <div className="seat-grid-container">
      <div className="seat-legend">
        <div className="legend-item">
          <div className="seat available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="seat selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="seat reserved"></div>
          <span>Reserved</span>
        </div>
        <div className="legend-item">
          <div className="seat booked"></div>
          <span>Booked</span>
        </div>
      </div>

      <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${seatsPerRow}, 1fr)` }}>
        {seats.map((seat) => (
          <button
            key={seat.id}
            className={getSeatClass(seat)}
            onClick={() => toggleSeat(seat.id, seat.status)}
            disabled={seat.status !== 'AVAILABLE' || booking}
            title={`Seat ${seat.seat_number} - ${seat.status}`}
          >
            {seat.seat_number}
          </button>
        ))}
      </div>

      {selectedSeats.length > 0 && (
        <div className="booking-form">
          <p className="selected-seats-info">
            Selected seats: <strong>{selectedSeats.length}</strong>
          </p>

          <div className="form-group">
            <label htmlFor="email">Your Email</label>
            <input
              type="email"
              id="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your-email@example.com"
              required
            />
          </div>

          <button
            onClick={handleBooking}
            className="btn btn-primary btn-full"
            disabled={booking}
          >
            {booking ? 'Booking...' : `Book ${selectedSeats.length} Seat(s)`}
          </button>
        </div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
