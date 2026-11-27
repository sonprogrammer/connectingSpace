import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(import.meta.dirname, 'db/migrations'),
          ),
        },
        d1Databases: ['DB'],
      },
    })),
  ],
  test: {
    include: ['src/**/*.worker.test.ts'],
    setupFiles: ['./src/test/setup-worker-d1.ts'],
  },
});
