import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import { useTasks } from './useTasks';
import { useNotifications } from './useNotifications';
import type { Task } from './api';

const STATUS_LABEL: Record<string, string> = {
  loading: 'Loading…',
  ready: 'Up to date',
  error: 'Connection error'
};

export default function App() {
  const { tasks, status, lastError, refresh } = useTasks();
  useNotifications(tasks);

  function handleCreated(_task: Task) {
    refresh();
  }

  function handleChanged(_task: Task) {
    refresh();
  }

  function handleDeleted(_taskId: string) {
    refresh();
  }

  return (
    <div className="app">
      <header className="app__header">
        <span className={`sync-dot sync-dot--${status}`} />
        <span className="app__status">{STATUS_LABEL[status]}</span>
        <button type="button" className="app__refresh" onClick={() => refresh()} aria-label="Refresh">
          ⟳
        </button>
      </header>

      {status === 'error' && lastError && <div className="settings-panel__error">{lastError}</div>}

      <main className="app__main">
        <TaskInput onCreated={handleCreated} />
        <TaskList tasks={tasks} loading={status === 'loading'} onChanged={handleChanged} onDeleted={handleDeleted} />
      </main>
    </div>
  );
}
