import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        default: resolve(__dirname, 'Entry Segment Default.dc.html'),
        redesign: resolve(__dirname, 'Entry Segment Redesign.dc.html'),
      },
    },
  },
})
