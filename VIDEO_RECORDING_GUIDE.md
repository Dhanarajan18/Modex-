# 🎥 VIDEO RECORDING GUIDES

## Video 1: Product Explanation & Code Walkthrough (5-10 minutes)

### Recording Setup
- **Tool:** OBS Studio (free) or Windows Game Bar (Win+G)
- **Resolution:** 1920x1080 (1080p)
- **Format:** MP4
- **Upload:** YouTube (unlisted) or Google Drive

### Script & Flow

#### **Part 1: Introduction (1 min)**
```
"Hello! I'm [Your Name], and this is my Modex Ticket Booking System.

This is a production-ready web application that solves a critical problem:
preventing overbooking when multiple users try to book the same seat simultaneously.

Let me show you the live application and then walk through the code."
```

**Screen:** Show the homepage with show listings

---

#### **Part 2: Live Demo (2-3 min)**

**Step 1: Admin Panel**
```
"First, let's create a new show from the admin panel."
```
- Navigate to `/admin`
- Create show: "Spider-Man: No Way Home" with 50 seats
- Show created confirmation

**Step 2: User Experience**
```
"Now as a user, I can see all available shows."
```
- Go to homepage
- Click on the new show
- Show seat grid with green available seats

**Step 3: Booking Process**
```
"I'll select a few seats - notice they turn yellow when selected."
```
- Select seats 5, 6, 7
- Fill in name and email
- Click "Book Selected Seats"
- Show success message with booking ID

**Step 4: Concurrency Demo**
```
"The critical feature: what happens when two users book the same seat?"
```
- Open in 2 browser tabs side by side
- Both select seat 10
- Click Book in Tab 1 → Success
- Click Book in Tab 2 → "Seats no longer available" error
- **KEY POINT:** "This is our concurrency control working!"

---

#### **Part 3: Code Walkthrough (4-5 min)**

**Architecture Overview**
```
"Let's look at the code structure."
```
**Screen:** Show VS Code with project open
- Backend folder: Node.js, Express, PostgreSQL
- Frontend folder: React, TypeScript, Vite

**Database Schema**
```
"The foundation is these 3 tables."
```
**Screen:** Open `backend/src/migrations/001_create_tables.sql`
- Shows table: Event information
- Seats table: Individual seat status
- Bookings table: User reservations

**Concurrency Control (MOST IMPORTANT)**
```
"Here's how we prevent overbooking - this is the heart of the system."
```
**Screen:** Open `backend/src/routes/booking.js` (line 15-50)

Explain line by line:
1. **Line 20:** `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`
   - "Highest isolation level - prevents dirty reads"

2. **Line 30:** `SELECT ... FOR UPDATE`
   - "This locks the seat rows - other transactions must wait"

3. **Line 40:** Status validation
   - "Double-check seats are still available after lock"

4. **Line 50:** `COMMIT` or `ROLLBACK`
   - "All or nothing - atomic operation"

```
"So when 2 users click at the exact same time:
- User A acquires lock → books seat → releases lock
- User B waits → tries to lock → sees seat is booked → gets error
Zero chance of overbooking!"
```

**Frontend Components**
```
"On the frontend, it's React with TypeScript for type safety."
```
**Screen:** Open `frontend/src/components/SeatGrid.tsx`
- Show seat rendering logic
- Click handler for seat selection
- Color coding: green → yellow → gray

**API Integration**
```
"The frontend communicates via REST API."
```
**Screen:** Open `frontend/src/api/client.ts`
- Show axios configuration
- Booking endpoint call
- Error handling

**Styling**
```
"Finally, the modern UI with gradients and animations."
```
**Screen:** Open `frontend/src/styles.css`
- CSS variables for colors
- Gradient backgrounds
- Keyframe animations

---

#### **Part 4: Testing (1 min)**
```
"I've included a concurrency test script to prove it works."
```
**Screen:** Terminal
```bash
cd backend
npm run test-concurrency
```
- Show output: 20 requests, only 1 success, 19 conflicts
- "This validates our concurrency control!"

---

#### **Part 5: Conclusion (30 sec)**
```
"In summary:
✓ Full-stack booking system
✓ Bulletproof concurrency control
✓ Modern UI with React + TypeScript
✓ Production-ready with deployment configs

Thank you for watching!"
```

---

## Video 2: Deployment Explanation (3-5 minutes)

### Script & Flow

#### **Part 1: Introduction (30 sec)**
```
"In this video, I'll show you how I deployed the Modex system 
to production with a live URL accessible from anywhere."
```

---

#### **Part 2: GitHub Setup (1 min)**
```
"First, I pushed the code to GitHub."
```
**Screen:** Show GitHub repo at https://github.com/Dhanarajan18/Modex-
- Point out file structure
- Show README.md
- Show deployment configurations (vercel.json, Procfile)

