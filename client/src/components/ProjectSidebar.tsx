import type { Project } from '../types';
import { Icon } from './Icon';

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: number | null;
  search: string;
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (projectId: number) => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  search,
  open,
  onClose,
  onCreate,
  onSearchChange,
  onSelect,
}: ProjectSidebarProps) {
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {open ? (
        <button
          aria-label="Close project navigation"
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[19rem] flex-col border-r border-line bg-[#f8f9fb] transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-xs font-black text-white shadow-accent">
              DB
            </span>
            <div>
              <p className="font-extrabold tracking-tight">DevBoard</p>
              <p className="text-xs text-muted">Build with focus</p>
            </div>
          </div>
          <button
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-xl text-muted lg:hidden"
            onClick={onClose}
            type="button"
          >
            <Icon className="size-5" name="close" />
          </button>
        </div>

        <nav className="px-4">
          <p className="px-3 pb-2 pt-4 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-muted">
            Workspace
          </p>
          <div className="rounded-2xl bg-accent px-3 py-3 text-white shadow-accent">
            <div className="flex items-center gap-3">
              <Icon className="size-5" name="tasks" />
              <span className="text-sm font-bold">Project board</span>
            </div>
          </div>
        </nav>

        <div className="mt-7 flex min-h-0 flex-1 flex-col px-4">
          <div className="flex items-center justify-between px-3">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-muted">
              Projects
            </p>
            <button
              aria-label="Create project"
              className="grid size-8 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-accent"
              onClick={onCreate}
              type="button"
            >
              <Icon className="size-4" name="plus" />
            </button>
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-muted focus-within:border-accent">
            <Icon className="size-4" name="search" />
            <span className="sr-only">Search projects</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Find a project"
              type="search"
              value={search}
            />
          </label>

          <div className="mt-3 min-h-0 space-y-1 overflow-y-auto pb-5">
            {filteredProjects.map((project, index) => {
              const active = project.id === selectedProjectId;
              const colorClasses = [
                'bg-[#e8e4ff] text-[#6751dc]',
                'bg-[#dff4ee] text-[#167d65]',
                'bg-[#ffedd8] text-[#ae6518]',
                'bg-[#e1edff] text-[#3467b6]',
              ];
              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    active
                      ? 'bg-white text-ink shadow-sm ring-1 ring-line'
                      : 'text-muted hover:bg-white/70 hover:text-ink'
                  }`}
                  key={project.id}
                  onClick={() => {
                    onSelect(project.id);
                    onClose();
                  }}
                  type="button"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl text-[0.68rem] font-black ${
                      colorClasses[index % colorClasses.length]
                    }`}
                  >
                    {initials(project.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {project.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {project.description || 'No description'}
                    </span>
                  </span>
                  {active ? <span className="size-1.5 rounded-full bg-accent" /> : null}
                </button>
              );
            })}

            {filteredProjects.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                No projects found.
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
            <span className="grid size-9 place-items-center rounded-xl bg-ink text-xs font-bold text-white">
              YO
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Your workspace</p>
              <p className="truncate text-xs text-muted">Single-user mode</p>
            </div>
            <Icon className="size-4 text-muted" name="settings" />
          </div>
        </div>
      </aside>
    </>
  );
}
