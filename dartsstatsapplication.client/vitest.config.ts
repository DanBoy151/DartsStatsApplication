import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import plugin from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [plugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
})
