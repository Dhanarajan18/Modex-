# Modex Booking System - System Design

## 🎯 Overview

This document details the architecture, design decisions, and scaling considerations for the Modex ticket booking system.

## 🏛️ High-Level Architecture

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   Browser   │─────────▶│   Vite Dev  │─────────▶│   Backend   │
│  (React UI) │  HTTP    │   Server    │  HTTP    │  (Express)  │
│             │◀─────────│  Port 5173  │◀─────────│  Port 4000  │
└─────────────┘          └─────────────┘          └──────┬──────┘
                                                          │
                                                          │ SQL
                                                          ▼
                                                   ┌─────────────┐
                                                   │ PostgreSQL  │
                                                   │  Database   │
                                                   └─────────────┘
```

## 📊 Database Schema Design

### Entity Relationship

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    Shows     │         │    Seats     │         │   Bookings   │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │────────▶│ id (PK)      │         │ id (PK)      │
│ name         │    1:N  │ show_id (FK) │    N:1  │ show_id (FK) │
│ start_time   │         │ seat_number  │◀────────│ seat_ids[]   │
│ total_seats  │         │ status       │         │ user_email   │
│ created_at   │         │ updated_at   │         │ status       │
└──────────────┘         └──────────────┘         │ created_at   │
                                                   │ confirmed_at │
                                                   │ expires_at   │
                                                   └──────────────┘
```

### Key Design Decisions

**Why separate Seats table?**
- Allows individual seat-level locking for concurrency control
- Each seat is an independent entity that can be locked with `SELECT ... FOR UPDATE`
- Enables granular status tracking (AVAILABLE, RESERVED, BOOKED)

**Why array of seat_ids in Bookings?**
- One booking can contain multiple seats
- Maintains referential integrity
- Makes it easy to query all seats for a booking

**Why status enums?**
- Type safety at database level
- Clear state machine for booking lifecycle
- Prevents invalid states

### Indexes Strategy

```sql
-- Critical for booking queries (filters by show + status)
CREATE INDEX idx_seats_show_status ON seats(show_id, status);

-- Used by SELECT ... FOR UPDATE (locks specific seats)
CREATE INDEX idx_seats_id ON seats(id);

-- For expiration job (finds expired pending bookings)
CREATE INDEX idx_bookings_status_expires ON bookings(status, expires_at);

-- For show-level booking queries
CREATE INDEX idx_bookings_show ON bookings(show_id);
```

These indexes ensure:
- Sub-millisecond seat availability checks
- Fast row locking during concurrent bookings
- Efficient expiration job queries

## 🔐 Concurrency Control Strategy

### The Overbooking Problem

When multiple users try to book the same seats simultaneously:

```
Time  User A               User B               Database
────────────────────────────────────────────────────────────
T1    Check seat 1         Check seat 1         Seat 1: AVAILABLE
T2    (Seat available)     (Seat available)     Seat 1: AVAILABLE
T3    Book seat 1          Book seat 1          ❌ OVERBOOKED!
```

### Our Solution: Multi-Layer Protection

#### Layer 1: Transaction Isolation
```javascript
await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
```
- SERIALIZABLE provides strongest isolation
- Prevents phantom reads and concurrent modifications
- Automatically detects conflicts and rolls back

#### Layer 2: Row-Level Locking
```javascript
const seats = await client.query(
  `SELECT id, status FROM seats 
   WHERE id = ANY($1) 
   FOR UPDATE`,  // ← Critical!
  [seatIds]
);
```

The `FOR UPDATE` clause:
- Locks the selected rows until transaction commits/rollbacks
- Other transactions wait or fail immediately
- Prevents race conditions at database level

#### Layer 3: Status Validation
```javascript
const unavailable = seats.filter(s => s.status !== 'AVAILABLE');
if (unavailable.length > 0) {
  await client.query('ROLLBACK');
  return conflict_error;
}
```

#### Layer 4: Atomic Updates
```javascript
// All or nothing - no partial bookings
await client.query('UPDATE seats SET status = RESERVED ...');
await client.query('INSERT INTO bookings ...');
await client.query('UPDATE bookings SET status = CONFIRMED ...');
await client.query('UPDATE seats SET status = BOOKED ...');
await client.query('COMMIT');  // All changes take effect atomically
```

### Corrected Flow

