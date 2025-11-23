#!/bin/bash
# Development script to run backend server
# Usage: ./dev.sh or bash dev.sh

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created .env file from .env.example"
        echo "⚠️  Please update .env with your API keys before running!"
    else
        echo "❌ Error: .env.example not found!"
        exit 1
    fi
fi

# Run the development server
echo "🚀 Starting FastAPI development server..."
echo "📍 Server will be available at http://localhost:8000"
echo "📚 API docs will be available at http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

