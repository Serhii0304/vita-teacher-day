import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts'
import './styles/global.css'
import { App } from './App'

const container = document.getElementById('root')!
const root = createRoot(container)

/*
 * Інструменти розробника (редактор таймкодів, лабораторія персонажів) підключаються
 * тільки під час `npm run dev`: умова import.meta.env.DEV у production дорівнює false,
 * тому цей код не потрапляє у фінальну збірку для Віти.
 */
async function boot() {
  if (import.meta.env.DEV) {
    const mode = new URLSearchParams(location.search).get('dev')
    if (mode === 'lab') {
      const focus = new URLSearchParams(location.search).get('view')
      if (focus) {
        const { LabFocus } = await import('./dev/LabFocus')
        root.render(<LabFocus />)
        return
      }
      const { Lab } = await import('./dev/Lab')
      root.render(
        <StrictMode>
          <Lab />
        </StrictMode>,
      )
      return
    }
  }
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