```
Time  User A               User B               Database
────────────────────────────────────────────────────────────
T1    BEGIN TRANSACTION    BEGIN TRANSACTION    
T2    SELECT ... FOR UPDATE                     Seat 1: LOCKED for User A
T3    (Seat available)     SELECT ... FOR UPDATE
T4    UPDATE seat 1        ⏸️ WAITING...         User B blocked
T5    COMMIT               ⏸️ WAITING...         Seat 1: BOOKED
T6                         (Seat unavailable)    
T7                         ROLLBACK (Conflict)   ✅ No overbooking!
```

## ⚙️ Booking State Machine

```
                    ┌─────────────┐
                    │   Request   │
                    │   Booking   │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Lock Seats (FOR      │
              │   UPDATE)              │
              └────────┬────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
         Available?          Unavailable
              │                 │
              ▼                 ▼
    ┌─────────────────┐   ┌─────────┐
    │ Reserve Seats   │   │ROLLBACK │
    │ (RESERVED)      │   │  409    │
    └────────┬────────┘   └─────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create Booking  │
    │ (PENDING)       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Confirm Booking │
    │ (CONFIRMED)     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Update Seats    │
    │ (BOOKED)        │
    └────────┬────────┘
             │
             ▼
      ┌──────────┐
      │ COMMIT   │
      │   201    │
      └──────────┘
```

## 🕐 Expiration System

### Why Expire Bookings?

- Users might abandon cart without completing payment
- Temporarily held seats should become available again
- Prevents indefinite seat locking

### Implementation

**Background Job** (`src/jobs/expireBookings.js`):
```javascript
// Runs periodically (e.g., every minute)
SELECT * FROM bookings 
WHERE status = 'PENDING' 
AND expires_at < CURRENT_TIMESTAMP
FOR UPDATE

// Mark as FAILED
UPDATE bookings SET status = 'FAILED' ...

// Release seats
UPDATE seats SET status = 'AVAILABLE' ...
```

**Execution Options**:
1. Manual: `npm run job`
2. Cron job: `* * * * * cd /path/to/backend && npm run job`
3. Node scheduler: Add `node-cron` to run internally
4. PostgreSQL: Use `pg_cron` extension

### Expiration Timeline

```
T0: User books seats
    └─ Seats: RESERVED
    └─ Booking: PENDING, expires_at = T0 + 2min

T0+30s: User still deciding
        └─ Booking: PENDING

T0+2min: Expiration job runs
         └─ Booking: FAILED
         └─ Seats: AVAILABLE (released)
```

## 📈 Scaling Considerations

### Current Capacity

**Single Server Setup**:
- 100-500 concurrent users
- ~50 bookings/second
- Limited by single database connection

### Horizontal Scaling Strategy

#### 1. Application Layer (Stateless)

```
         ┌─────────────┐
         │Load Balancer│
         │  (nginx)    │
         └──────┬──────┘
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
    ┌─────┐ ┌─────┐ ┌─────┐
    │ API │ │ API │ │ API │
    │  1  │ │  2  │ │  3  │
    └──┬──┘ └──┬──┘ └──┬──┘
       └───────┼───────┘
               ▼
        ┌─────────────┐
        │ PostgreSQL  │
        └─────────────┘
```

**Benefits**:
- Add more API servers as needed
- Each server handles subset of requests
- No shared state between servers

**Implementation**:
- Use PM2 cluster mode or Docker Swarm
- Session affinity not required (stateless)
- Health checks on `/health` endpoint

#### 2. Database Layer (Vertical + Read Replicas)

```
     ┌─────────────┐
     │   Primary   │ ◀── Writes only
     │  (Master)   │
     └──────┬──────┘
            │
      Replication
            │
   ┌────────┼────────┐
   │        │        │
   ▼        ▼        ▼
┌─────┐ ┌─────┐ ┌─────┐
│Read │ │Read │ │Read │ ◀── Reads only
│ Rep │ │ Rep │ │ Rep │
└─────┘ └─────┘ └─────┘
```

**Read Replica Strategy**:
- Direct all bookings to primary (writes)
- Route show listings to replicas (reads)
- 90% of traffic is reads (browsing shows)
- Significant load reduction on primary

**Connection Pooling**:
```javascript
// Increase pool size for high traffic
const pool = new Pool({
  max: 50,  // 50 connections per API server
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 3. Caching Strategy

**Redis Cache Layer**:
```javascript
// Cache show listings (changes infrequently)
const shows = await redis.get('shows:all');
if (!shows) {
  const dbShows = await db.query('SELECT * FROM shows');
  await redis.set('shows:all', JSON.stringify(dbShows), 'EX', 60);
}

