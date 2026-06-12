import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://devboard:devboard@127.0.0.1:59999/devboard_test',
      GITHUB_TOKEN: 'test-token',
      GITHUB_CACHE_TTL_SECONDS: '300',
    },
  },
});
