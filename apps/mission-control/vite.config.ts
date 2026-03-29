import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  // Cast to avoid Vite type duplication issues across monorepo workspaces.
  plugins: [react(), tailwindcss()] as any,
  server: {
    host: "::",
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
} as any)