// Cache seat availability (TTL: 5 seconds)
const seats = await redis.get(`seats:${showId}`);
```

**What to Cache**:
- ✅ Show listings (TTL: 60s)
- ✅ Seat availability (TTL: 5s)
- ❌ Never cache booking transactions (always fresh)

**Cache Invalidation**:
- Invalidate on show creation
- Invalidate seats on booking
- Use pub/sub for multi-server invalidation

#### 4. Message Queue for Background Jobs

**Current**: Manual cron job
**Scaled**: Bull + Redis queue

```javascript
// Producer (API server)
await bookingQueue.add('expire-check', {}, {
  repeat: { every: 60000 }  // Every minute
});

// Consumer (dedicated worker)
bookingQueue.process('expire-check', async (job) => {
  await expirePendingBookings();
});
```

**Benefits**:
- Dedicated workers for background tasks
- Automatic retry on failure
- Better monitoring and observability

### Performance Optimizations

#### Database Optimizations

**Partitioning** (for massive scale):
```sql
-- Partition shows by date
CREATE TABLE shows_2025_12 PARTITION OF shows
FOR VALUES FROM ('2025-12-01') TO ('2025-12-31');
```

**Query Optimization**:
```sql
-- Use prepared statements
PREPARE book_seats AS 
  SELECT * FROM seats WHERE id = ANY($1) FOR UPDATE;

EXECUTE book_seats(ARRAY[1,2,3]);
```

#### Application Optimizations

**Connection Pooling Math**:
```
Max connections = (# of API servers) × (pool size per server)
Example: 5 servers × 50 pool size = 250 connections

PostgreSQL can handle ~1000 concurrent connections
Reserve 20% for admin/maintenance = 800 usable
```

**Rate Limiting**:
```javascript
// Prevent abuse and DDoS
const rateLimit = require('express-rate-limit');
app.use('/booking', rateLimit({
  windowMs: 60000,  // 1 minute
  max: 10           // 10 requests per IP
}));
```

### Monitoring & Observability

**Key Metrics to Track**:
- Database connection pool utilization
- Transaction duration (p50, p95, p99)
- Booking success rate vs conflicts
- Seat availability changes per second
- API response times

**Tools**:
- Application: Prometheus + Grafana
- Database: pgAdmin, pg_stat_statements
- Logging: Winston → ELK Stack
- Alerting: PagerDuty for critical failures

## 🚀 Advanced Features (Future)

### 1. Payment Integration
```
Reserve (2 min) → Payment Gateway → Confirm
                        ↓
                     Timeout
                        ↓
                    Release
```

### 2. WebSocket for Real-Time Updates
```javascript
// Push seat availability to all connected clients
io.emit('seat-update', {
  showId: 1,
  seatId: 42,
  status: 'BOOKED'
});
```

### 3. Waiting List / Queue System
- Users join queue when show sold out
- Auto-notify when seats become available
- FIFO with time-limited claim

### 4. Dynamic Pricing
- Early bird discounts
- Surge pricing for popular shows
- Price stored with each seat

### 5. Multi-Datacenter Deployment
- Active-active across regions
- Conflict resolution for concurrent bookings
- CRDT or operational transformation

## 🔒 Security Considerations

### Current Implementation
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- CORS enabled for frontend domain
- Rate limiting (recommended)

### Production Additions
- JWT authentication for users
- Role-based access control (admin vs user)
- HTTPS/TLS encryption
- API key authentication
- Request signing
- DDoS protection (Cloudflare)

## 💡 Key Takeaways

1. **Concurrency is Hard**: Database-level locking is more reliable than application-level
2. **Transactions are Essential**: SERIALIZABLE + FOR UPDATE prevents race conditions
3. **Indexes Matter**: Proper indexes make queries 100x faster
4. **Cache Wisely**: Cache reads aggressively, never cache writes
5. **Monitor Everything**: Can't improve what you don't measure
6. **Scale Horizontally**: Stateless API servers scale infinitely
7. **Database is Bottleneck**: Eventually need read replicas or sharding

## 📚 References

- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [SELECT FOR UPDATE Documentation](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Author**: Modex Engineering Team
