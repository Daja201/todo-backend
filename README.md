# Option A: FastAPI Dual Hosting (Frontend + API on port 4008)

## Structure
```
.
├── Dockerfile              # multi-stage: builds frontend, runs backend
├── docker-compose.yml      # exposes 4008:4008
├── backend/
│   ├── main.py             # FastAPI app: /api/* + SPA fallback
│   └── requirements.txt
└── frontend/
    ├── package.json
    └── build.js             # PLACEHOLDER — swap for your real SPA project
```

## Before running
Replace the entire `frontend/` folder with your actual SPA project
(Vite, Create React App, Vue CLI, etc.), keeping `npm run build` as the
build command and `dist/` as the output folder. The placeholder here
only exists so the Docker build works out of the box.

## Run
```bash
docker compose up --build
```

Then:
- Frontend: `http://<SERVER_IP>:4008/`
- API health: `http://<SERVER_IP>:4008/api/health`
- API sync:   `POST http://<SERVER_IP>:4008/api/sync`
- API tasks:  `http://<SERVER_IP>:4008/api/tasks`

## Notes
- CORS is configured for `capacitor://localhost`, `http://localhost`,
  `ionic://localhost`, and `http://localhost:4008`. Add any other
  origins your mobile app uses in `backend/main.py`.
- The `/api/*` routes are registered before the catch-all SPA route in
  `main.py` — keep that order if you add more routes.
- To iterate on the frontend without rebuilding the whole image, uncomment
  the volume mount in `docker-compose.yml` and run `npm run build` locally
  into `./dist`.
