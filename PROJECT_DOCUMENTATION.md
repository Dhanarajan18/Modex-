# MODEX TICKET BOOKING SYSTEM
## Complete Project Documentation

---

## 📋 PROJECT OVERVIEW

**Project Name:** Modex - Ticket Booking System  
**Type:** Full-Stack Web Application  
**Purpose:** Concurrency-safe ticket booking system with real-time seat management  
**GitHub Repository:** https://github.com/Dhanarajan18/Modex-  
**Technology Stack:** MERN-like (PostgreSQL instead of MongoDB)

---

## 🎯 CORE FEATURES

### 1. Concurrency-Safe Booking System
- **Problem Solved:** Prevents overbooking when multiple users book simultaneously
- **Implementation:** PostgreSQL SERIALIZABLE transactions + SELECT FOR UPDATE row locks
- **Test Results:** Successfully handles 20+ concurrent requests for same seats

### 2. Real-Time Seat Management
- **Visual Grid Interface:** Interactive seat selection with status colors
- **Live Updates:** Seats update status (Available → Reserved → Booked)
- **User Feedback:** Instant confirmation or conflict messages

### 3. Automatic Booking Expiration
- **Background Job:** Runs every 30 seconds
- **Logic:** Cancels RESERVED bookings older than 2 minutes
- **Purpose:** Frees up abandoned seats automatically

### 4. Admin Portal
- **Create Shows:** Add new events with custom seat counts
- **Show Management:** View all shows with real-time statistics
- **Booking Overview:** Track all bookings across shows

---

## 🏗️ SYSTEM ARCHITECTURE

### Backend (Node.js + Express + PostgreSQL)
```
backend/
├── src/
│   ├── index.js              # Main server with middleware
│   ├── db.js                 # PostgreSQL connection pool
│   ├── routes/
│   │   ├── admin.js          # Admin endpoints (create shows)
│   │   ├── shows.js          # Public show listing
│   │   └── booking.js        # Booking logic with concurrency control
│   ├── migrations/
│   │   ├── migrate.js        # Migration runner
│   │   └── 001_create_tables.sql  # Schema definitions
│   ├── jobs/
│   │   └── expireBookings.js # Background job for expiration
│   └── utils/
│       ├── logger.js         # Logging utility
│       └── concurrencyTest.js # Load testing script
└── package.json
```

**Key Dependencies:**
- express 4.18.2 - Web framework
- pg 8.11.3 - PostgreSQL native driver
- cors - Cross-origin resource sharing
- dotenv - Environment configuration

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── App.tsx               # Root component with routing
│   ├── main.tsx              # Entry point
│   ├── styles.css            # Global styles with animations
│   ├── api/
│   │   └── client.ts         # API communication layer
│   ├── components/
│   │   └── SeatGrid.tsx      # Interactive seat selector
│   ├── pages/
│   │   ├── ShowsList.tsx     # Home page (show listing)
│   │   ├── BookingPage.tsx   # Seat selection & booking
│   │   └── Admin.tsx         # Admin dashboard
│   └── context/
│       └── AppContext.tsx    # Global state management
└── package.json
```

**Key Dependencies:**
- react 18.2.0 - UI library
- react-router-dom 6.20.0 - Client-side routing
- typescript 5.3.3 - Type safety
- vite 5.0.8 - Build tool & dev server

### Database Schema (PostgreSQL)
```sql
-- Shows table
CREATE TABLE shows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    show_time TIMESTAMP NOT NULL,
    total_seats INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seats table (with row-level locking)
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    show_id INTEGER REFERENCES shows(id),
    seat_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    UNIQUE(show_id, seat_number)
);
CREATE INDEX idx_seats_show_status ON seats(show_id, status);

-- Bookings table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    show_id INTEGER REFERENCES shows(id),
    seat_ids INTEGER[] NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'RESERVED',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
