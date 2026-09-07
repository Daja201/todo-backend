import { addDaysISO, todayISO, toggleTaskStatus, deleteTask, type Task } from '../api';

const TYPE_CLASS: Record<Task['type'], string> = {
  homework: 'badge-homework',
  test: 'badge-test',
  task: 'badge-task'
};

const TYPE_LABEL: Record<Task['type'], string> = {
  homework: 'Homework',
  test: 'Test',
  task: 'Task'
};

interface Group {
  label: string;
  tasks: Task[];
}

function groupTasks(tasks: Task[]): Group[] {
  const today = todayISO();
  const tomorrow = addDaysISO(1);

  const groups: Record<string, Task[]> = { Today: [], Tomorrow: [], Upcoming: [], Overdue: [] };

  for (const t of tasks) {
    if (t.dueDate === today) groups.Today.push(t);
    else if (t.dueDate === tomorrow) groups.Tomorrow.push(t);
    else if (t.dueDate < today) groups.Overdue.push(t);
    else groups.Upcoming.push(t);
  }

  return (['Overdue', 'Today', 'Tomorrow', 'Upcoming'] as const)
    .map((label) => ({ label, tasks: groups[label] }))
    .filter((g) => g.tasks.length > 0);
}

function formatDate(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

interface Props {
  tasks: Task[];
  loading: boolean;
  onChanged: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

export default function TaskList({ tasks, loading, onChanged, onDeleted }: Props) {
  if (loading && tasks.length === 0) return <div className="task-list__empty">Loading…</div>;
  if (tasks.length === 0) return <div className="task-list__empty">No tasks yet. Add one above.</div>;

  const groups = groupTasks(tasks);

  async function handleToggle(task: Task) {
    const updated = await toggleTaskStatus(task);
    onChanged(updated);
  }

  async function handleDelete(task: Task) {
    await deleteTask(task.id);
    onDeleted(task.id);
  }

  return (
    <div className="task-list">
      {groups.map((group) => (
        <section key={group.label} className="task-group">
          <h2 className="task-group__title">{group.label}</h2>
          {group.tasks.map((task) => (
            <div key={task.id} className={`task-row ${task.status === 'completed' ? 'task-row--done' : ''}`}>
              <button
                type="button"
                className="task-row__check"
                onClick={() => handleToggle(task)}
                aria-label="Toggle complete"
              >
                {task.status === 'completed' ? '✓' : ''}
              </button>

              <div className="task-row__body">
                <div className="task-row__title">{task.title}</div>
                <div className="task-row__meta">
                  <span className={`badge ${TYPE_CLASS[task.type]}`}>{TYPE_LABEL[task.type]}</span>
                  <span className="task-row__date">
                    {formatDate(task.dueDate)}
                    {task.dueTime ? ` · ${task.dueTime}` : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="task-row__delete"
                onClick={() => handleDelete(task)}
                aria-label="Delete task"
              >
                ×
              </button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
