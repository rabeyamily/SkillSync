# 🚀 SkillSync Deployment Overview

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend     │
│   (Vercel)      │────────▶│   (Railway)    │
│   Next.js       │  API    │   FastAPI      │
└─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │   PostgreSQL   │
                            │   (Railway)    │
                            └─────────────────┘
```

## Deployment Strategy

### Frontend → Railway or Vercel

- **Option 1 - Railway**: Deploy on Railway (see `RAILWAY_FRONTEND_DEPLOYMENT.md`)
  - Same platform as backend
  - One dashboard for everything
- **Option 2 - Vercel**: Deploy on Vercel (see `VERCEL_DEPLOYMENT.md`)
  - Optimized for Next.js
  - Free tier available

### Backend → Railway 🚂

- **Platform**: Railway
- **Framework**: FastAPI (Python)
- **URL**: `https://your-backend.railway.app`
- **Guide**: See `RAILWAY_DEPLOYMENT.md`

### Database → Railway PostgreSQL 🗄️

- **Platform**: Railway (managed PostgreSQL)
- **Auto-configured**: `DATABASE_URL` automatically set
- **No manual setup needed!**

## Quick Start

### 1. Deploy Backend (Railway)

```bash
# Follow RAILWAY_DEPLOYMENT.md
1. Create Railway project
2. Add PostgreSQL database
3. Deploy backend service
4. Set environment variables
```

### 2. Deploy Frontend (Vercel)

```bash
# Follow VERCEL_DEPLOYMENT.md
1. Go to vercel.com/new
2. Import GitHub repo
3. Set root directory to 'frontend'
4. Set NEXT_PUBLIC_API_URL
5. Deploy!
```

## Environment Variables

### Railway Backend

```env
DATABASE_URL=postgresql://...  # Auto-set by Railway
OPENAI_API_KEY=sk-...
JWT_SECRET_KEY=...
CORS_ORIGINS=https://your-app.vercel.app
DEBUG=False
```

### Vercel Frontend

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Important URLs

After deployment, you'll have:

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.railway.app`
- **API Docs**: `https://your-backend.railway.app/docs`

## Deployment Order

1. ✅ **Deploy Backend First** (Railway)

   - Get backend URL
   - Verify it's working at `/docs`

2. ✅ **Deploy Frontend Second** (Vercel)

   - Use backend URL in `NEXT_PUBLIC_API_URL`
   - Update CORS in backend with frontend URL

3. ✅ **Test Everything**
   - Test user registration/login
   - Test API calls
   - Test full workflow

## Cost Estimate

### Vercel

- **Hobby Plan**: Free ✅
  - Unlimited deployments
  - 100GB bandwidth/month

### Railway

- **Hobby Plan**: $5/month + usage
- **PostgreSQL**: Included

**Total**: ~$5-10/month for small projects

## Documentation

- **Railway Backend**: `RAILWAY_DEPLOYMENT.md`
- **Vercel Frontend**: `VERCEL_DEPLOYMENT.md`
- **Railway Checklist**: `RAILWAY_CHECKLIST.md`
- **General Deployment**: `DEPLOYMENT.md`

## Support

- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Railway**: [docs.railway.app](https://docs.railway.app)
