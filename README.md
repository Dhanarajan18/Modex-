# Modex Ticket Booking System

A production-ready, concurrency-safe ticket booking system built with Node.js, Express, PostgreSQL, React, and TypeScript.

## 🎯 Project Overview

This system allows admins to create shows/events and users to book seats with robust concurrency control to prevent overbooking. The backend uses PostgreSQL transactions with `SELECT ... FOR UPDATE` to ensure data integrity under high load.

## ✨ Key Features

- **Concurrency-Safe Booking**: Prevents overbooking using database-level row locking
- **Real-Time Seat Status**: Visual grid showing available, reserved, and booked seats
- **Automatic Expiration**: Background job expires pending bookings after 2 minutes
- **RESTful API**: Clean, well-documented endpoints with proper error handling
- **Type-Safe Frontend**: Built with TypeScript for better developer experience
- **Production-Ready**: Includes logging, error handling, and proper database connection pooling

## 🏗️ Architecture

- **Backend**: Node.js + Express + PostgreSQL (native `pg` driver)
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL with proper indexes and constraints
- **State Management**: React Context API
- **Styling**: Pure CSS with modern, responsive design

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ 
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd Modex

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Configure Database

Edit `backend/.env` and update the DATABASE_URL:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/modex_booking
```

Create the database:

```bash
# On Windows with PostgreSQL installed
psql -U postgres
CREATE DATABASE modex_booking;
\q
```

### 3. Install Dependencies and Run Migrations

```bash
# Backend
cd backend
npm install
npm run migrate

# Frontend (in a new terminal)
cd frontend
npm install
```

### 4. Start the Application

```bash
# Terminal 1 - Backend (from backend/ directory)
npm run dev

# Terminal 2 - Frontend (from frontend/ directory)  
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health

## 🧪 Testing Concurrency

Run the concurrency test to verify the booking system handles race conditions properly:

```bash
cd backend
npm run test-concurrency
```

This simulates 20 concurrent booking attempts for the same seats. With proper concurrency control, only 1 should succeed and the rest should receive conflict errors.

To test with specific shows/seats:

```bash
node src/utils/concurrencyTest.js --showId=1 --seatIds=1,2,3
```

## 📚 API Documentation

### Admin Endpoints

**Create Show**
```http
POST /admin/shows
Content-Type: application/json

{
  "name": "Concert - Amazing Band",
  "start_time": "2025-12-20T19:00:00Z",
  "total_seats": 40
}
```

### Public Endpoints

**List All Shows**
```http
GET /shows
```

**Get Show Details**
```http
GET /shows/:id
```

**Book Seats**
```http
POST /booking/:showId
Content-Type: application/json

{
  "seat_ids": [1, 2, 3],
  "user_email": "user@example.com"
}
```

**Get Booking Status**
```http
GET /booking/:id
```

## 🔧 Available Scripts

### Backend

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run job` - Run booking expiration job once
- `npm run test-concurrency` - Run concurrency test

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🗄️ Database Schema

### Shows
- `id` - Primary key
- `name` - Show name
- `start_time` - Show start timestamp
- `total_seats` - Total number of seats
- `created_at` - Creation timestamp

### Seats
- `id` - Primary key
- `show_id` - Foreign key to shows
- `seat_number` - Seat number (1-N)
- `status` - AVAILABLE | RESERVED | BOOKED
- `updated_at` - Last update timestamp

### Bookings
- `id` - Primary key
- `show_id` - Foreign key to shows
- `seat_ids` - Array of seat IDs
- `user_email` - User email (optional)
- `status` - PENDING | CONFIRMED | FAILED
- `created_at` - Creation timestamp
- `confirmed_at` - Confirmation timestamp
- `expires_at` - Expiration timestamp (PENDING bookings)

## 🔒 Concurrency Control Strategy

I implemented a multi-layered approach to prevent overbooking:

1. **Serializable Transactions**: Each booking uses `SERIALIZABLE` isolation level
2. **Row-Level Locking**: `SELECT ... FOR UPDATE` locks specific seat rows
3. **Status Validation**: Seats must be AVAILABLE before booking
4. **Atomic Updates**: All changes commit together or rollback
5. **Expiration System**: Background job releases unreserved seats

See [system-design.md](system-design.md) for detailed architecture documentation.

## 📦 Project Structure

```
Modex/
├── backend/
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── migrations/     # Database migrations
│   │   ├── jobs/           # Background jobs
│   │   ├── utils/          # Utilities and helpers
│   │   ├── db.js           # Database connection
│   │   └── index.js        # Application entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── context/        # Context providers
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Root component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── .env.example
├── postman_collection.json # API test collection
├── system-design.md        # Architecture documentation
└── README.md               # This file
```

## 🐛 Troubleshooting

**Database connection fails**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in backend/.env
- Ensure database exists and user has permissions

**Migration errors**
- Drop and recreate database if needed
- Check PostgreSQL version (14+ required)

**Frontend can't connect to backend**
- Verify backend is running on port 4000
- Check VITE_API_URL in frontend/.env
- Check CORS settings if deployed

**Concurrency test fails**
- Ensure sample data exists (run migrations)
- Check seat availability before running test
- Verify database supports transactions

## 🚢 Production Deployment

1. Set `NODE_ENV=production` in backend
2. Use a process manager (PM2, systemd)
3. Set up PostgreSQL connection pooling
4. Configure reverse proxy (nginx)
5. Build frontend: `npm run build`
6. Serve frontend static files
7. Set up SSL certificates
8. Configure monitoring and logging

## 📝 What I Changed / Developer Notes

I built this system from scratch focusing on simplicity and correctness. The key challenge was ensuring no overbooking could occur even under extreme concurrency. I chose PostgreSQL's `SELECT ... FOR UPDATE` within serializable transactions as it provides strong guarantees without complex application-level locking.

For the frontend, I kept it minimal but functional - no heavy libraries, just React, TypeScript, and clean CSS. The seat grid updates immediately and shows clear visual feedback.

The background job for expiring pending bookings is simple but effective. In production, I'd run it via cron or a proper job queue like Bull.

All code has comments explaining the "why" behind decisions. I wanted this to be readable and maintainable, not just working.

## 📄 License

MIT

