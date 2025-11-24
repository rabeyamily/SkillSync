# 🚂 Railway Setup - Step-by-Step Instructions

Follow these steps in order to deploy your SkillSync backend and database on Railway.

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] GitHub account
- [ ] SkillSync code pushed to a GitHub repository
- [ ] Railway account (sign up at [railway.app](https://railway.app) if you don't have one)
- [ ] OpenAI API key (for LLM features)

---

## Step 1: Create Railway Project

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub (recommended)

2. **Create New Project**
   - Click the **"+ New Project"** button (top right)
   - Select **"Deploy from GitHub repo"**
   - Authorize Railway to access your GitHub if prompted
   - Select your **SkillSync repository**
   - Click **"Deploy Now"**

3. **Project Created**
   - You'll see your new project dashboard
   - Keep this tab open - you'll need it!

---

## Step 2: Add PostgreSQL Database

1. **Add Database Service**
   - In your Railway project, click **"+ New"** button
   - Select **"Database"**
   - Choose **"Add PostgreSQL"**

2. **Database Created**
   - Railway will automatically create a PostgreSQL database
   - Wait for it to finish provisioning (takes ~30 seconds)
   - You'll see a new service called "Postgres" in your project

3. **Get Database URL** (Important!)
   - Click on the **"Postgres"** service
   - Go to the **"Variables"** tab
   - You'll see `DATABASE_URL` - **copy this value** (you'll need it later)
   - Format: `postgresql://postgres:password@host:port/railway`
   - ⚠️ **Note**: Railway automatically shares this with other services, but good to verify

---

## Step 3: Deploy Backend Service

1. **Add Backend Service**
   - In your Railway project, click **"+ New"** button again
   - Select **"GitHub Repo"**
   - Choose your **SkillSync repository** (same one)

2. **Configure Service**
   - Railway will detect it's a Python project
   - **IMPORTANT**: Click on the service name to open settings
   - Go to **"Settings"** tab
   - Find **"Root Directory"** setting
   - Set it to: `backend`
   - Click **"Save"**

3. **Verify Build Settings**
   - Still in **"Settings"** tab
   - Check **"Build Command"**: Should be auto-detected (leave as is)
   - Check **"Start Command"**: Should be `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - If not, set it manually to: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## Step 4: Set Environment Variables

1. **Open Backend Service Variables**
   - Click on your **backend service** (not Postgres)
   - Go to **"Variables"** tab
   - Click **"+ New Variable"** for each variable below

2. **Add Required Variables**

   **DATABASE_URL** (Usually auto-set, but verify):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   - Railway should auto-reference the Postgres service
   - If you see `${{Postgres.DATABASE_URL}}`, that's correct!
   - If not, click the reference button next to Postgres service

   **OPENAI_API_KEY**:
   ```
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   ```
   - Get this from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Replace with your actual key

   **JWT_SECRET_KEY**:
   ```
   JWT_SECRET_KEY=your-secure-random-string-here
   ```
   - Generate a secure key (see below)
   - Minimum 32 characters recommended

   **CORS_ORIGINS**:
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
   ```
   - Replace `your-frontend.vercel.app` with your actual Vercel URL
   - Keep `localhost:3000` for local development
   - Add multiple URLs separated by commas

   **DEBUG**:
   ```
   DEBUG=False
   ```

3. **Generate JWT Secret Key**
   
   Open terminal and run:
   ```bash
   # Option 1: Using OpenSSL
   openssl rand -hex 32
   
   # Option 2: Using Python
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   
   Copy the output and paste it as `JWT_SECRET_KEY`

---

## Step 5: Deploy and Verify

1. **Trigger Deployment**
   - Railway should auto-deploy when you add the service
   - If not, go to **"Deployments"** tab → Click **"Redeploy"**

2. **Watch the Build**
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - Watch the build logs
   - Wait for "Build successful" message

3. **Check Service Status**
   - Go back to **"Settings"** tab
   - Scroll to **"Networking"** section
   - You'll see your service URL: `https://your-service-name.railway.app`
   - **Copy this URL** - this is your backend API URL!

4. **Test the Backend**
   - Open the URL in browser: `https://your-service-name.railway.app`
   - You should see: `{"message":"SkillSync","version":"1.0.0","status":"running"}`
   - Test API docs: `https://your-service-name.railway.app/docs`
   - You should see Swagger UI with all endpoints

5. **Check Health Endpoint**
   - Visit: `https://your-service-name.railway.app/health`
   - Should return: `{"status":"healthy"}`

---

## Step 6: Verify Database Connection

1. **Check Logs**
   - Go to backend service → **"Deployments"** → Latest deployment → **"View Logs"**
   - Look for any database connection errors
   - Should see successful startup messages

2. **Test Database (Optional)**
   - Click on **Postgres** service
   - Go to **"Query"** tab
   - Run: `SELECT * FROM users LIMIT 5;`
   - Should return empty result (no error = connection works!)

3. **Verify Tables Created**
   - In Postgres Query tab, run:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   - Should show: `users`, `user_profiles`, `user_cvs`

---

## Step 7: Get Your Backend URL

1. **Find Your Backend URL**
   - Backend service → **"Settings"** → **"Networking"**
   - Your URL: `https://your-service-name.railway.app`
   - **Save this URL!** You'll need it for Vercel frontend deployment

2. **Update CORS (if needed)**
   - If you have your Vercel frontend URL, update `CORS_ORIGINS`:
   - Backend service → **"Variables"** → Edit `CORS_ORIGINS`
   - Add your Vercel URL: `https://your-app.vercel.app`

---

## Troubleshooting

### Build Fails
- **Check logs**: Deployments → Latest → View Logs
- **Verify root directory**: Settings → Root Directory = `backend`
- **Check requirements.txt**: Make sure it's in `backend/` folder

### Database Connection Errors
- **Verify DATABASE_URL**: Should be `${{Postgres.DATABASE_URL}}`
- **Check Postgres service**: Make sure it's running (green status)
- **Check logs**: Look for connection errors in backend logs

### Service Won't Start
- **Check start command**: Should be `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Check port**: Must use `$PORT` (Railway provides this)
- **Check environment variables**: All required vars must be set

### 401 Errors After Deployment
- **Check JWT_SECRET_KEY**: Must be set and secure
- **Verify token format**: Should be a long random string
- **Check logs**: Look for JWT-related errors

---

## Quick Reference

**Your Railway Project Structure:**
```
Railway Project: SkillSync
├── Postgres (Database)
│   └── Variables: DATABASE_URL (auto-set)
│
└── Backend Service (FastAPI)
    └── Root Directory: backend
    └── Variables:
        ├── DATABASE_URL=${{Postgres.DATABASE_URL}}
        ├── OPENAI_API_KEY=sk-...
        ├── JWT_SECRET_KEY=...
        ├── CORS_ORIGINS=https://...
        └── DEBUG=False
    └── URL: https://your-service.railway.app
```

**Important URLs:**
- Backend API: `https://your-service.railway.app`
- API Docs: `https://your-service.railway.app/docs`
- Health Check: `https://your-service.railway.app/health`

---

## Next Steps

After Railway setup is complete:

1. ✅ **Test backend**: Visit `/docs` endpoint
2. ✅ **Deploy frontend**: 
   - Option A: Deploy on Railway (see `RAILWAY_FRONTEND_DEPLOYMENT.md`)
   - Option B: Deploy on Vercel (see `VERCEL_DEPLOYMENT.md`)
3. ✅ **Update frontend**: Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. ✅ **Update backend CORS**: Add frontend URL to `CORS_ORIGINS`
5. ✅ **Test full flow**: Register user, upload CV, analyze skills

---

## Need Help?

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check logs: Always check deployment logs first!