---

#### **Part 3: Backend Deployment on Railway (2 min)**
```
"For the backend, I'm using Railway which provides:
- Automatic PostgreSQL database
- Free tier
- Auto-deployment from GitHub"
```

**Screen Recording Steps:**
1. Go to https://railway.app/
2. Click "New Project"
3. "Deploy from GitHub repo"
4. Select Modex repository
5. Railway detects Node.js

6. Add PostgreSQL:
   - Click "+ New" → "Database" → "PostgreSQL"
   - Show auto-generated DATABASE_URL

7. Configure service:
   - Settings → Root Directory: `backend`
   - Variables tab:
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     PORT=4000
     NODE_ENV=production
     ```

8. Deploy:
   - Show build logs
   - Migrations running automatically
   - Deployment success ✓

9. Get URL:
   ```
   "My backend is now live at: 
   https://modex-production-xxxx.up.railway.app"
   ```

---

#### **Part 4: Frontend Deployment on Vercel (2 min)**
```
"For the frontend, I'm using Vercel - optimized for React apps."
```

**Screen Recording Steps:**
1. Go to https://vercel.com/
2. Click "Import Project"
3. Select Modex repository
4. Configure:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Environment Variable:
   ```
   VITE_API_URL=https://your-railway-backend-url.up.railway.app
   ```

6. Deploy:
   - Show build process
   - Success message
   - Auto-generated URL

7. **Copy deployment URL:**
   ```
   "The live application:
   https://modex-xxx.vercel.app"
   ```

---

#### **Part 5: Live Test (1 min)**
```
"Let's verify everything works in production."
```
**Screen:** Open deployed URL
1. Create a show via admin panel
2. Book some seats as a user
3. Open developer tools → Network tab
4. Show API calls going to Railway backend
5. Successful booking confirmation

```
"Perfect! The entire system is live and working!"
```

---

#### **Part 6: Architecture Diagram (30 sec)**
```
"Here's the complete architecture:"

User Browser
    ↓
Vercel CDN (Frontend)
    ↓ HTTPS
Railway (Backend API)
    ↓
PostgreSQL Database
```

```
"All components are production-ready with:
✓ HTTPS encryption
✓ Auto-scaling
✓ Automatic deployments on Git push
✓ Global CDN for fast load times"
```

---

## Recording Tips

### For Both Videos:

**Audio:**
- Use headphone mic or USB mic (avoid laptop mic)
- Record in quiet room
- Speak clearly and at moderate pace

**Video Quality:**
- 1920x1080 resolution minimum
- 30fps or 60fps
- Close unnecessary tabs/apps
- Use full screen mode for demos

**Editing (Optional):**
- Trim silence at start/end
- Add captions for key points
- Speed up slow parts (migrations, npm install)
- Tools: DaVinci Resolve (free), Camtasia, or ScreenFlow

**Length Guidelines:**
- Product walkthrough: 5-10 minutes
- Deployment: 3-5 minutes
- Keep it concise but thorough

---

## Upload Instructions

### YouTube (Recommended)
1. Create/Login to YouTube account
2. Click "Create" → "Upload video"
3. Title: "Modex Ticket Booking System - [Product/Deployment] Demo"
4. Description: Include GitHub link
5. Visibility: **Unlisted** (not public, but shareable via link)
6. Copy shareable link

### Google Drive (Alternative)
1. Upload MP4 file to Google Drive
2. Right-click → "Get link"
3. Change to "Anyone with the link can view"
4. Copy link

---

## Quick Recording Checklist

**Before Recording:**
- [ ] Close all unnecessary apps
- [ ] Clear browser history (clean demo)
- [ ] Test audio levels
- [ ] Prepare script notes
- [ ] Have GitHub repo open
- [ ] Local app running (for product demo)
- [ ] Railway/Vercel accounts ready (for deployment)

**During Recording:**
- [ ] Speak clearly and at moderate pace
- [ ] Show code AND explain what it does
- [ ] Highlight key features (concurrency control!)
- [ ] Demonstrate actual booking flow
- [ ] Show error handling (conflict scenario)

**After Recording:**
- [ ] Watch full video for errors
- [ ] Check audio quality
- [ ] Trim unnecessary parts
- [ ] Upload to YouTube/Drive
- [ ] Test shareable link
- [ ] Copy link for submission

---

## Sample Video Titles

**Product Demo:**
- "Modex Ticket Booking System - Full Stack Web Application"
- "Concurrency-Safe Booking System - Code Walkthrough"
- "React + Node.js Booking System - Complete Demo"

**Deployment:**
- "Deploying Full Stack App to Railway + Vercel"
- "Modex System - Production Deployment Walkthrough"
- "Backend (Railway) + Frontend (Vercel) Deployment Guide"

---

Good luck with your recording! Keep it natural and enthusiastic. 🎬
