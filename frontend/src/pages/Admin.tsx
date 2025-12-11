import { useState } from 'react';
import { createShow } from '../api/client';
import { useAppContext } from '../context/AppContext';

/**
 * Admin page for creating new shows.
 * I'm keeping the form simple but functional with basic validation.
 */
export default function Admin() {
  const { refreshShows } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    total_seats: 40,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Basic validation
    if (!formData.name || !formData.start_time) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      setLoading(false);
      return;
    }

    if (formData.total_seats < 1 || formData.total_seats > 1000) {
      setMessage({ type: 'error', text: 'Total seats must be between 1 and 1000' });
      setLoading(false);
      return;
    }

    const response = await createShow(
      formData.name,
      formData.start_time,
      formData.total_seats
    );

    if (response.success && response.data) {
      setMessage({
        type: 'success',
        text: `Show created successfully! ID: ${response.data.id}`,
      });
      // Reset form
      setFormData({
        name: '',
        start_time: '',
        total_seats: 40,
      });
      // Refresh shows list in context
      refreshShows();
    } else {
      setMessage({
        type: 'error',
        text: response.error || 'Failed to create show',
      });
    }

    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Create new shows for booking</p>
      </div>

      <div className="admin-form-container">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="name">Show Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Concert - Amazing Band"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="start_time">Start Date & Time *</label>
            <input
              type="datetime-local"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="total_seats">Total Seats *</label>
            <input
              type="number"
              id="total_seats"
              name="total_seats"
              value={formData.total_seats}
              onChange={handleChange}
              min="1"
              max="1000"
              required
            />
            <small>Choose between 1 and 1000 seats</small>
          </div>

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Show'}
          </button>
        </form>

        <div className="admin-info">
          <h3>📝 How it works:</h3>
          <ol>
            <li>Enter the show name (e.g., concert, movie, trip)</li>
            <li>Select the start date and time</li>
            <li>Specify the number of seats to create</li>
            <li>Click "Create Show" to generate the show with all seats</li>
          </ol>
          <p>
            All seats will be created automatically with "AVAILABLE" status.
            Users can then book them from the main page.
          </p>
        </div>
      </div>
    </div>
  );
}
