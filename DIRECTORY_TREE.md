# Directory Tree

```
capstone_app copy/
│
├── 📁 backend/
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   │   ├── __init__.py
│   │   │   ├── analyze.py
│   │   │   ├── auth.py
│   │   │   ├── extract.py
│   │   │   ├── parse.py
│   │   │   ├── profile.py
│   │   │   ├── report.py
│   │   │   ├── text_input.py
│   │   │   └── upload.py
│   │   ├── 📁 models/
│   │   │   ├── __init__.py
│   │   │   ├── api_models.py
│   │   │   ├── database.py
│   │   │   ├── schemas.py
│   │   │   └── skill_taxonomy.py
│   │   ├── 📁 services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── file_parser.py (merged: docx_parser, pdf_parser, text_input)
│   │   │   ├── fit_score.py
│   │   │   ├── gap_analysis.py
│   │   │   ├── llm_service.py
│   │   │   ├── pdf_generator.py
│   │   │   ├── prompts.py
│   │   │   ├── recommendations.py
│   │   │   ├── skill_extraction.py
│   │   │   ├── skill_matching.py
│   │   │   ├── soft_skills_extraction.py
│   │   │   └── unified_extraction.py
│   │   ├── 📁 utils/
│   │   │   ├── __init__.py
│   │   │   ├── file_storage.py
│   │   │   ├── file_validation.py
│   │   │   ├── password_validation.py
│   │   │   └── text_cleaning.py
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── main.py
│   ├── 📁 data/
│   │   └── skillsync.db
│   ├── 📁 tests/
│   │   ├── __init__.py
│   │   ├── test_api_integration.py
│   │   ├── test_fit_score.py
│   │   ├── test_gap_analysis.py
│   │   └── test_skill_matching.py
│   ├── .env
│   ├── .env.example
│   ├── dev.sh
│   ├── migrate_db.py
│   ├── pytest.ini
│   ├── README.md
│   └── requirements.txt
│
├── 📁 frontend/
│   ├── 📁 app/
│   │   ├── 📁 about/
│   │   │   └── page.tsx
│   │   ├── 📁 analyze/
│   │   │   ├── page.tsx
│   │   │   └── 📁 results/
│   │   │       └── page.tsx
│   │   ├── 📁 profile/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── 📁 components/
│   │   ├── Charts.tsx
│   │   ├── FileUpload.tsx
│   │   ├── FitScoreInfoPopup.tsx
│   │   ├── Header.tsx
│   │   ├── LoadingStates.tsx
│   │   ├── LoginModal.tsx
│   │   ├── Logo.tsx
│   │   ├── MainLayout.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeToggle.tsx
│   ├── 📁 public/
│   │   └── skillsync-logo.png
│   ├── 📁 services/
│   │   └── api.ts
│   ├── 📁 utils/
│   │   ├── export.ts
│   │   ├── passwordValidation.ts
│   │   └── types.ts
│   ├── .env.local
│   ├── .env.local.example
│   ├── .gitignore
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.mjs
│   ├── README.md
│   └── tsconfig.json
│
├── HOW_TO_RUN.md
└── README.md
```

## Notes:
- `node_modules/` and `venv/` directories are excluded (dependencies)
- `__pycache__/` directories are excluded (Python cache files)
- `.next/` directory is excluded (Next.js build output)
- `.git/` directory is excluded (Git repository)

