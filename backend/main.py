import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Database: plain SQLite file on disk (mount a volume over DATA_DIR to
# persist it across container restarts/rebuilds).
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "tasks.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                type TEXT NOT NULL,
                due_date TEXT NOT NULL,
                due_time TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted INTEGER NOT NULL DEFAULT 0
            )
            """
        )


init_db()

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
TaskType = Literal["homework", "test", "task"]
TaskStatus = Literal["pending", "completed"]


class TaskIn(BaseModel):
    title: str
    type: TaskType
    dueDate: str
    dueTime: Optional[str] = None


class TaskPatch(BaseModel):
    title: Optional[str] = None
    type: Optional[TaskType] = None
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    status: Optional[TaskStatus] = None


def row_to_task(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "type": row["type"],
        "dueDate": row["due_date"],
        "dueTime": row["due_time"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # same-origin web app; loosen only if you add other clients
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = "/api"


@app.get(f"{api}/health")
async def health():
    return {"status": "ok"}


@app.get(f"{api}/tasks")
async def list_tasks():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE deleted = 0 ORDER BY due_date ASC"
        ).fetchall()
    return {"tasks": [row_to_task(r) for r in rows]}


@app.post(f"{api}/tasks")
async def create_task(task: TaskIn):
    now = int(time.time() * 1000)
    task_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO tasks (id, title, type, due_date, due_time, status, created_at, updated_at, deleted)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 0)
            """,
            (task_id, task.title.strip(), task.type, task.dueDate, task.dueTime, now, now),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return row_to_task(row)


@app.patch(f"{api}/tasks/{{task_id}}")
async def update_task(task_id: str, patch: TaskPatch):
    fields = patch.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    column_map = {"dueDate": "due_date", "dueTime": "due_time"}
    now = int(time.time() * 1000)

    with get_db() as conn:
        existing = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        set_clauses = []
        values = []
        for key, value in fields.items():
            column = column_map.get(key, key)
            set_clauses.append(f"{column} = ?")
            values.append(value)
        set_clauses.append("updated_at = ?")
        values.append(now)
        values.append(task_id)

        conn.execute(f"UPDATE tasks SET {', '.join(set_clauses)} WHERE id = ?", values)
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()

    return row_to_task(row)


@app.delete(f"{api}/tasks/{{task_id}}")
async def delete_task(task_id: str):
    now = int(time.time() * 1000)
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.execute(
            "UPDATE tasks SET deleted = 1, updated_at = ? WHERE id = ?", (now, task_id)
        )
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Static frontend (built SPA) + SPA fallback routing
# ---------------------------------------------------------------------------
DIST_DIR = Path(__file__).parent / "dist"

if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if full_path.startswith("api"):
        return JSONResponse({"error": "Not found"}, status_code=404)

    requested_file = DIST_DIR / full_path
    if full_path and requested_file.exists() and requested_file.is_file():
        return FileResponse(requested_file)

    return FileResponse(DIST_DIR / "index.html")
