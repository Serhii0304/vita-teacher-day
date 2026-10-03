import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { timingSavePlugin } from './tools/vite-plugin-timing-save.ts'

/**
 * Базовий шлях сайту.
 *  - Локально та для будь-якого хостингу за замовчуванням використовується відносний шлях './',
 *    тож зібрану папку dist можна покласти і в корінь домену, і в будь-яку підпапку.
 *  - Для GitHub Pages workflow передає BASE_PATH (наприклад '/vita-teacher-day/').
 *  - Також можна викликати `vite build --base /my-folder/`.
 */
function resolveBase(): string {
  const raw = process.env.BASE_PATH?.trim()
  if (!raw) return './'
  let base = raw.startsWith('/') || raw.startsWith('.') ? raw : `/${raw}`
  if (!base.endsWith('/')) base += '/'
  return base
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), timingSavePlugin()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})
