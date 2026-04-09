import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const repoRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  // Cast to avoid Vite type duplication issues across monorepo workspaces.
  plugins: [react(), tailwindcss()] as any,
  server: {
    // `host: "::"` alone can leave some browsers with a blank page on `localhost`; true binds IPv4 + IPv6.
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kora/sdk': path.resolve(repoRoot, 'packages/kora-sdk/src/index.ts'),
    },
  },
} as any)
