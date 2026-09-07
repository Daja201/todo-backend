# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ ./
RUN npm run build   # outputs to /frontend/dist

# ---- Stage 2: Backend runtime ----
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Bring built frontend into backend's dist folder
COPY --from=frontend-builder /frontend/dist ./dist

EXPOSE 4008

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4008"]
