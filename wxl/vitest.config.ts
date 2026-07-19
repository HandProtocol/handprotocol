import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
    css: true,
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
})
