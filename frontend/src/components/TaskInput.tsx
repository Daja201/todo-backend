import { useState, useRef } from 'react';
import { createTask, addDaysISO, todayISO, endOfWeekISO, NO_DATE, type TaskType, type Task } from '../api';

const TYPES: { value: TaskType; label: string; className: string }[] = [
  { value: 'homework', label: 'Homework', className: 'badge-homework' },
  { value: 'test',     label: 'Test',     className: 'badge-test' },
  { value: 'task',     label: 'Task',     className: 'badge-task' },
  { value: 'idea',     label: 'Idea',     className: 'badge-idea' },
];

type QuickDate = 'today' | 'tomorrow' | 'in2' | 'in7' | 'week' | 'nodate' | 'custom';

const QUICK_DATES: { value: QuickDate; label: string }[] = [
  { value: 'today',    label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'in2',      label: 'In 2 Days' },
  { value: 'in7',      label: 'In 7 Days' },
  { value: 'week',     label: 'This Week' },
  { value: 'nodate',   label: 'No Date' },
  { value: 'custom',   label: 'Custom' },
];

interface Props {
  onCreated: (task: Task) => void;
}

export default function TaskInput({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('task');
  const [quickDate, setQuickDate] = useState<QuickDate>('today');
  const [customDate, setCustomDate] = useState(todayISO());
  const [customTime, setCustomTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function resolveDate(): string {
    switch (quickDate) {
      case 'today':    return todayISO();
      case 'tomorrow': return addDaysISO(1);
      case 'in2':      return addDaysISO(2);
      case 'in7':      return addDaysISO(7);
      case 'week':     return endOfWeekISO();
      case 'nodate':   return NO_DATE;
      case 'custom':   return customDate;
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
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  }

  return (
    <div className="task-input">
      <input
        ref={inputRef}
        className="task-input__field"
        type="text"
        placeholder="New task… (Enter to add)"
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
        {QUICK_DATES.map((q) => (
          <button
            key={q.value}
            type="button"
            className={`chip ${quickDate === q.value ? 'chip--active' : ''}`}
            onClick={() => setQuickDate(q.value)}
          >
            {q.label}
          </button>
        ))}
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

      <button
        type="button"
        className="task-input__submit"
        onClick={submit}
        disabled={submitting || !title.trim()}
      >
        {submitting ? 'Adding…' : 'Add Task'}
      </button>
    </div>
  );
}
