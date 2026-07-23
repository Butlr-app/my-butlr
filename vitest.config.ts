import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 1,
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/lib/reservationWorkflow.ts',
        'src/components/reservation/ReservationCreateModal.tsx',
        'src/pages/app/Reservations.tsx',
      ],
    },
  },
})
