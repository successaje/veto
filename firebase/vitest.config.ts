import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Rules tests share one emulator; run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
