# 🚀 How to Run the Application

### Terminal 1: Backend Server

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Frontend Server

```bash
cd frontend
npm run dev
```
