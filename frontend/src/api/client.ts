/**
 * API client utilities for communicating with the backend.
 * I'm centralizing all API calls here for consistency and easier maintenance.
 */

// TypeScript interfaces for type safety
export interface Show {
  id: number;
  name: string;
  start_time: string;
  total_seats: number;
  available_seats?: number;
  booked_seats?: number;
  created_at: string;
}

export interface Seat {
  id: number;
  seat_number: number;
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED';
}

export interface ShowDetails {
  show: Show;
  seats: Seat[];
}

export interface Booking {
  id: number;
  show_id: number;
  seat_ids: number[];
  user_email: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  created_at: string;
  confirmed_at: string | null;
  expires_at: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  unavailable_seats?: number[];
}

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`,
        unavailable_seats: data.unavailable_seats,
      };
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Fetch all shows
 */
export async function fetchShows(): Promise<ApiResponse<Show[]>> {
  return apiFetch<Show[]>('/shows');
}

/**
 * Fetch details for a specific show including seat layout
 */
export async function fetchShowDetails(showId: number): Promise<ApiResponse<ShowDetails>> {
  return apiFetch<ShowDetails>(`/shows/${showId}`);
}

/**
 * Create a new show (admin endpoint)
 */
export async function createShow(
  name: string,
  startTime: string,
  totalSeats: number
): Promise<ApiResponse<Show>> {
  return apiFetch<Show>('/admin/shows', {
    method: 'POST',
    body: JSON.stringify({
      name,
      start_time: startTime,
      total_seats: totalSeats,
    }),
  });
}

/**
 * Book seats for a show
 */
export async function bookSeats(
  showId: number,
  seatIds: number[],
  userEmail: string
): Promise<ApiResponse<{ booking_id: number; status: string; confirmed_at: string }>> {
  return apiFetch(`/booking/${showId}`, {
    method: 'POST',
    body: JSON.stringify({
      seat_ids: seatIds,
      user_email: userEmail,
    }),
  });
}

/**
 * Fetch booking details
 */
export async function fetchBooking(bookingId: number): Promise<ApiResponse<Booking>> {
  return apiFetch<Booking>(`/booking/${bookingId}`);
}
