import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Resolve the project's "@/..." path alias (tsconfig paths) so unit tests can
// import helpers the same way app code does.
const root = resolve(fileURLToPath(new URL('.', import.meta.url)))

export default defineConfig({
  resolve: {
    alias: { '@': root },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
