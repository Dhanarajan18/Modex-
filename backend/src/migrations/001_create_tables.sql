-- Modex Ticket Booking System - Database Schema
-- I'm creating tables for shows, seats, and bookings with proper constraints
-- and indexes to ensure data integrity and query performance.

-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS shows CASCADE;

-- Shows table: stores information about events/shows/trips
CREATE TABLE shows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seats table: individual seat records for each show
-- Each seat can be AVAILABLE, RESERVED (temporarily held), or BOOKED (confirmed)
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'BOOKED')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(show_id, seat_number)
);

-- Bookings table: tracks booking attempts and their status
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    seat_ids INTEGER[] NOT NULL, -- Array of seat IDs booked
    user_email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for performance optimization
-- These indexes speed up our most common queries

-- Index for finding seats by show and status (critical for booking queries)
CREATE INDEX idx_seats_show_status ON seats(show_id, status);

-- Index for finding specific seats by their IDs (used in SELECT FOR UPDATE)
CREATE INDEX idx_seats_id ON seats(id);

-- Index for finding bookings by status and expiration (for the cleanup job)
CREATE INDEX idx_bookings_status_expires ON bookings(status, expires_at);

-- Index for finding bookings by show
CREATE INDEX idx_bookings_show ON bookings(show_id);

-- Insert a sample show with 40 seats for testing
INSERT INTO shows (name, start_time, total_seats) 
VALUES ('Sample Concert - The Amazing Band', CURRENT_TIMESTAMP + INTERVAL '7 days', 40);

-- Create 40 seats for the sample show (show_id = 1)
INSERT INTO seats (show_id, seat_number, status)
SELECT 1, generate_series(1, 40), 'AVAILABLE';

-- Add a second show for more testing scenarios
INSERT INTO shows (name, start_time, total_seats) 
VALUES ('Movie Premiere - Blockbuster 2025', CURRENT_TIMESTAMP + INTERVAL '14 days', 60);

-- Create 60 seats for the second show (show_id = 2)
INSERT INTO seats (show_id, seat_number, status)
SELECT 2, generate_series(1, 60), 'AVAILABLE';

-- Verification queries (optional - comment out for production)
-- SELECT 'Shows created:', COUNT(*) FROM shows;
-- SELECT 'Seats created:', COUNT(*) FROM seats;
