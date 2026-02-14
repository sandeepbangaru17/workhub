# WorkHub

WorkHub is a full-stack web app for connecting businesses and workers.

Current stack:
- Backend: Node.js + Express (`backend/server.js`)
- Frontend: React + Vite (`frontend`)
- Database: PostgreSQL

## Backend setup

1. Install backend dependencies:
```bash
npm --prefix backend install
```

2. Create environment variables (example values):
```env
PORT=5001
SESSION_SECRET=change_this_in_production
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=workhub
PGUSER=postgres
PGPASSWORD=postgres
```

3. Start backend:
```bash
npm --prefix backend run dev
```

Backend URL: `http://localhost:5001`

Default seeded admin:
- Email: `admin@workhub.local`
- Password: `admin123`

## Frontend setup

1. Install frontend dependencies:
```bash
npm --prefix frontend install
```

2. (Optional) set API base URL:
```env
VITE_API_URL=http://localhost:5001
```

3. Start frontend:
```bash
npm --prefix frontend run dev
```

Frontend URL: usually `http://localhost:5173`

If your Windows environment blocks child process spawns (`spawn EPERM` from Vite/esbuild), use:
```bash
npm --prefix frontend run dev:safe
npm --prefix frontend run build:safe
```

## Notes

- Root `npm run dev` starts only the backend via the root `package.json` script.
- The frontend uses cookie-based sessions (`credentials: include`) with the backend API.