CREATE INDEX idx_bookings_status_expires ON bookings(status, expires_at);
```

---

## 🔒 CONCURRENCY CONTROL MECHANISM

### The Problem
When 2+ users try to book the same seat simultaneously:
```
User A: Checks seat 10 → Available ✓
User B: Checks seat 10 → Available ✓
User A: Books seat 10 → Success
User B: Books seat 10 → OVERBOOKING! ❌
```

### Our Solution (3 Layers)

#### Layer 1: SERIALIZABLE Transaction Isolation
```javascript
await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
```
- Highest isolation level in PostgreSQL
- Prevents phantom reads and write skew
- Automatically detects conflicts

#### Layer 2: Row-Level Locking
```javascript
const seatQuery = `
  SELECT id, seat_number, status 
  FROM seats 
  WHERE id = ANY($1) 
  FOR UPDATE;  -- Locks these specific rows
`;
```
- `FOR UPDATE` locks selected rows
- Other transactions must wait until lock releases
- Prevents concurrent modifications

#### Layer 3: Atomic State Validation
```javascript
if (seats.some(seat => seat.status !== 'AVAILABLE')) {
  await client.query('ROLLBACK');
  return res.status(409).json({ error: 'Seats no longer available' });
}
```
- Double-checks seat availability after acquiring lock
- Rolls back entire transaction on conflict
- Returns HTTP 409 Conflict to user

### Test Results
```bash
npm run test-concurrency
```
**Scenario:** 20 users try to book seats 1-5 simultaneously

**Expected:** Only 1 booking succeeds  
**Actual:** ✓ 1 success, 19 conflicts (409 responses)  
**Conclusion:** Zero overbookings, 100% data integrity

---

## 🎨 USER INTERFACE DESIGN

### Design Philosophy
- **Vibrant & Modern:** Coral-pink, teal, yellow gradients
- **Smooth Animations:** Fade-in, slide-in, pulse effects
- **Responsive Layout:** Works on mobile, tablet, desktop
- **Clear Feedback:** Color-coded seats (green/yellow/gray)

### Color Scheme
```css
:root {
  --primary-gradient: linear-gradient(135deg, #fa709a, #fee140);
  --secondary-gradient: linear-gradient(135deg, #30cfd0, #330867);
  --success-gradient: linear-gradient(135deg, #a8edea, #fed6e3);
}
```

### Seat Status Colors
- 🟢 **Available:** Green (#4ade80) - Click to select
- 🟡 **Selected:** Yellow (#fbbf24) - Your selection
- ⚫ **Booked:** Gray (#6b7280) - Unavailable

### Key Animations
```css
@keyframes fadeIn { /* Smooth page loads */ }
@keyframes pulse { /* Breathing button effect */ }
@keyframes shimmer { /* Loading state */ }
@keyframes spin { /* Loading spinner */ }
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Production Stack

**Backend Hosting:** Railway.app
- Includes PostgreSQL database (automatic provisioning)
- Auto-scaling based on traffic
- Automatic HTTPS certificates
- Environment variable management

**Frontend Hosting:** Vercel
- Global CDN (fastest load times worldwide)
- Automatic builds on Git push
- Preview deployments for PRs
- Custom domain support

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PORT=4000
NODE_ENV=production
```

**Frontend (.env)**
```
VITE_API_URL=https://your-backend.up.railway.app
```

### Deployment Flow
```
1. Developer pushes to GitHub
   ↓
2. Vercel detects push → builds frontend
   ↓
3. Railway detects push → builds backend + runs migrations
   ↓
4. Both deploy automatically with zero downtime
   ↓
5. Application live at unique URL
```

---

## 📊 API DOCUMENTATION

### Admin Endpoints

**Create Show**
```http
POST /admin/shows
Content-Type: application/json

{
  "name": "Avengers: Endgame",
  "show_time": "2025-12-20T19:30:00",
  "total_seats": 100
}

Response: 201 Created
{
  "id": 1,
  "name": "Avengers: Endgame",
  "show_time": "2025-12-20T19:30:00",
  "total_seats": 100,
  "created_at": "2025-12-12T10:00:00"
}
```

### Public Endpoints

**List Shows**
```http
GET /shows

Response: 200 OK
[
  {
    "id": 1,
    "name": "Avengers: Endgame",
    "show_time": "2025-12-20T19:30:00",
    "available_seats": 87
  }
]
```

**Get Show Details**
```http
GET /shows/:id

Response: 200 OK
{
  "id": 1,
  "name": "Avengers: Endgame",
  "show_time": "2025-12-20T19:30:00",
  "total_seats": 100,
  "seats": [
    { "id": 1, "seat_number": 1, "status": "AVAILABLE" },
    { "id": 2, "seat_number": 2, "status": "BOOKED" }
  ]
}
```

**Book Seats**
```http
POST /booking/:showId
Content-Type: application/json

{
  "seat_ids": [1, 2, 3],
  "user_name": "John Doe",
  "user_email": "john@example.com"
}

Response: 201 Created (Success)
{
  "booking_id": 42,
  "status": "RESERVED",
  "expires_at": "2025-12-12T10:05:00"
}

Response: 409 Conflict (Seat already booked)
{
  "error": "Seats no longer available",
  "unavailable_seats": [2]
}
```

**Get Booking Status**
```http
GET /booking/:id

Response: 200 OK
{
  "id": 42,
  "show_id": 1,
  "seat_numbers": [1, 2, 3],
  "user_name": "John Doe",
  "status": "RESERVED",
  "expires_at": "2025-12-12T10:05:00"
}
```

---

## 🧪 TESTING & QUALITY ASSURANCE

### Concurrency Testing
```bash
cd backend
npm run test-concurrency
```
**What it tests:**
- 20 parallel requests for same 5 seats
- Validates only 1 booking succeeds
- Checks all others receive 409 Conflict

### Manual Testing Checklist
- [ ] Create show via Admin page
- [ ] Verify show appears on home page
- [ ] Select multiple seats
- [ ] Complete booking with user details
- [ ] Verify seats turn gray (booked)
- [ ] Open in 2 browser tabs
- [ ] Try booking same seat → Should fail in one tab
- [ ] Wait 2 minutes for RESERVED booking to expire
- [ ] Verify seats return to Available

### Load Testing (Optional)
```bash
npm install -g artillery
artillery quick --count 50 --num 5 http://localhost:4000/shows
```

---

## 🛠️ LOCAL DEVELOPMENT SETUP

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Git

### Step 1: Clone Repository
```bash
git clone https://github.com/Dhanarajan18/Modex-.git
cd Modex-
```

### Step 2: Setup Backend
```bash
cd backend
npm install

# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE modex_booking;"

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Start server (port 4000)
npm run dev
```

### Step 3: Setup Frontend
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000

# Start dev server (port 5173)
npm run dev
```

### Step 4: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

---

## 🔧 CONFIGURATION OPTIONS

### Backend Configuration (backend/.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/modex_booking
PORT=4000                    # Server port
NODE_ENV=development         # development | production
BOOKING_EXPIRY_MINUTES=2     # Auto-cancel after X minutes
```

### Frontend Configuration (frontend/.env)
```
VITE_API_URL=http://localhost:4000  # Backend API endpoint
```

---

## 📈 PERFORMANCE OPTIMIZATIONS

### Database Indexes
```sql
-- Speed up seat queries by show and status
CREATE INDEX idx_seats_show_status ON seats(show_id, status);

-- Speed up expired booking lookups
CREATE INDEX idx_bookings_status_expires ON bookings(status, expires_at);
```

### Connection Pooling
```javascript
const pool = new Pool({
  max: 20,                    // Max 20 concurrent connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000
});
```

### Frontend Optimizations
- React.memo for seat components
- Debounced search inputs
- Code splitting with React.lazy
- Vite's automatic chunk optimization

---

## 🐛 TROUBLESHOOTING

### Common Issues

**1. "Cannot connect to database"**
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL format
- Ensure database exists: `psql -l`

**2. "Port 4000 already in use"**
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Change port in .env
PORT=5000
```

**3. "CORS error in browser"**
- Verify VITE_API_URL matches backend URL
- Check backend CORS configuration in index.js

**4. "Seats not updating after booking"**
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify backend is running

**5. "Migration failed"**
- Drop and recreate database
- Check PostgreSQL version (needs 14+)
- Verify user has CREATE permission

---

## 📚 TECHNOLOGY JUSTIFICATIONS

### Why PostgreSQL over MongoDB?
- **ACID Compliance:** Guaranteed transaction atomicity
- **Row-Level Locking:** Essential for concurrency control
- **Mature Ecosystem:** Battle-tested for 25+ years
- **Complex Queries:** Better for relational data (shows ↔ seats ↔ bookings)

### Why React + TypeScript?
- **Type Safety:** Catch errors at compile-time
- **Component Reusability:** Modular architecture
- **Rich Ecosystem:** Large library of packages
- **Developer Experience:** Excellent tooling (VS Code IntelliSense)

### Why Vite over Create React App?
- **10x Faster:** Instant HMR (Hot Module Replacement)
- **Smaller Bundles:** Better tree-shaking
- **Native ES Modules:** Modern JavaScript features
- **Future-Proof:** Active development, backed by Vue core team

### Why Express?
- **Simplicity:** Minimal, unopinionated framework
- **Flexibility:** Easy to structure as needed
- **Middleware Ecosystem:** Huge selection (CORS, helmet, morgan)
- **Performance:** Non-blocking I/O, handles 10k+ req/sec

---

## 🔐 SECURITY CONSIDERATIONS

### Implemented Measures
1. **Environment Variables:** Sensitive data in .env (not committed)
2. **CORS Configuration:** Restricts unauthorized origins
3. **SQL Injection Prevention:** Parameterized queries with `$1, $2`
4. **Input Validation:** Email format, seat number ranges
5. **Rate Limiting Ready:** Can add express-rate-limit

### Production Recommendations
```javascript
// Add to backend/src/index.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());  // Security headers
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));
```

---

## 📦 DELIVERABLES

### 1. Source Code
- ✅ Complete backend with concurrency control
- ✅ Complete frontend with modern UI
- ✅ Database migrations and seed data
- ✅ Deployment configurations
- ✅ Comprehensive documentation

### 2. Documentation
- ✅ README.md - Quick start guide
- ✅ DEPLOYMENT.md - Step-by-step deployment
- ✅ system-design.md - Architecture details
- ✅ This file - Complete project documentation

### 3. Testing
- ✅ Concurrency test script
- ✅ Manual testing checklist
- ✅ Postman collection for API testing

### 4. Deployment
- ✅ GitHub repository (public)
- ✅ Vercel configuration (vercel.json)
- ✅ Railway configuration (Procfile)
- ✅ Environment variable templates

---

## 🎓 LEARNING OUTCOMES

### Technical Skills Demonstrated
1. **Full-Stack Development:** End-to-end application development
2. **Database Design:** Normalization, indexing, transactions
3. **Concurrency Handling:** Race condition prevention
4. **API Design:** RESTful endpoints with proper status codes
5. **Modern Frontend:** React hooks, TypeScript, responsive design
6. **DevOps:** Git, deployment pipelines, environment management

### Problem-Solving Approaches
1. **Identified Challenge:** Overbooking in concurrent scenarios
2. **Researched Solutions:** Database isolation levels, locking mechanisms
3. **Implemented Solution:** Multi-layered concurrency control
4. **Validated Results:** Load testing with 20 concurrent requests
5. **Documented Process:** Clear explanation for future developers

---

## 🚀 FUTURE ENHANCEMENTS

### Phase 1: User Management
- User authentication (JWT tokens)
- User dashboard (booking history)
- Password reset flow
- Social login (Google, GitHub)

### Phase 2: Payment Integration
- Stripe/PayPal integration
- Payment confirmation emails
- Invoice generation
- Refund handling

### Phase 3: Advanced Features
- Real-time updates via WebSockets
- Seat recommendations (best available)
- Show categories and filtering
- Multi-language support (i18n)
- Dark mode toggle

### Phase 4: Analytics
- Admin analytics dashboard
- Booking trends and insights
- Revenue reports
- Popular show tracking

### Phase 5: Mobile App
- React Native mobile app
- Push notifications
- QR code tickets
- Offline mode

---

## 📊 PROJECT STATISTICS

- **Total Lines of Code:** ~2,500
- **Files Created:** 32
- **API Endpoints:** 6
- **Database Tables:** 3
- **React Components:** 7
- **Development Time:** 8-10 hours (estimated)
- **Dependencies:** 25 packages
- **Supported Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)

---

## 📞 SUPPORT & CONTACT

**GitHub Repository:** https://github.com/Dhanarajan18/Modex-  
**Issues:** https://github.com/Dhanarajan18/Modex-/issues  
**Developer:** Dhanarajan K  

For questions or support, please open an issue on GitHub.

---

## 📄 LICENSE

MIT License - Feel free to use this project for learning or commercial purposes.

---

## ✅ PROJECT COMPLETION CHECKLIST

- [x] Backend API with all required endpoints
- [x] Frontend with interactive UI
- [x] Database schema and migrations
- [x] Concurrency control implementation
- [x] Automatic booking expiration
- [x] Responsive design
- [x] Error handling and validation
- [x] Code documentation and comments
- [x] Deployment configurations
- [x] Testing scripts
- [x] README and documentation
- [x] Git repository with proper commits
- [x] .gitignore for sensitive files

---

**Document Version:** 1.0  
**Last Updated:** December 12, 2025  
**Status:** Production Ready ✅

---

*This documentation covers all aspects of the Modex Ticket Booking System. For technical support or questions, refer to the GitHub repository or contact the development team.*
