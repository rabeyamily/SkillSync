# ✅ Railway Deployment Checklist

## Pre-Deployment

- [ ] Push code to GitHub repository
- [ ] Have OpenAI API key ready
- [ ] Generate secure JWT secret key
- [ ] Railway account created

## Railway Setup

### Backend Service
- [ ] Create new Railway project
- [ ] Add PostgreSQL database service
- [ ] Deploy backend from GitHub (set root directory to `backend`)
- [ ] Verify `DATABASE_URL` is automatically set by Railway
- [ ] Set environment variables:
  - [ ] `OPENAI_API_KEY`
  - [ ] `JWT_SECRET_KEY` (generate secure random string)
  - [ ] `CORS_ORIGINS` (your frontend URL)
  - [ ] `DEBUG=False`
  - [ ] Optional: Google OAuth credentials
- [ ] Verify start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Check deployment logs for errors
- [ ] Test backend at `https://your-backend.railway.app/docs`

### Frontend Service (Vercel)
- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Import GitHub repository
- [ ] Set root directory to `frontend`
- [ ] Set environment variable:
  - [ ] `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
- [ ] Deploy frontend
- [ ] Test frontend at `https://your-app.vercel.app`
- [ ] See `VERCEL_DEPLOYMENT.md` for detailed instructions

## Post-Deployment

- [ ] Test user registration/login
- [ ] Test profile creation
- [ ] Test CV upload
- [ ] Test skill gap analysis
- [ ] Verify database tables created automatically
- [ ] Check Railway dashboard for any errors
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts

## Environment Variables Reference

### Backend
```env
DATABASE_URL=postgresql://...  # Auto-set by Railway
OPENAI_API_KEY=sk-...
JWT_SECRET_KEY=...  # Generate with: openssl rand -hex 32
CORS_ORIGINS=https://your-frontend.railway.app
DEBUG=False
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Quick Commands

**Generate JWT Secret:**
```bash
openssl rand -hex 32
```

**Check Railway logs:**
```bash
railway logs
```

**Connect to database:**
```bash
railway connect postgres
```

## Troubleshooting

- **Backend won't start**: Check logs, verify start command, check env vars
- **Database errors**: Verify DATABASE_URL is set (auto-set by Railway)
- **Frontend can't connect**: Check NEXT_PUBLIC_API_URL and CORS_ORIGINS
- **Port errors**: Railway provides $PORT automatically, Procfile handles it

