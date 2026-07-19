import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __WXL_BUILD_ID__: JSON.stringify('local'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
    css: true,
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
})
