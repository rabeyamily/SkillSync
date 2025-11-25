# How to Run SkillSync Locally

Follow these steps to run both the backend (FastAPI) and the frontend (Next.js) on your machine.

## 1. Prerequisites

- Python 3.12 (already used in this repo)
- Node.js 20 / npm 10
- A Gmail app password for sending verification emails (optional for dev, required to send real emails)

## 2. Environment Variables

### Backend

Copy `backend/.env.example` to `backend/.env` and update:

```
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...        # optional for ID-token flow
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=app.skillsync@gmail.com
SMTP_PASSWORD=<gmail app password>
SMTP_FROM_EMAIL=app.skillsync@gmail.com
SMTP_FROM_NAME=SkillSync
```

> Tip: For quick testing without SMTP credentials, leave the SMTP values blank. The backend will log verification codes to the console instead of sending email.

### Frontend

Copy `frontend/.env.local.example` to `frontend/.env.local` and set:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

## 3. Install Dependencies

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## 4. Run the Development Servers

Open two terminals:

### Terminal 1 – Backend
```bash
cd backend
source venv/bin/activate
./dev.sh       # starts uvicorn on http://localhost:8000
```

### Terminal 2 – Frontend
```bash
cd frontend
npm run dev    # serves Next.js on http://localhost:3000
```

Visit `http://localhost:3000` in your browser to use the app. The frontend proxies API calls to `http://localhost:8000`.

## 5. Production URLs

- Backend (Railway): `https://skillsync-production-d6f2.up.railway.app`
- Frontend (Vercel or other host): set `NEXT_PUBLIC_API_URL` to the Railway URL and redeploy.

## 6. Common Tasks

- **Run migrations**: `python migrate_add_email_verification.py`
- **Check a user**: `python check_user.py`
- **Run backend tests**: `pytest`
- **Run frontend build**: `npm run build`

## 7. Troubleshooting

- If Google login shows “origin not allowed”, add your domain to Google Cloud → OAuth client → Authorized JavaScript origins.
- If verification emails aren’t delivered, ensure SMTP_* env vars are set and Gmail app password is correct. Check backend logs for `Verification email sent to ...`.
- To point the frontend to production API locally, change `NEXT_PUBLIC_API_URL` accordingly and restart `npm run dev`.


