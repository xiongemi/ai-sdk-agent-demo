import { defineConfig } from 'vitest/config';

// sample/ has its own tests, written for `node --test`. They fail on purpose.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
