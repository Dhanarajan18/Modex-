import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchShowDetails, ShowDetails } from '../api/client';
import SeatGrid from '../components/SeatGrid';

/**
 * Booking page where users can view and select seats for a show.
 * This is where the magic happens - seat selection and booking!
 */
export default function BookingPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState<ShowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showId) {
      setError('Invalid show ID');
      setLoading(false);
      return;
    }

    loadShowDetails(parseInt(showId));
  }, [showId]);

  async function loadShowDetails(id: number) {
    setLoading(true);
    setError(null);

    const response = await fetchShowDetails(id);

    if (response.success && response.data) {
      setShowDetails(response.data);
    } else {
      setError(response.error || 'Failed to load show details');
    }

    setLoading(false);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading show details...</div>
      </div>
    );
  }

  if (error || !showDetails) {
    return (
      <div className="container">
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Back to Shows
          </button>
        </div>
      </div>
    );
  }

  const availableSeats = showDetails.seats.filter(s => s.status === 'AVAILABLE').length;

  return (
    <div className="container">
      <div className="booking-header">
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          ← Back to Shows
        </button>
        <div>
          <h1>{showDetails.show.name}</h1>
          <p className="show-datetime">📅 {formatDate(showDetails.show.start_time)}</p>
          <p className="seat-count">
            💺 Available Seats: <strong>{availableSeats}</strong> / {showDetails.show.total_seats}
          </p>
        </div>
      </div>

      <SeatGrid
        showId={showDetails.show.id}
        seats={showDetails.seats}
        onBookingComplete={() => loadShowDetails(showDetails.show.id)}
      />
    </div>
  );
}
