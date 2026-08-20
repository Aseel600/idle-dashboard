import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['unit/**/*.test.js'],
    globals: true,
    setupFiles: [],
    // The app's logic is timezone- and clock-sensitive throughout; fake timers are
    // opted into per-test rather than globally so the harness boot stays real.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './.coverage',
      include: ['../script.js', '../dayflow.js'],
      // Neither file is a module; coverage here is indicative, not a gate.
      all: false
    }
  }
});
