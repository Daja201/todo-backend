import { useCallback, useEffect, useRef } from 'react';
import { todayISO, type Task } from './api';

const TYPE_LABEL: Record<Task['type'], string> = {
  homework: 'Homework',
  test: 'Test',
  task: 'Task',
  idea: 'Idea',

};

/**
 * Browser notifications only fire while this tab/app is open (there's no
 * background OS scheduler like Capacitor had). We keep an in-memory map of
 * pending setTimeout handles keyed by task id, and reschedule on load /
 * whenever the task list changes.
 */
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function notifyAt(task: Task, at: Date) {
  const delay = at.getTime() - Date.now();
  if (delay < 0 || delay > 2_147_483_647) return; // past due, or too far out for setTimeout

  clearPending(task.id);
  const timer = setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`${TYPE_LABEL[task.type]}: ${task.title}`, {
        body: task.dueTime ? `Due today at ${task.dueTime}` : 'Due today',
        tag: task.id // replaces any existing notification with the same tag
      });
    }
    pendingTimers.delete(task.id);
  }, delay);

  pendingTimers.set(task.id, timer);
}

function clearPending(taskId: string) {
  const timer = pendingTimers.get(taskId);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(taskId);
  }
}

function dueDateTime(task: Task): Date {
  const [hh, mm] = (task.dueTime ?? '07:00').split(':').map(Number);
  const at = new Date(`${task.dueDate}T00:00:00`);
  at.setHours(hh ?? 7, mm ?? 0, 0, 0);
  return at;
}

export function useNotifications(tasks: Task[]) {
  const requestedRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const scheduleForTask = useCallback((task: Task) => {
    if (!('Notification' in window)) return;
    if (task.status === 'completed') {
      clearPending(task.id);
      return;
    }
    notifyAt(task, dueDateTime(task));
  }, []);

  const cancelForTask = useCallback((taskId: string) => {
    clearPending(taskId);
  }, []);

  // Ask for permission once, then (re)schedule everything whenever the
  // task list changes — e.g. after a create/edit/complete/refresh.
  useEffect(() => {
    if (!requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
  }, [requestPermission]);

  useEffect(() => {
    if (Notification.permission !== 'granted') return;
    const today = todayISO();
    for (const task of tasks) {
      if (task.status === 'pending' && task.dueDate >= today) {
        scheduleForTask(task);
      }
    }
    // Clear timers for tasks that no longer exist (deleted/filtered out).
    const currentIds = new Set(tasks.map((t) => t.id));
    for (const id of pendingTimers.keys()) {
      if (!currentIds.has(id)) clearPending(id);
    }
  }, [tasks, scheduleForTask]);

  return { requestPermission, scheduleForTask, cancelForTask };
}
