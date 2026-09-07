import { useState, useRef } from 'react';
import { createTask, addDaysISO, todayISO, type TaskType, type Task } from '../api';

const TYPES: { value: TaskType; label: string; className: string }[] = [
  { value: 'homework', label: 'Homework', className: 'badge-homework' },
  { value: 'test', label: 'Test', className: 'badge-test' },
  { value: 'task', label: 'Task', className: 'badge-task' }
];

type QuickDate = 'today' | 'tomorrow' | 'in2' | 'custom';

interface Props {
  onCreated: (task: Task) => void;
}

export default function TaskInput({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('homework');
  const [quickDate, setQuickDate] = useState<QuickDate>('today');
  const [customDate, setCustomDate] = useState(todayISO());
  const [customTime, setCustomTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function resolveDate(): string {
    switch (quickDate) {
      case 'today':
        return todayISO();
      case 'tomorrow':
        return addDaysISO(1);
      case 'in2':
        return addDaysISO(2);
      case 'custom':
        return customDate;
    }
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    const dueDate = resolveDate();
    const dueTime = quickDate === 'custom' ? customTime || undefined : undefined;

    setSubmitting(true);
    try {
      const task = await createTask({ title: trimmed, type, dueDate, dueTime });
      onCreated(task);
      setTitle('');
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="task-input">
      <input
        ref={inputRef}
        className="task-input__field"
        type="text"
        placeholder="Add a task and press Enter..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      <div className="task-input__row">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`chip ${t.className} ${type === t.value ? 'chip--active' : ''}`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="task-input__row">
        <button
          type="button"
          className={`chip ${quickDate === 'today' ? 'chip--active' : ''}`}
          onClick={() => setQuickDate('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={`chip ${quickDate === 'tomorrow' ? 'chip--active' : ''}`}
          onClick={() => setQuickDate('tomorrow')}
        >
          Tomorrow
        </button>
        <button
          type="button"
          className={`chip ${quickDate === 'in2' ? 'chip--active' : ''}`}
          onClick={() => setQuickDate('in2')}
        >
          In 2 Days
        </button>
        <button
          type="button"
          className={`chip ${quickDate === 'custom' ? 'chip--active' : ''}`}
          onClick={() => setQuickDate('custom')}
        >
          Custom
        </button>
      </div>

      {quickDate === 'custom' && (
        <div className="task-input__row">
          <input
            type="date"
            className="task-input__date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
          <input
            type="time"
            className="task-input__date"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
          />
        </div>
      )}

      <button type="button" className="task-input__submit" onClick={submit} disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Task'}
      </button>
    </div>
  );
}
