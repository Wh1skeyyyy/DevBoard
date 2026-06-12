import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api } from './lib/api';
import type { Project, Task } from './types';

vi.mock('./lib/api', () => ({
  api: {
    listProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    listRepositories: vi.fn(),
    linkRepository: vi.fn(),
    deleteRepository: vi.fn(),
    getRepositoryActivity: vi.fn(),
    refreshRepository: vi.fn(),
  },
}));

const project: Project = {
  id: 1,
  name: 'Platform refresh',
  description: 'Modernize the developer workspace',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const tasks: Task[] = [
  {
    id: 10,
    projectId: 1,
    title: 'Build API',
    description: 'Create the project routes',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-07-01T12:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 11,
    projectId: 1,
    title: 'Write dashboard docs',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

const mockedApi = vi.mocked(api);

beforeEach(() => {
  mockedApi.listProjects.mockResolvedValue([project]);
  mockedApi.listTasks.mockResolvedValue(tasks);
  mockedApi.createTask.mockResolvedValue({
    ...tasks[1],
    id: 12,
    title: 'Test the dashboard',
  });
});

describe('DevBoard dashboard', () => {
  it('loads the active project and filters tasks by search', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Platform refresh' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Build API')).toBeInTheDocument();
    expect(screen.getByText('Write dashboard docs')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search tasks' }),
      'docs',
    );

    expect(screen.queryByText('Build API')).not.toBeInTheDocument();
    expect(screen.getByText('Write dashboard docs')).toBeInTheDocument();
  });

  it('creates a task from the header action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Platform refresh' });
    await user.click(screen.getByRole('button', { name: 'New task' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Task title' }),
      'Test the dashboard',
    );
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(() => {
      expect(mockedApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 1,
          title: 'Test the dashboard',
          status: 'todo',
          priority: 'medium',
        }),
      );
    });
    expect(await screen.findByText('Test the dashboard')).toBeInTheDocument();
  });
});
