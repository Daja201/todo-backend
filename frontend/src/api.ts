export type TaskType = 'homework' | 'test' | 'task' | 'idea' | 'due_week';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  dueDate: string; // ISO date YYYY-MM-DD, or NO_DATE sentinel
  dueTime?: string; // optional HH:mm
  status: TaskStatus;
  created_at: number;
  updated_at: number;
}

export interface NewTaskInput {
  title: string;
  type: TaskType;
  dueDate: string;
  dueTime?: string;
}

/** Sentinel value for tasks with no due date */
export const NO_DATE = '9999-12-31';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${options?.method ?? 'GET'} ${path} failed: HTTP ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchTasks(): Promise<Task[]> {
  const data = await request<{ tasks: Task[] }>('/tasks');
  return data.tasks;
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateTask(id: string, changes: Partial<Task>): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes)
  });
}

export async function toggleTaskStatus(task: Task): Promise<Task> {
  return updateTask(task.id, {
    status: task.status === 'completed' ? 'pending' : 'completed'
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/tasks/${id}`, { method: 'DELETE' });
}

/** YYYY-MM-DD in local time (not UTC) so "Today" matches the user's day. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isNoDate(dueDate: string): boolean {
  return dueDate === NO_DATE;
}
