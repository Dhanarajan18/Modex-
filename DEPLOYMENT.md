# Deployment Guide

## 🚀 Deploy to GitHub + Vercel + Railway

Follow these steps to deploy your Modex system and get a unique URL.

---

## Step 1: Push to GitHub

1. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name: `modex-booking-system` (or your choice)
   - Keep it **Public** or **Private**
   - **Do NOT** initialize with README (we already have files)
   - Click "Create repository"

2. **Push your code** (run these commands in your project folder):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/modex-booking-system.git
   git branch -M main
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Deploy Backend (Railway)

### Why Railway?
- Free PostgreSQL database included
- Automatic HTTPS
- Zero-config deployment
- Free tier available

### Steps:

1. **Sign up at Railway**
   - Go to https://railway.app/
   - Click "Login" → Sign in with GitHub
   - Authorize Railway to access your repositories

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `modex-booking-system` repository
   - Railway will detect it's a Node.js app

3. **Add PostgreSQL Database**
   - In your project dashboard, click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will create a database and provide connection URL

4. **Configure Backend Service**
   - Click on your backend service
   - Go to "Settings" tab
   - Set **Root Directory**: `backend`
   - Set **Start Command**: `npm start`
   - Set **Build Command**: `npm install && npm run migrate`

5. **Set Environment Variables**
   - Go to "Variables" tab
   - Click "Raw Editor"
   - Add:
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     PORT=4000
     NODE_ENV=production
     ```
   - The `${{Postgres.DATABASE_URL}}` will auto-link to your database

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Copy your backend URL (e.g., `https://modex-backend-production.up.railway.app`)

---

## Step 3: Deploy Frontend (Vercel)

### Why Vercel?
- Best for React/Vite apps
- Instant global CDN
- Automatic HTTPS
- Free tier with custom domain support

### Steps:

1. **Sign up at Vercel**
   - Go to https://vercel.com/
   - Click "Sign Up" → Continue with GitHub
   - Authorize Vercel

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your `modex-booking-system` repository
   - Vercel will detect it's a Vite app

3. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variable**
   - Click "Environment Variables"
   - Add:
     - **Name**: `VITE_API_URL`
     - **Value**: Your Railway backend URL (from Step 2.6)
       Example: `https://modex-backend-production.up.railway.app`

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (~1-2 minutes)
   - Your unique URL will be: `https://modex-booking-system-xxx.vercel.app`

---

## Step 4: Test Your Deployment

1. **Visit your Vercel URL**
   ```
   https://your-project-name.vercel.app
   ```

2. **Create a test show** (use Admin page)
   - Navigate to `/admin`
   - Create a new show

3. **Book some seats**
   - Go back to home page
   - Select a show
   - Choose seats and book

4. **Test concurrent booking**
   - Open your site in 2 browser tabs
   - Try booking the same seat simultaneously
   - Only one should succeed (this proves concurrency control works!)

---

## 🎉 You're Live!

Your system is now deployed with:
- ✅ **Unique URL** that anyone can access
- ✅ **Production database** on Railway
- ✅ **Global CDN** via Vercel
- ✅ **Automatic HTTPS**
- ✅ **Concurrency-safe bookings**

### Share Your Links:
- Frontend: `https://your-project.vercel.app`
- Backend API: `https://your-backend.up.railway.app`

---

## 🔧 Troubleshooting

### Frontend shows "Network Error"
- Check that `VITE_API_URL` in Vercel matches your Railway backend URL
- Ensure there's NO trailing slash in the URL
- Redeploy frontend after fixing

### Backend "Cannot connect to database"
- Verify `DATABASE_URL` is set correctly in Railway
- Check that PostgreSQL service is running
- View logs in Railway dashboard

### Migrations didn't run
- Railway should auto-run migrations on deploy
- If not, go to Railway dashboard → your service → click "Deploy" manually
- Or use Railway CLI: `railway run npm run migrate`

### CORS errors
- The backend already has CORS enabled for all origins
- If issues persist, add your Vercel domain to CORS whitelist in `backend/src/index.js`

---

## 📱 Custom Domain (Optional)

### Vercel:
1. Go to project settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### Railway:
1. Go to service settings → Networking
2. Click "Generate Domain" or add custom domain
3. Update DNS if using custom domain

---

## 💡 Pro Tips

1. **Monitor your apps**:
   - Railway: View real-time logs in dashboard
   - Vercel: Check Analytics and Function logs

2. **Auto-deployments**:
   - Both platforms auto-deploy when you push to GitHub
   - Create a `dev` branch for testing before merging to `main`

3. **Database backups**:
   - Railway Pro includes automated backups
   - Free tier: Export data regularly using `pg_dump`

4. **Environment management**:
   - Use Railway "Environments" for staging/production
   - Vercel supports Preview deployments for PRs

---

## 🆘 Need Help?

- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
- Railway Discord: https://discord.gg/railway
- Vercel Discord: https://vercel.com/discord

---

**That's it! Your Modex system is now live with a unique deployment URL! 🚀**
