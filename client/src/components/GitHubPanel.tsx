import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type {
  GitHubActivity,
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
} from '../types';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface GitHubPanelProps {
  projectId: number;
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function relativeDate(value: string | null) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(days) < 1) return 'today';
  if (Math.abs(days) < 30) return formatter.format(days, 'day');
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function authorName(author: { login: string | null; name: string | null }) {
  return author.login ?? author.name ?? 'Unknown author';
}

function ActivityColumn({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: 'gitCommit' | 'issue' | 'pullRequest';
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[1.4rem] border border-line bg-panel">
      <header className="flex items-center justify-between border-b border-line px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-[#eeeaff] text-accent">
            <Icon className="size-4" name={icon} />
          </span>
          <h3 className="text-sm font-extrabold">{title}</h3>
        </div>
        <span className="rounded-full bg-panel-subtle px-2.5 py-1 text-[0.68rem] font-extrabold text-muted">
          {count}
        </span>
      </header>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function CommitRow({ commit }: { commit: GitHubCommit }) {
  return (
    <a
      className="group block px-4 py-4 transition hover:bg-panel-subtle"
      href={commit.htmlUrl}
      rel="noreferrer"
      target="_blank"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#edf1f6] text-muted">
          <Icon className="size-4" name="gitCommit" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-bold leading-5 text-ink group-hover:text-accent">
            {commit.message.split('\n')[0]}
          </p>
          <p className="mt-1 text-[0.68rem] text-muted">
            {authorName(commit.author)} · {relativeDate(commit.committedAt)}
          </p>
          <code className="mt-1.5 inline-block rounded bg-[#edf1f6] px-1.5 py-0.5 text-[0.62rem] font-bold text-muted">
            {commit.sha.slice(0, 7)}
          </code>
        </div>
      </div>
    </a>
  );
}

function IssueRow({ issue }: { issue: GitHubIssue }) {
  return (
    <a
      className="group block px-4 py-4 transition hover:bg-panel-subtle"
      href={issue.htmlUrl}
      rel="noreferrer"
      target="_blank"
    >
      <p className="line-clamp-2 text-xs font-bold leading-5 group-hover:text-accent">
        <span className="mr-1.5 text-success">#{issue.number}</span>
        {issue.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {issue.labels.slice(0, 2).map((label) => (
          <span
            className="rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold"
            key={label.name}
            style={{
              color: label.color ? `#${label.color}` : '#637087',
              backgroundColor: label.color ? `#${label.color}18` : '#edf1f6',
            }}
          >
            {label.name}
          </span>
        ))}
        <span className="ml-auto text-[0.68rem] text-muted">
          {relativeDate(issue.updatedAt)}
        </span>
      </div>
    </a>
  );
}

function PullRequestRow({ pullRequest }: { pullRequest: GitHubPullRequest }) {
  return (
    <a
      className="group block px-4 py-4 transition hover:bg-panel-subtle"
      href={pullRequest.htmlUrl}
      rel="noreferrer"
      target="_blank"
    >
      <p className="line-clamp-2 text-xs font-bold leading-5 group-hover:text-accent">
        <span className="mr-1.5 text-accent">#{pullRequest.number}</span>
        {pullRequest.title}
      </p>
      <div className="mt-2 flex items-center gap-2 text-[0.68rem] text-muted">
        {pullRequest.draft ? (
          <span className="rounded-full bg-[#edf1f6] px-2 py-0.5 font-bold">
            Draft
          </span>
        ) : null}
        <span className="min-w-0 truncate">
          {pullRequest.headRef} → {pullRequest.baseRef}
        </span>
        <span className="ml-auto shrink-0">
          {relativeDate(pullRequest.updatedAt)}
        </span>
      </div>
    </a>
  );
}

function EmptyActivity({ label }: { label: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-xs font-bold text-muted">No open {label}.</p>
    </div>
  );
}

export function GitHubPanel({ projectId }: GitHubPanelProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activity, setActivity] = useState<GitHubActivity | null>(null);
  const [loadingRepositories, setLoadingRepositories] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [deleteRepository, setDeleteRepository] =
    useState<GitHubRepository | null>(null);

  async function loadActivity(repositoryId: number, force = false) {
    setLoadingActivity(true);
    setError(null);
    try {
      const nextActivity = force
        ? await api.refreshRepository(repositoryId)
        : await api.getRepositoryActivity(repositoryId);
      setActivity(nextActivity);
      setRepositories((current) =>
        current.map((repository) =>
          repository.id === repositoryId
            ? {
                ...nextActivity.repository,
                cache: {
                  fetchedAt: nextActivity.cache.fetchedAt,
                  expiresAt: nextActivity.cache.expiresAt,
                },
              }
            : repository,
        ),
      );
    } catch (loadError) {
      setError(messageFrom(loadError));
    } finally {
      setLoadingActivity(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadRepositories() {
      try {
        const rows = await api.listRepositories(projectId);
        if (!active) return;
        setRepositories(rows);
        const firstId = rows[0]?.id ?? null;
        setSelectedId(firstId);
        if (firstId !== null) {
          const firstActivity = await api.getRepositoryActivity(firstId);
          if (active) setActivity(firstActivity);
        }
      } catch (loadError) {
        if (active) setError(messageFrom(loadError));
      } finally {
        if (active) {
          setLoadingRepositories(false);
          setLoadingActivity(false);
        }
      }
    }
    void loadRepositories();
    return () => {
      active = false;
    };
  }, [projectId]);

  async function linkRepository(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const linked = await api.linkRepository(projectId, repositoryUrl.trim());
      setRepositories((current) => [linked, ...current]);
      setSelectedId(linked.id);
      setLinkDialogOpen(false);
      setRepositoryUrl('');
      await loadActivity(linked.id);
    } catch (linkError) {
      setError(messageFrom(linkError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRepository) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteRepository(projectId, deleteRepository.id);
      const remaining = repositories.filter(
        (repository) => repository.id !== deleteRepository.id,
      );
      setRepositories(remaining);
      const nextId = remaining[0]?.id ?? null;
      setSelectedId(nextId);
      setActivity(null);
      setDeleteRepository(null);
      if (nextId !== null) await loadActivity(nextId);
    } catch (deleteError) {
      setError(messageFrom(deleteError));
    } finally {
      setBusy(false);
    }
  }

  const selectedRepository = repositories.find(
    (repository) => repository.id === selectedId,
  );

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">
            Repository pulse
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
            GitHub activity, without the tab sprawl
          </h2>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#27324a]"
          onClick={() => setLinkDialogOpen(true)}
          type="button"
        >
          <Icon className="size-4" name="link" />
          Link repository
        </button>
      </div>

      {error ? (
        <div
          className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <span>{error}</span>
          <button
            aria-label="Dismiss error"
            onClick={() => setError(null)}
            type="button"
          >
            <Icon className="size-4" name="close" />
          </button>
        </div>
      ) : null}

      {loadingRepositories ? (
        <div className="h-32 animate-pulse rounded-[1.5rem] bg-panel" />
      ) : repositories.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-line bg-panel px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eceff3] text-ink">
            <Icon className="size-7" name="github" />
          </span>
          <h3 className="mt-5 text-xl font-black tracking-tight">
            Bring the repository into view
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Link a public or private GitHub repository to see recent commits,
            open issues, and pull requests beside the work they belong to.
          </p>
          <button
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white shadow-accent"
            onClick={() => setLinkDialogOpen(true)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            Link the first repository
          </button>
        </div>
      ) : (
        <>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
            {repositories.map((repository) => {
              const active = repository.id === selectedId;
              return (
                <button
                  className={`min-w-60 rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-accent bg-[#f3f0ff] shadow-sm'
                      : 'border-line bg-panel hover:border-accent/35'
                  }`}
                  key={repository.id}
                  onClick={() => {
                    if (repository.id === selectedId) return;
                    setSelectedId(repository.id);
                    setActivity(null);
                    void loadActivity(repository.id);
                  }}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        active
                          ? 'bg-accent text-white'
                          : 'bg-[#eceff3] text-ink'
                      }`}
                    >
                      <Icon className="size-5" name="github" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">
                        {repository.owner}/{repository.name}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] capitalize text-muted">
                        {repository.visibility} · {repository.defaultBranch}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRepository ? (
            <div className="mt-2 overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-card">
              <div className="flex flex-col justify-between gap-4 border-b border-line bg-gradient-to-r from-[#f4f1ff] to-white p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-black tracking-tight">
                      {selectedRepository.owner}/{selectedRepository.name}
                    </h3>
                    <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-muted">
                      {selectedRepository.visibility}
                    </span>
                    {activity ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] ${
                          activity.cache.status === 'stale'
                            ? 'bg-[#fff0dc] text-warning'
                            : 'bg-[#dff4ee] text-success'
                        }`}
                      >
                        {activity.cache.status}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-2xl truncate text-xs text-muted">
                    {selectedRepository.description || 'No repository description'}
                  </p>
                  {activity?.cache.warning ? (
                    <p className="mt-2 text-xs font-bold text-warning">
                      {activity.cache.warning}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted transition hover:text-accent"
                    href={selectedRepository.url}
                    rel="noreferrer"
                    target="_blank"
                    title="Open on GitHub"
                  >
                    <Icon className="size-4" name="external" />
                  </a>
                  <button
                    aria-label="Refresh repository activity"
                    className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-extrabold text-muted transition hover:text-accent disabled:opacity-50"
                    disabled={loadingActivity}
                    onClick={() => void loadActivity(selectedRepository.id, true)}
                    type="button"
                  >
                    <Icon
                      className={`size-4 ${loadingActivity ? 'animate-spin' : ''}`}
                      name="refresh"
                    />
                    Refresh
                  </button>
                  <button
                    aria-label="Unlink repository"
                    className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-danger"
                    onClick={() => setDeleteRepository(selectedRepository)}
                    type="button"
                  >
                    <Icon className="size-4" name="trash" />
                  </button>
                </div>
              </div>

              {loadingActivity || !activity ? (
                <div className="grid gap-4 p-4 lg:grid-cols-3 sm:p-5">
                  {[0, 1, 2].map((item) => (
                    <div
                      className="h-72 animate-pulse rounded-[1.4rem] bg-panel-subtle"
                      key={item}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 p-4 lg:grid-cols-3 sm:p-5">
                  <ActivityColumn
                    count={activity.commits.length}
                    icon="gitCommit"
                    title="Recent commits"
                  >
                    {activity.commits.length ? (
                      activity.commits.map((commit) => (
                        <CommitRow commit={commit} key={commit.sha} />
                      ))
                    ) : (
                      <EmptyActivity label="commits" />
                    )}
                  </ActivityColumn>
                  <ActivityColumn
                    count={activity.issues.length}
                    icon="issue"
                    title="Open issues"
                  >
                    {activity.issues.length ? (
                      activity.issues.map((issue) => (
                        <IssueRow issue={issue} key={issue.number} />
                      ))
                    ) : (
                      <EmptyActivity label="issues" />
                    )}
                  </ActivityColumn>
                  <ActivityColumn
                    count={activity.pullRequests.length}
                    icon="pullRequest"
                    title="Open pull requests"
                  >
                    {activity.pullRequests.length ? (
                      activity.pullRequests.map((pullRequest) => (
                        <PullRequestRow
                          key={pullRequest.number}
                          pullRequest={pullRequest}
                        />
                      ))
                    ) : (
                      <EmptyActivity label="pull requests" />
                    )}
                  </ActivityColumn>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {linkDialogOpen ? (
        <Modal
          description="Use the full https://github.com/owner/repository URL."
          onClose={() => setLinkDialogOpen(false)}
          title="Link a GitHub repository"
        >
          <form className="space-y-5" onSubmit={linkRepository}>
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-muted">
                Repository URL
              </span>
              <input
                autoFocus
                className="w-full rounded-xl border border-line bg-panel-subtle px-3.5 py-3 text-sm outline-none transition placeholder:text-muted/65 focus:border-accent focus:bg-panel"
                onChange={(event) => setRepositoryUrl(event.target.value)}
                placeholder="https://github.com/acme/platform"
                required
                type="url"
                value={repositoryUrl}
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted hover:bg-panel-subtle"
                onClick={() => setLinkDialogOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-extrabold text-white shadow-accent disabled:opacity-60"
                disabled={busy || !repositoryUrl.trim()}
                type="submit"
              >
                {busy ? 'Linking...' : 'Link repository'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteRepository ? (
        <Modal
          description="The cached activity will be removed. The GitHub repository itself is not changed."
          onClose={() => setDeleteRepository(null)}
          title={`Unlink ${deleteRepository.owner}/${deleteRepository.name}?`}
        >
          <div className="flex justify-end gap-3">
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted hover:bg-panel-subtle"
              onClick={() => setDeleteRepository(null)}
              type="button"
            >
              Keep linked
            </button>
            <button
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
              disabled={busy}
              onClick={() => void confirmDelete()}
              type="button"
            >
              {busy ? 'Unlinking...' : 'Unlink'}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
