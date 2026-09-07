import { useCallback, useEffect, useState } from 'react';
import { fetchTasks, type Task } from './api';

export type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Server is the single source of truth (SQLite on the backend, same
 * origin as this app). We just fetch-and-refresh — no local cache, no
 * offline queue, no backend-URL configuration needed.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus((s) => (s === 'ready' ? 'ready' : 'loading'));
      const data = await fetchTasks();
      setTasks(data);
      setStatus('ready');
      setLastError(null);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Failed to load tasks');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();

    // Re-fetch when the tab regains focus/visibility, and on an interval,
    // so the view stays current without needing a manual refresh button.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(refresh, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  return { tasks, status, lastError, refresh };
}
