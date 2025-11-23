# 🚀 SkillSync - AI-Powered Resume–Job Skill Gap Analyzer

## 🎯 Overview

SkillSync is an intelligent web application that analyzes a user's resume against a job description to identify skill gaps, education mismatches, and missing competencies. The system extracts both technical and soft skills, computes a Fit Score, and generates a personalized Skill Gap Report that can be downloaded instantly — all without requiring login or account creation.

## 🧩 Problem Statement

University curricula in Computer Science often lag behind rapidly evolving industry demands — particularly in emerging fields like AI, Blockchain, and Software Architecture. Students and job seekers struggle to identify what skills employers actually require and how their current education or experience compares.

## ✨ Features

- 📄 **Multi-format Resume Parsing** - Supports PDF, DOCX, and plain text
- 🤖 **AI-Powered Skill Extraction** - Uses LLM-based NLP to extract technical and soft skills
- 📊 **Fit Score Calculation** - Quantifies match percentage between resume and job requirements
- 🔍 **Gap Analysis** - Identifies missing skills, matched skills, and extra competencies
- 📈 **Visual Dashboard** - Interactive charts and skill breakdowns
- 📑 **Downloadable Reports** - Generate PDF reports with personalized recommendations
- 🔒 **Privacy-First** - Session-based processing with no login or data storage

## 🏗️ Project Structure

```
capstone_app/
├── frontend/          # Next.js/React frontend application
├── backend/           # FastAPI backend application
├── docs/              # Documentation and project notes
├── tests/             # Test files
└── README.md          # This file
```

## 🧰 Tech Stack

### Frontend
- **Framework:** React / Next.js
- **Styling:** TailwindCSS
- **Visualization:** Chart.js / Recharts
- **PDF Generation:** jsPDF

### Backend
- **Framework:** FastAPI (Python)
- **NLP/AI:** OpenAI GPT API / spaCy / HuggingFace Transformers
- **File Parsing:** pdfplumber, python-docx
- **Report Generation:** reportlab / WeasyPrint

### Storage
- **Session-based:** In-memory (no persistent database for MVP)

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git
- OpenAI API Key (get one at https://platform.openai.com/api-keys)

### Quick Start

For detailed setup and running instructions, see **[HOW_TO_RUN.md](./HOW_TO_RUN.md)**

**Quick commands:**

**Backend:**
```bash
cd backend
source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt
# Add OPENAI_API_KEY to .env file
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🔐 Data Privacy

- ✅ No login or account creation required
- ✅ No permanent data storage
- ✅ Files and extracted data exist only during browser session
- ✅ User can download their report — no external access required

## 📊 Example Use Case

**Scenario:** A student uploads their resume and a "Blockchain Engineer" job description.

**Output:**
- Fit Score: 62%
- Missing Skills: Solidity, Truffle, Smart Contract Design, Ethereum APIs
- Soft Skills: "Analytical Thinking", "Cross-functional collaboration"
- Recommendation: Learn Solidity and Smart Contract Testing
- Suggested certification: "Blockchain Developer Bootcamp"

## 🤝 Contributing

This is a capstone project. Contributions and suggestions are welcome!

## 📝 License

*(To be determined)*

## 👤 Author

Capstone Project - SkillSync: AI-Powered Resume–Job Skill Gap Analyzer

