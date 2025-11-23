# Backend - SkillSync API

FastAPI backend application for the SkillSync project.

## Setup

1. **Create virtual environment** (if not already created):
   ```bash
   python3 -m venv venv
   ```

2. **Activate virtual environment**:
   ```bash
   source venv/bin/activate  # On macOS/Linux
   # or
   venv\Scripts\activate  # On Windows
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

## Running the Server

```bash
# Activate virtual environment first
source venv/bin/activate

# Run with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/                 # API routes
│   ├── models/              # Data models/schemas
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions
├── venv/                    # Virtual environment (not in git)
├── requirements.txt         # Python dependencies
└── .env.example             # Environment variables template
```

## Testing

Test the API is working:
```bash
curl http://localhost:8000/
curl http://localhost:8000/health
curl http://localhost:8000/api/test
```

