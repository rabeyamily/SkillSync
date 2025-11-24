# 🚂 Railway Deployment Guide - SkillSync

## Quick Start

Railway makes deployment easy! Follow these steps to deploy your SkillSync application.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub (Railway can deploy from GitHub)
3. **OpenAI API Key**: You'll need this for the LLM features

## Step-by-Step Deployment

### 1. Create a New Project on Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (recommended) or **"Empty Project"**

### 2. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be automatically set! 🎉

### 3. Deploy Backend

#### Option A: Deploy from GitHub (Recommended)

1. In Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose your SkillSync repository
4. Railway will auto-detect it's a Python project
5. Set the **Root Directory** to `backend` (important!)
6. Railway will automatically:
   - Detect `requirements.txt`
   - Install dependencies
   - Run the app

#### Option B: Deploy from CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project or create new
railway link

# Deploy
railway up
```

### 4. Configure Environment Variables

In Railway dashboard, go to your backend service → **Variables** tab and add:

```env
# Database (automatically set by Railway PostgreSQL service)
DATABASE_URL=postgresql://...  # Auto-provided by Railway

# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key

# JWT Secret (IMPORTANT: Generate a secure random string)
JWT_SECRET_KEY=your-very-secure-secret-key-min-32-chars

# CORS Origins (your frontend URL)
CORS_ORIGINS=https://your-frontend-domain.railway.app,https://yourdomain.com

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/auth/google/callback

# Environment
DEBUG=False
```

**Generate JWT Secret:**
```bash
# On macOS/Linux
openssl rand -hex 32

# Or use Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Configure Start Command

Railway should auto-detect, but if not, set the start command:

**Service Settings** → **Deploy** → **Start Command**:
```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Or use the Procfile (see below).

### 6. Deploy Frontend (Vercel)

**Note**: Frontend should be deployed on Vercel, not Railway. See `VERCEL_DEPLOYMENT.md` for detailed instructions.

Quick steps:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
5. Deploy!

For detailed Vercel deployment guide, see `VERCEL_DEPLOYMENT.md`.

## Railway Configuration Files

### Procfile (Optional - for backend)

Create `backend/Procfile`:
```
web: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### railway.json (Optional - for custom config)

Create `railway.json` in project root:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Database Setup

### Automatic Table Creation

When your backend starts, it will automatically:
- Connect to Railway's PostgreSQL database
- Create all necessary tables via `init_db()`
- No manual migration needed for first deployment!

### Viewing Database

Railway provides a database dashboard:
1. Click on your PostgreSQL service
2. Click **"Query"** tab
3. Run SQL queries directly in the browser

Or use Railway CLI:
```bash
railway connect postgres
```

## Important Railway-Specific Notes

### 1. Port Configuration
- Railway provides `$PORT` environment variable
- Your app must listen on `0.0.0.0:$PORT`
- The start command above handles this

### 2. Database URL
- Railway automatically sets `DATABASE_URL` when you add PostgreSQL
- No manual configuration needed!
- The connection string format: `postgresql://postgres:password@host:port/railway`

### 3. Environment Variables
- Set in Railway dashboard → Service → Variables
- Can reference other services (e.g., `${{Postgres.DATABASE_URL}}`)
- Secrets are automatically hidden

### 4. Build & Deploy
- Railway auto-detects Python projects
- Installs from `requirements.txt`
- Runs on every push to main branch (if connected to GitHub)

### 5. Custom Domain
- Railway provides free `.railway.app` domain
- Can add custom domain in **Settings** → **Networking**

## Troubleshooting

### Backend won't start

1. **Check logs**: Railway dashboard → Service → **Deployments** → Click deployment → **View Logs**
2. **Verify start command**: Should be `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Check environment variables**: Ensure all required vars are set
4. **Database connection**: Verify `DATABASE_URL` is set (auto-set by Railway PostgreSQL)

### Database connection errors

1. **Verify DATABASE_URL**: Should be automatically set by Railway
2. **Check PostgreSQL service**: Ensure it's running
3. **Connection string format**: Should start with `postgresql://`

### Frontend can't connect to backend

1. **Update API URL**: Set `NEXT_PUBLIC_API_URL` to your backend Railway URL
2. **CORS settings**: Add frontend URL to `CORS_ORIGINS` in backend
3. **Check backend URL**: Get it from Railway dashboard → Backend service → **Settings** → **Networking**

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- PostgreSQL: Included in plan
- Free trial credits available

## Next Steps After Deployment

1. ✅ Test all endpoints at `https://your-backend.railway.app/docs`
2. ✅ Test frontend at `https://your-frontend.railway.app`
3. ✅ Set up custom domain (optional)
4. ✅ Configure monitoring/alerts
5. ✅ Set up database backups (Railway handles this automatically)

## Quick Reference

**Backend URL**: `https://your-backend.railway.app`  
**Frontend URL**: `https://your-frontend.railway.app`  
**API Docs**: `https://your-backend.railway.app/docs`  
**Database**: Managed by Railway PostgreSQL service

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Railway Status: [status.railway.app](https://status.railway.app)

