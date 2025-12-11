import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchShows } from '../api/client';
import { useAppContext } from '../context/AppContext';

/**
 * Shows list page - the main landing page.
 * Users can browse available shows and click to book seats.
 */
export default function ShowsList() {
  const navigate = useNavigate();
  const { shows, setShows } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShows();
  }, []);

  async function loadShows() {
    setLoading(true);
    setError(null);

    const response = await fetchShows();

    if (response.success && response.data) {
      setShows(response.data);
    } else {
      setError(response.error || 'Failed to load shows');
    }

    setLoading(false);
  }

  function handleBookClick(showId: number) {
    navigate(`/booking/${showId}`);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading shows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={loadShows} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Available Shows</h1>
        <button onClick={loadShows} className="btn btn-secondary">
          🔄 Refresh
        </button>
      </div>

      {shows.length === 0 ? (
        <div className="empty-state">
          <p>No shows available yet.</p>
          <p>
            <a href="/admin">Create your first show</a> to get started!
          </p>
        </div>
      ) : (
        <div className="shows-grid">
          {shows.map((show) => (
            <div key={show.id} className="show-card">
              <div className="show-card-header">
                <h2>{show.name}</h2>
                <span className="show-id">ID: {show.id}</span>
              </div>

              <div className="show-details">
                <div className="detail-row">
                  <span className="label">📅 Date & Time:</span>
                  <span className="value">{formatDate(show.start_time)}</span>
                </div>

                <div className="detail-row">
                  <span className="label">💺 Total Seats:</span>
                  <span className="value">{show.total_seats}</span>
                </div>

                <div className="detail-row">
                  <span className="label">✅ Available:</span>
                  <span className="value available">
                    {show.available_seats ?? 'N/A'}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="label">🎫 Booked:</span>
                  <span className="value booked">
                    {show.booked_seats ?? 'N/A'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleBookClick(show.id)}
                className="btn btn-primary btn-full"
                disabled={(show.available_seats ?? 0) === 0}
              >
                {(show.available_seats ?? 0) > 0 ? 'Book Tickets' : 'Sold Out'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
