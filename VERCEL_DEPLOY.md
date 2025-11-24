# Deploy Frontend to Vercel

## Option 1: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import `rabeyamily/SkillSync` repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)
   - **Environment Variables**:
     - `NEXT_PUBLIC_API_URL`: `https://skillsync-production-d6f2.up.railway.app`
5. Click "Deploy"

## Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd /Users/tahsin/Desktop/SkillSync/frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? skillsync-frontend
# - Directory: ./ (current directory)
# - Override settings? No
```

## After Deployment

1. **Get your Vercel URL** (e.g., `https://skillsync-frontend.vercel.app`)

2. **Update Backend CORS**:
   - Go to Railway → SkillSync → Variables
   - Update `CORS_ORIGINS`:
     ```
     https://skillsync-production-d6f2.up.railway.app,http://localhost:3000,https://skillsync-frontend.vercel.app
     ```

3. **Test the Application**:
   - Visit your Vercel URL
   - Try logging in
   - Upload a resume

## Automatic Deployments

Vercel will automatically deploy:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request

## Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_API_URL`: `https://skillsync-production-d6f2.up.railway.app`
- `NODE_ENV`: `production` (optional, set automatically)

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Follow Vercel's instructions to update DNS

## Troubleshooting

### Build Fails
- Check Build Logs in Vercel Dashboard
- Verify all dependencies are in `package.json`
- Check environment variables are set

### API Calls Fail
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS includes Vercel URL
- Check browser console for errors

### 404 on Routes
- Next.js should handle this automatically
- Verify `app/` directory structure is correct

## Advantages of Vercel

✅ Made for Next.js (by the same team)
✅ Auto-detects configuration
✅ Fast global CDN
✅ Automatic SSL certificates
✅ Preview deployments for PRs
✅ Generous free tier
✅ Zero configuration needed

