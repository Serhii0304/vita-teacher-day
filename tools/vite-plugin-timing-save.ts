import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Лише для локальної розробки (`npm run dev`).
 * Дає редактору таймкодів змогу зберегти розмітку прямо у src/data/timing.json.
 * У production-збірку цей код не потрапляє: плагін застосовується тільки до dev-сервера.
 */
export function timingSavePlugin(): Plugin {
  const target = fileURLToPath(new URL('../src/data/timing.json', import.meta.url))
  return {
    name: 'vita-timing-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__vita/save-timing', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => {
          body += chunk
          if (body.length > 2_000_000) req.destroy()
        })
        req.on('end', async () => {
          try {
            const data = JSON.parse(body) as { lines?: unknown; sections?: unknown }
            if (!Array.isArray(data.lines) || !Array.isArray(data.sections)) {
              throw new Error('Очікується об’єкт із масивами lines і sections')
            }
            await writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, file: 'src/data/timing.json' }))
          } catch (err) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: String(err) }))
          }
        })
      })
    },
  }
}
