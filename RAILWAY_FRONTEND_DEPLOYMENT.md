# 🚂 Railway Frontend Deployment Guide

Yes! You can deploy your Next.js frontend on Railway. Here's how:

## Quick Steps

### 1. Add Frontend Service to Railway

1. **In your Railway project**, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose your **SkillSync repository** (same one)
4. Railway will detect it's a Node.js/Next.js project

### 2. Configure Frontend Service

1. **Click on the new service** to open settings
2. Go to **"Settings"** tab
3. **Set Root Directory**: `frontend` ⚠️ **Critical!**
4. **Build Command**: Should auto-detect as `npm run build` (verify this)
5. **Start Command**: Set to `npm start` or `cd frontend && npm start`
6. **Install Command**: Should be `npm install` (default)

### 3. Set Environment Variables

Go to **"Variables"** tab and add:

```env
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app
NODE_ENV=production
```

**Important:**
- Replace `your-backend-service.railway.app` with your actual Railway backend URL
- Get the backend URL from: Backend service → Settings → Networking

### 4. Deploy

1. Railway will automatically start building
2. Watch the **"Deployments"** tab for build progress
3. Once deployed, get your frontend URL from **Settings → Networking**

## Railway Configuration for Next.js

Railway should auto-detect Next.js, but you can verify:

**Settings → Build:**
- Framework: Next.js (auto-detected)
- Build Command: `npm run build`
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install`

**Settings → Deploy:**
- Start Command: `npm start`
- Or: `cd frontend && npm start` (if root directory is set)

## Complete Railway Project Structure

After deployment, you'll have:

```
Railway Project: SkillSync
├── Postgres (Database)
│   └── Variables: DATABASE_URL (auto-set)
│
├── Backend Service (FastAPI)
│   └── Root Directory: backend
│   └── Variables:
│       ├── DATABASE_URL=${{Postgres.DATABASE_URL}}
│       ├── OPENAI_API_KEY=sk-...
│       ├── JWT_SECRET_KEY=...
│       ├── CORS_ORIGINS=https://your-frontend.railway.app
│       └── DEBUG=False
│   └── URL: https://your-backend.railway.app
│
└── Frontend Service (Next.js)
    └── Root Directory: frontend
    └── Variables:
        ├── NEXT_PUBLIC_API_URL=https://your-backend.railway.app
        └── NODE_ENV=production
    └── URL: https://your-frontend.railway.app
```

## Important Configuration

### Update Backend CORS

After deploying frontend, update backend CORS to include Railway frontend URL:

**Backend Service → Variables:**
```env
CORS_ORIGINS=https://your-frontend.railway.app,http://localhost:3000
```

### Next.js on Railway

Railway supports Next.js out of the box:
- ✅ Auto-detects Next.js framework
- ✅ Handles build process automatically
- ✅ Supports both static and server-side rendering
- ✅ Provides HTTPS automatically

## Troubleshooting

### Build Fails

1. **Check Root Directory**: Must be set to `frontend`
2. **Check Build Logs**: Deployments → Latest → View Logs
3. **Verify package.json**: Should be in `frontend/` directory
4. **Node Version**: Railway uses Node 18+ by default (compatible with Next.js 16)

### Frontend Can't Connect to Backend

1. **Check NEXT_PUBLIC_API_URL**: Must match your Railway backend URL
2. **Check CORS**: Backend must allow Railway frontend URL
3. **Verify Backend URL**: Get it from Backend service → Settings → Networking
4. **Check Network Tab**: Browser DevTools → Network to see API calls

### Port Issues

- Railway automatically provides `$PORT` for Node.js apps
- Next.js on Railway handles this automatically
- No manual port configuration needed

## Railway vs Vercel for Frontend

### Railway Advantages
- ✅ Everything in one place (backend + frontend + database)
- ✅ Single dashboard to manage all services
- ✅ Easy service-to-service communication
- ✅ Consistent deployment process

### Vercel Advantages
- ✅ Optimized specifically for Next.js
- ✅ Free tier with generous limits
- ✅ Automatic preview deployments for PRs
- ✅ Edge functions support
- ✅ Better Next.js-specific features

## Cost Comparison

### Railway (All-in-One)
- **Hobby Plan**: $5/month + usage
- Includes: Backend + Frontend + Database
- **Total**: ~$5-10/month

### Railway + Vercel
- **Railway**: $5/month (Backend + Database)
- **Vercel**: Free (Frontend)
- **Total**: ~$5/month

## Recommendation

**For simplicity**: Deploy everything on Railway (one platform, one dashboard)

**For optimization**: Use Railway for backend/database, Vercel for frontend (better Next.js features)

Both approaches work! Choose based on your preference.

## Quick Checklist

- [ ] Add frontend service to Railway project
- [ ] Set root directory to `frontend`
- [ ] Verify build command: `npm run build`
- [ ] Set start command: `npm start`
- [ ] Add `NEXT_PUBLIC_API_URL` environment variable
- [ ] Update backend `CORS_ORIGINS` with frontend Railway URL
- [ ] Deploy and test
- [ ] Verify frontend → backend connection

## Next Steps

1. ✅ Deploy frontend on Railway
2. ✅ Get frontend URL from Settings → Networking
3. ✅ Update backend CORS_ORIGINS
4. ✅ Test full application flow
5. ✅ Set up custom domains (optional)

