import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildReference = process.env.COMMIT_REF?.slice(0, 7)
  ?? process.env.VITE_BUILD_ID?.trim()
  ?? 'local'

export default defineConfig({
  plugins: [react()],
  define: {
    __WXL_BUILD_ID__: JSON.stringify(buildReference),
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})
