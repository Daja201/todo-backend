# Homework Tracker — Server-Hosted Web App (port 4008)

Converted from the original Capacitor mobile app to a plain web app hosted
directly by the backend, with the database living on the server.

## What changed vs. the mobile version

| Concern | Mobile version | This version |
|---|---|---|
| Data storage | Dexie (IndexedDB) on-device, offline-first | SQLite on the server (`backend/data/tasks.db`) |
| Backend address | User-entered URL saved in `localStorage`, absolute `fetch` calls | Relative `/api/...` calls — same origin, nothing to configure |
| Sync model | Manual "sync" push/pull reconciling local vs. remote | No sync step — every read/write hits the server directly |
| Notifications | Capacitor `LocalNotifications` (native, background-capable) | Browser `Notification` API (only fires while the tab is open — see note below) |
| Packaging | Capacitor iOS/Android shells | None — it's just a website |

Removed dependencies: `@capacitor/*`, `dexie`, `dexie-react-hooks`, `uuid`
(the server now assigns task ids and timestamps).

## Structure
```
.
├── Dockerfile
├── docker-compose.yml       # exposes 4008:4008, persists ./data via a volume
├── backend/
│   ├── main.py              # FastAPI: full task CRUD + SQLite + SPA hosting
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api.ts            # fetch client (replaces db.ts)
    │   ├── useTasks.ts        # loads/refreshes task list from the server
    │   ├── useNotifications.ts# browser Notification API (replaces Capacitor)
    │   ├── App.tsx            # no backend-URL settings panel needed anymore
    │   └── components/
    ├── vite.config.ts         # dev-mode proxies /api to localhost:4008
    └── package.json
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/tasks` | List all non-deleted tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/{id}` | Update title/type/date/time/status |
| DELETE | `/api/tasks/{id}` | Soft-delete a task |

## Run
```bash
docker compose up --build
```
Then open `http://<SERVER_IP>:4008/` in a browser — frontend and API are
both served from that one address.

## Local development
```bash
# terminal 1
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 4008

# terminal 2
cd frontend && npm install && npm run dev
```
`npm run dev` proxies `/api` to `localhost:4008` (configured in
`vite.config.ts`), so the frontend code never needs a different URL
between dev and production.

## Notification limitation
Browser notifications only fire while the app/tab is open — there's no
background OS-level scheduler like Capacitor had on mobile. If you need
due-date reminders to fire when the browser is closed, that requires a
server-side push mechanism (Web Push + a service worker), which isn't
included here but can be added on top of this same backend.
