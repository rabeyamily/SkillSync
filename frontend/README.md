# Frontend - SkillSync

Next.js frontend application for the SkillSync project.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

## Running the Development Server

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
├── services/              # API services
│   └── api.ts            # Axios API client
├── utils/                 # Utility functions
│   ├── types.ts         # TypeScript type definitions
│   └── export.ts        # Export utilities (CSV, PDF)
├── public/               # Static assets
└── package.json          # Dependencies
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS 4
- **HTTP Client:** Axios
- **Charts:** Recharts

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Development Notes

- The frontend communicates with the backend API at `http://localhost:8000`
- API base URL can be configured via `NEXT_PUBLIC_API_URL` environment variable
- Components should be placed in the `components/` directory
- API calls should use the `apiClient` from `services/api.ts`
