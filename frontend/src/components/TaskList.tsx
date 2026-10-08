import { useState } from 'react';
import {
  addDaysISO, todayISO, toggleTaskStatus, deleteTask, updateTask,
  NO_DATE, isNoDate, type Task, type TaskType
} from '../api';

const TYPE_CLASS: Record<TaskType, string> = {
  homework: 'badge-homework',
  test:     'badge-test',
  task:     'badge-task',
  idea:     'badge-idea',
  due_week: 'badge-due_week',
};

const TYPE_LABEL: Record<TaskType, string> = {
  homework: 'Homework',
  test:     'Test',
  task:     'Task',
  idea:     'Idea',
  due_week: 'This Week',
};

const ALL_TYPES: TaskType[] = ['homework', 'test', 'task', 'idea', 'due_week'];

interface Group {
  label: string;
  tasks: Task[];
}

function groupTasks(tasks: Task[]): Group[] {
  const today    = todayISO();
  const tomorrow = addDaysISO(1);

  const groups: Record<string, Task[]> = {
    Overdue: [], Today: [], Tomorrow: [], Upcoming: [], 'No Date': []
  };

  for (const t of tasks) {
    if (isNoDate(t.dueDate))          groups['No Date'].push(t);
    else if (t.dueDate === today)     groups.Today.push(t);
    else if (t.dueDate === tomorrow)  groups.Tomorrow.push(t);
    else if (t.dueDate < today)       groups.Overdue.push(t);
    else                              groups.Upcoming.push(t);
  }

  return (['Overdue', 'Today', 'Tomorrow', 'Upcoming', 'No Date'] as const)
    .map((label) => ({ label, tasks: groups[label] }))
    .filter((g) => g.tasks.length > 0);
}

function formatDate(dueDate: string): string {
  if (isNoDate(dueDate)) return 'No due date';
  const d = new Date(`${dueDate}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Confirm delete dialog ───────────────────────────────────────────────────

interface ConfirmProps {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDelete({ taskTitle, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-box__title">Delete this task?</p>
        <p className="confirm-box__body">"{taskTitle}" will be permanently removed.</p>
        <div className="confirm-box__actions">
          <button className="confirm-box__cancel" onClick={onCancel}>Cancel</button>
          <button className="confirm-box__delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Inline edit form ────────────────────────────────────────────────────────

interface EditFormProps {
  task: Task;
  onSave: (updated: Task) => void;
  onCancel: () => void;
}

function EditForm({ task, onSave, onCancel }: EditFormProps) {
  const [title, setTitle]   = useState(task.title);
  const [type, setType]     = useState<TaskType>(task.type);
  const [dueDate, setDueDate] = useState(isNoDate(task.dueDate) ? '' : task.dueDate);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const updated = await updateTask(task.id, {
        title: trimmed,
        type,
        dueDate: dueDate || NO_DATE,
      });
      onSave(updated);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div className="task-row__edit-form">
      <input
        className="task-row__edit-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="task-row__edit-row">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${TYPE_CLASS[t]} ${type === t ? 'chip--active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setType(t)}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="task-row__edit-row">
        <input
          type="date"
          className="task-row__edit-date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="Leave blank for no due date"
        />
        <button className="task-row__edit-save"   onClick={save}    disabled={saving}>{saving ? '…' : 'Save'}</button>
        <button className="task-row__edit-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main list ───────────────────────────────────────────────────────────────

interface Props {
  tasks: Task[];
  loading: boolean;
  onChanged: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

export default function TaskList({ tasks, loading, onChanged, onDeleted }: Props) {
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const today = todayISO();

  if (loading && tasks.length === 0) return <div className="task-list__empty">Loading…</div>;
  if (tasks.length === 0) return <div className="task-list__empty">No tasks yet. Add one above.</div>;

  const groups = groupTasks(tasks);

  async function handleToggle(task: Task) {
    const updated = await toggleTaskStatus(task);
    onChanged(updated);
  }

  async function confirmDelete() {
    if (!deletingTask) return;
    await deleteTask(deletingTask.id);
    onDeleted(deletingTask.id);
    setDeletingTask(null);
  }

  return (
    <>
      {deletingTask && (
        <ConfirmDelete
          taskTitle={deletingTask.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingTask(null)}
        />
      )}

      <div className="task-list">
        {groups.map((group) => (
          <section key={group.label} className="task-group">
            <h2 className="task-group__title">{group.label}</h2>
            {group.tasks.map((task) => {
              const isToday   = task.dueDate === today && !isNoDate(task.dueDate);
              const isDone    = task.status === 'completed';
              const isEditing = editingId === task.id;

              return (
                <div
                  key={task.id}
                  className={[
                    'task-row',
                    isDone  ? 'task-row--done'  : '',
                    isToday ? 'task-row--today' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <button
                    type="button"
                    className="task-row__check"
                    onClick={() => handleToggle(task)}
                    aria-label="Toggle complete"
                  >
                    {isDone ? '✓' : ''}
                  </button>

                  {isEditing ? (
                    <EditForm
                      task={task}
                      onSave={(updated) => { onChanged(updated); setEditingId(null); }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
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
                  )}

                  {!isEditing && (
                    <div className="task-row__actions">
                      <button
                        type="button"
                        className="task-row__edit"
                        onClick={() => setEditingId(task.id)}
                        aria-label="Edit task"
                      >✎</button>
                      <button
                        type="button"
                        className="task-row__delete"
                        onClick={() => setDeletingTask(task)}
                        aria-label="Delete task"
                      >×</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
