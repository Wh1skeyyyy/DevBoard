import { useEffect, useMemo, useState } from 'react';
import { ProjectForm, TaskForm } from './components/Forms';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import { ProjectSidebar } from './components/ProjectSidebar';
import { TaskBoard } from './components/TaskBoard';
import { api } from './lib/api';
import type {
  Project,
  ProjectInput,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
} from './types';

type ProjectDialog = { mode: 'create' } | { mode: 'edit'; project: Project };
type TaskDialog = { status: TaskStatus; task?: Task };
type DeleteTarget =
  | { kind: 'project'; project: Project }
  | { kind: 'task'; task: Task };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>(
    'all',
  );
  const [projectDialog, setProjectDialog] = useState<ProjectDialog | null>(null);
  const [taskDialog, setTaskDialog] = useState<TaskDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProjects() {
      try {
        const rows = await api.listProjects();
        if (!active) return;
        setProjects(rows);
        setSelectedProjectId((current) => current ?? rows[0]?.id ?? null);
      } catch (loadError) {
        if (active) setError(errorMessage(loadError));
      } finally {
        if (active) setLoadingProjects(false);
      }
    }
    void loadProjects();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) return;

    let active = true;
    async function loadTasks() {
      try {
        const rows = await api.listTasks(selectedProjectId!);
        if (active) setTasks(rows);
      } catch (loadError) {
        if (active) setError(errorMessage(loadError));
      } finally {
        if (active) setLoadingTasks(false);
      }
    }
    void loadTasks();
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, statusFilter, taskSearch, tasks]);

  const stats = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'done').length;
    const inProgress = tasks.filter(
      (task) => task.status === 'in_progress',
    ).length;
    const open = tasks.length - done;
    return {
      done,
      inProgress,
      open,
      completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  async function submitProject(input: ProjectInput) {
    setBusy(true);
    setError(null);
    try {
      if (projectDialog?.mode === 'edit') {
        const updated = await api.updateProject(projectDialog.project.id, input);
        setProjects((current) =>
          current.map((project) => (project.id === updated.id ? updated : project)),
        );
      } else {
        const created = await api.createProject(input);
        setProjects((current) => [created, ...current]);
        setLoadingTasks(true);
        setSelectedProjectId(created.id);
      }
      setProjectDialog(null);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function submitTask(input: TaskInput) {
    setBusy(true);
    setError(null);
    try {
      if (taskDialog?.task) {
        const { projectId: _projectId, ...changes } = input;
        void _projectId;
        const updated = await api.updateTask(taskDialog.task.id, changes);
        setTasks((current) =>
          current.map((task) => (task.id === updated.id ? updated : task)),
        );
      } else {
        const created = await api.createTask(input);
        setTasks((current) => [created, ...current]);
      }
      setTaskDialog(null);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function changeTaskStatus(task: Task, status: TaskStatus) {
    setError(null);
    try {
      const updated = await api.updateTask(task.id, { status });
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (updateError) {
      setError(errorMessage(updateError));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      if (deleteTarget.kind === 'task') {
        await api.deleteTask(deleteTarget.task.id);
        setTasks((current) =>
          current.filter((task) => task.id !== deleteTarget.task.id),
        );
      } else {
        await api.deleteProject(deleteTarget.project.id);
        const remaining = projects.filter(
          (project) => project.id !== deleteTarget.project.id,
        );
        setProjects(remaining);
        setLoadingTasks(remaining.length > 0);
        setSelectedProjectId(remaining[0]?.id ?? null);
        if (remaining.length === 0) setTasks([]);
      }
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <ProjectSidebar
        onClose={() => setSidebarOpen(false)}
        onCreate={() => setProjectDialog({ mode: 'create' })}
        onSearchChange={setProjectSearch}
        onSelect={(projectId) => {
          if (projectId !== selectedProjectId) setLoadingTasks(true);
          setSelectedProjectId(projectId);
        }}
        open={sidebarOpen}
        projects={projects}
        search={projectSearch}
        selectedProjectId={selectedProjectId}
      />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-xl sm:px-7">
          <button
            aria-label="Open project navigation"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-panel text-muted lg:hidden"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Icon className="size-5" name="menu" />
          </button>
          <label className="flex min-w-0 max-w-md flex-1 items-center gap-2.5 rounded-2xl border border-line bg-panel px-4 py-2.5 text-muted shadow-sm focus-within:border-accent">
            <Icon className="size-4 shrink-0" name="search" />
            <span className="sr-only">Search tasks</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
              onChange={(event) => setTaskSearch(event.target.value)}
              placeholder="Search tasks"
              type="search"
              value={taskSearch}
            />
          </label>
          <button
            className="ml-auto flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-extrabold text-white shadow-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            disabled={!selectedProject}
            onClick={() => setTaskDialog({ status: 'todo' })}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            <span className="hidden sm:inline">New task</span>
          </button>
        </header>

        <div className="mx-auto max-w-[94rem] px-4 py-6 sm:px-7 sm:py-8">
          {error ? (
            <div
              className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              <span>{error}</span>
              <button
                aria-label="Dismiss error"
                className="grid size-7 place-items-center rounded-lg hover:bg-red-100"
                onClick={() => setError(null)}
                type="button"
              >
                <Icon className="size-4" name="close" />
              </button>
            </div>
          ) : null}

          {loadingProjects ? (
            <div className="space-y-5">
              <div className="h-28 animate-pulse rounded-[1.75rem] bg-panel" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    className="h-28 animate-pulse rounded-2xl bg-panel"
                    key={item}
                  />
                ))}
              </div>
            </div>
          ) : selectedProject ? (
            <>
              <section className="relative overflow-hidden rounded-[1.75rem] border border-line bg-panel p-6 shadow-card sm:p-8">
                <div className="absolute -right-20 -top-28 size-72 rounded-full bg-[#eeeaff]" />
                <div className="absolute -right-2 top-2 size-24 rounded-full border-[18px] border-white/55" />
                <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div className="max-w-2xl">
                    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-accent">
                      <Icon className="size-4" name="folder" />
                      Active project
                    </div>
                    <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                      {selectedProject.name}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                      {selectedProject.description ||
                        'Add a description to give this project a little more context.'}
                    </p>
                  </div>
                  <div className="relative flex gap-2">
                    <button
                      className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-bold text-muted transition hover:border-accent/40 hover:text-accent"
                      onClick={() =>
                        setProjectDialog({
                          mode: 'edit',
                          project: selectedProject,
                        })
                      }
                      type="button"
                    >
                      <Icon className="size-4" name="edit" />
                      Edit
                    </button>
                    <button
                      aria-label="Delete project"
                      className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-danger"
                      onClick={() =>
                        setDeleteTarget({
                          kind: 'project',
                          project: selectedProject,
                        })
                      }
                      type="button"
                    >
                      <Icon className="size-4" name="trash" />
                    </button>
                  </div>
                </div>
              </section>

              <section
                aria-label="Project statistics"
                className="mt-5 grid gap-3 sm:grid-cols-3"
              >
                {[
                  {
                    label: 'Open tasks',
                    value: stats.open,
                    detail: `${stats.inProgress} currently moving`,
                    icon: 'tasks' as const,
                    color: 'bg-[#e8e4ff] text-accent',
                  },
                  {
                    label: 'Completed',
                    value: stats.done,
                    detail: `${stats.completion}% completion rate`,
                    icon: 'check' as const,
                    color: 'bg-[#dff4ee] text-success',
                  },
                  {
                    label: 'Total tasks',
                    value: tasks.length,
                    detail: tasks.length ? 'Across every status' : 'Create the first task',
                    icon: 'spark' as const,
                    color: 'bg-[#fff0dc] text-warning',
                  },
                ].map((item) => (
                  <article
                    className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 shadow-[0_12px_34px_-30px_rgba(23,32,51,0.7)]"
                    key={item.label}
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${item.color}`}
                    >
                      <Icon className="size-5" name={item.icon} />
                    </span>
                    <div>
                      <p className="text-2xl font-black tracking-tight">{item.value}</p>
                      <p className="text-xs font-bold text-ink">{item.label}</p>
                      <p className="mt-0.5 text-[0.68rem] text-muted">{item.detail}</p>
                    </div>
                  </article>
                ))}
              </section>

              <section className="mt-8">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">
                      Task flow
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
                      Keep the work moving
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      aria-label="Filter by status"
                      className="rounded-xl border border-line bg-panel px-3 py-2 text-xs font-bold text-muted outline-none focus:border-accent"
                      onChange={(event) =>
                        setStatusFilter(event.target.value as TaskStatus | 'all')
                      }
                      value={statusFilter}
                    >
                      <option value="all">All statuses</option>
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                    <select
                      aria-label="Filter by priority"
                      className="rounded-xl border border-line bg-panel px-3 py-2 text-xs font-bold text-muted outline-none focus:border-accent"
                      onChange={(event) =>
                        setPriorityFilter(
                          event.target.value as TaskPriority | 'all',
                        )
                      }
                      value={priorityFilter}
                    >
                      <option value="all">All priorities</option>
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Low priority</option>
                    </select>
                  </div>
                </div>

                <TaskBoard
                  loading={loadingTasks}
                  onCreate={(status) => setTaskDialog({ status })}
                  onDelete={(task) => setDeleteTarget({ kind: 'task', task })}
                  onEdit={(task) => setTaskDialog({ status: task.status, task })}
                  onStatusChange={(task, status) =>
                    void changeTaskStatus(task, status)
                  }
                  tasks={filteredTasks}
                />
              </section>
            </>
          ) : (
            <section className="grid min-h-[65vh] place-items-center">
              <div className="max-w-md text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-[1.5rem] bg-[#e8e4ff] text-accent">
                  <Icon className="size-7" name="folder" />
                </span>
                <h1 className="mt-6 text-3xl font-black tracking-[-0.04em]">
                  Start with a project
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Projects keep tasks, deadlines, and repository activity
                  together in one useful view.
                </p>
                <button
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white shadow-accent transition hover:bg-accent-strong"
                  onClick={() => setProjectDialog({ mode: 'create' })}
                  type="button"
                >
                  <Icon className="size-4" name="plus" />
                  Create your first project
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {projectDialog ? (
        <Modal
          description={
            projectDialog.mode === 'edit'
              ? 'Keep the name and context current.'
              : 'Give the work a clear home.'
          }
          onClose={() => setProjectDialog(null)}
          title={projectDialog.mode === 'edit' ? 'Edit project' : 'New project'}
        >
          <ProjectForm
            busy={busy}
            onCancel={() => setProjectDialog(null)}
            onSubmit={submitProject}
            project={
              projectDialog.mode === 'edit' ? projectDialog.project : undefined
            }
          />
        </Modal>
      ) : null}

      {taskDialog && selectedProject ? (
        <Modal
          description={`Plan the next piece of work for ${selectedProject.name}.`}
          onClose={() => setTaskDialog(null)}
          title={taskDialog.task ? 'Edit task' : 'New task'}
        >
          <TaskForm
            busy={busy}
            initialStatus={taskDialog.status}
            onCancel={() => setTaskDialog(null)}
            onSubmit={submitTask}
            projectId={selectedProject.id}
            task={taskDialog.task}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal
          description={
            deleteTarget.kind === 'project'
              ? 'Its tasks and linked repositories will be removed too.'
              : 'This action cannot be undone.'
          }
          onClose={() => setDeleteTarget(null)}
          title={`Delete ${
            deleteTarget.kind === 'project'
              ? deleteTarget.project.name
              : deleteTarget.task.title
          }?`}
        >
          <div className="flex justify-end gap-3">
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted transition hover:bg-panel-subtle hover:text-ink"
              onClick={() => setDeleteTarget(null)}
              type="button"
            >
              Keep it
            </button>
            <button
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#a93636] disabled:opacity-60"
              disabled={busy}
              onClick={() => void confirmDelete()}
              type="button"
            >
              {busy ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default App;
