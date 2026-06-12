import type { Task, TaskStatus } from '../types';
import { Icon } from './Icon';

interface TaskBoardProps {
  tasks: Task[];
  loading: boolean;
  onCreate: (status: TaskStatus) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

const columns: Array<{
  status: TaskStatus;
  title: string;
  description: string;
  dot: string;
}> = [
  {
    status: 'todo',
    title: 'To do',
    description: 'Ready to start',
    dot: 'bg-[#7c879d]',
  },
  {
    status: 'in_progress',
    title: 'In progress',
    description: 'Currently moving',
    dot: 'bg-accent',
  },
  {
    status: 'done',
    title: 'Done',
    description: 'Shipped work',
    dot: 'bg-success',
  },
];

const priorityStyles = {
  low: 'bg-[#edf1f6] text-[#637087]',
  medium: 'bg-[#fff0dc] text-[#a96318]',
  high: 'bg-[#ffe5e7] text-[#b83f4b]',
};

function formatDate(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function TaskCard({
  task,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  task: Task;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}) {
  const nextStatus: Record<TaskStatus, TaskStatus> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  };

  return (
    <article className="group rounded-2xl border border-line bg-panel p-4 shadow-[0_12px_34px_-28px_rgba(23,32,51,0.65)] transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.1em] ${priorityStyles[task.priority]}`}
        >
          {task.priority}
        </span>
        <div className="flex opacity-70 transition group-hover:opacity-100">
          <button
            aria-label={`Edit ${task.title}`}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-panel-subtle hover:text-ink"
            onClick={() => onEdit(task)}
            type="button"
          >
            <Icon className="size-4" name="edit" />
          </button>
          <button
            aria-label={`Delete ${task.title}`}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-danger"
            onClick={() => onDelete(task)}
            type="button"
          >
            <Icon className="size-4" name="trash" />
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-extrabold leading-5">{task.title}</h3>
      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">
          {task.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-line/80 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {task.dueDate ? (
            <>
              <Icon className="size-3.5" name="calendar" />
              <span>{formatDate(task.dueDate)}</span>
            </>
          ) : (
            <span>No due date</span>
          )}
        </div>
        <button
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-bold text-accent transition hover:bg-[#f0edff]"
          onClick={() => onStatusChange(task, nextStatus[task.status])}
          type="button"
        >
          {task.status === 'done' ? 'Reopen' : task.status === 'todo' ? 'Start' : 'Complete'}
          <Icon
            className={`size-3.5 ${task.status === 'done' ? '' : 'rotate-0'}`}
            name={task.status === 'in_progress' ? 'check' : 'chevron'}
          />
        </button>
      </div>
    </article>
  );
}

export function TaskBoard({
  tasks,
  loading,
  onCreate,
  onDelete,
  onEdit,
  onStatusChange,
}: TaskBoardProps) {
  if (loading) {
    return (
      <div className="grid gap-5 xl:grid-cols-3">
        {[0, 1, 2].map((column) => (
          <div className="space-y-3" key={column}>
            <div className="h-8 animate-pulse rounded-xl bg-line/60" />
            {[0, 1].map((card) => (
              <div
                className="h-36 animate-pulse rounded-2xl border border-line bg-panel"
                key={card}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        return (
          <section className="min-w-0" key={column.status}>
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <span className={`size-2.5 rounded-full ${column.dot}`} />
                <div>
                  <h2 className="text-sm font-extrabold">{column.title}</h2>
                  <p className="text-[0.68rem] text-muted">{column.description}</p>
                </div>
                <span className="ml-1 rounded-full bg-[#e9ecf1] px-2 py-0.5 text-[0.68rem] font-bold text-muted">
                  {columnTasks.length}
                </span>
              </div>
              <button
                aria-label={`Add task to ${column.title}`}
                className="grid size-8 place-items-center rounded-xl text-muted transition hover:bg-panel hover:text-accent"
                onClick={() => onCreate(column.status)}
                type="button"
              >
                <Icon className="size-4" name="plus" />
              </button>
            </div>

            <div className="space-y-3 rounded-[1.35rem] bg-[#eef0f4]/75 p-2.5">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                  task={task}
                />
              ))}

              {columnTasks.length === 0 ? (
                <button
                  className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel/55 px-4 text-center text-muted transition hover:border-accent/45 hover:bg-panel hover:text-accent"
                  onClick={() => onCreate(column.status)}
                  type="button"
                >
                  <Icon className="mb-2 size-5" name="plus" />
                  <span className="text-xs font-bold">Add a task</span>
                </button>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
