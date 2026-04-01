# Render Deployment Guide

## Step 1: Deploy to Render (Blueprints)

Render supports `render.yaml` for infrastructure-as-code deployment.

### Option A: Deploy via Blueprint (Recommended)

1. Push your code to GitHub (if not already there)
2. Go to https://dashboard.render.com/blueprints
3. Click "New Blueprint Instance"
4. Connect your GitHub repo
5. Render will automatically:
   - Create PostgreSQL database (free tier)
   - Deploy Node.js backend (free tier)
   - Set environment variables

### Option B: Manual Setup

If Blueprint doesn't work, set up manually:

**1. Create PostgreSQL:**
- Dashboard → New → PostgreSQL
- Name: baseapps-db
- Region: Ohio (us-east)
- Plan: Free
- Copy the Internal Database URL

**2. Create Web Service:**
- Dashboard → New → Web Service
- Connect GitHub repo
- Name: baseapps-backend
- Runtime: Node
- Build Command: `npm install`
- Start Command: `node server.js`
- Root Directory: `backend`
- Plan: Free

**3. Set Environment Variables:**
```
NODE_ENV=production
DATABASE_URL=<from step 1>
JWT_SECRET=<generate a random string>
PORT=10000
```

## Step 2: Run Database Migration

Once deployed, run schema on Render:

```bash
# SSH into Render (via dashboard) or use web shell
psql $DATABASE_URL < db/schema.sql
```

Or use your seed script:
```bash
node scripts/seed-dapps.js
```

## Step 3: Update Vercel

Go to Vercel → Project Settings → Environment Variables:

```
VITE_API_URL=https://baseapps-backend.onrender.com
```

Redeploy frontend.

## Step 4: Verify

Test your app:
- Frontend should load
- API calls should work
- Database operations functional

## Free Tier Limits

- **PostgreSQL**: Sleeps after 15 min inactivity, 1GB storage
- **Web Service**: Sleeps after 15 min inactivity, 512MB RAM
- **Bandwidth**: 100GB/month

## Troubleshooting

**Database connection errors:**
- Check DATABASE_URL format
- Ensure SSL is enabled in pool.js

**Out of memory:**
- Reduce Node.js memory: `node --max-old-space-size=256 server.js`
- Or upgrade to paid tier ($7/month)

**Build fails:**
- Check package.json is in backend folder
- Ensure all dependencies listed
