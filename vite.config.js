import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pulsateDbApi } from './tools/dbApi.mjs'

export default defineConfig({
  plugins: [react(), pulsateDbApi()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
})
