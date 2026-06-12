import { useState, type FormEvent } from 'react';
import type {
  Project,
  ProjectInput,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
} from '../types';

const fieldClass =
  'w-full rounded-xl border border-line bg-panel-subtle px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/65 focus:border-accent focus:bg-panel';

interface ProjectFormProps {
  project?: Project;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: ProjectInput) => Promise<void>;
}

export function ProjectForm({
  project,
  busy,
  onCancel,
  onSubmit,
}: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
          Project name
        </span>
        <input
          autoFocus
          className={fieldClass}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          placeholder="Platform refresh"
          required
          value={name}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
          Description
        </span>
        <textarea
          className={`${fieldClass} min-h-28 resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What are you building?"
          value={description}
        />
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition hover:bg-panel-subtle hover:text-ink"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-extrabold text-white shadow-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy || !name.trim()}
          type="submit"
        >
          {busy ? 'Saving...' : project ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

interface TaskFormProps {
  projectId: number;
  initialStatus: TaskStatus;
  task?: Task;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: TaskInput) => Promise<void>;
}

export function TaskForm({
  projectId,
  initialStatus,
  task,
  busy,
  onCancel,
  onSubmit,
}: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus);
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'medium',
  );
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? '');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      projectId,
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
          Task title
        </span>
        <input
          autoFocus
          className={fieldClass}
          maxLength={180}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ship the project dashboard"
          required
          value={title}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
          Description
        </span>
        <textarea
          className={`${fieldClass} min-h-24 resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add context, acceptance notes, or a useful reminder."
          value={description}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
            Status
          </span>
          <select
            className={fieldClass}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            value={status}
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
            Priority
          </span>
          <select
            className={fieldClass}
            onChange={(event) =>
              setPriority(event.target.value as TaskPriority)
            }
            value={priority}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
            Due date
          </span>
          <input
            className={fieldClass}
            onChange={(event) => setDueDate(event.target.value)}
            type="date"
            value={dueDate}
          />
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition hover:bg-panel-subtle hover:text-ink"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-extrabold text-white shadow-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy || !title.trim()}
          type="submit"
        >
          {busy ? 'Saving...' : task ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
