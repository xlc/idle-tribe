import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { loadState, saveState } from './persistence'
import { createSession } from './session'

const container = document.getElementById('root')
if (!container) throw new Error('Missing React root')
const session = createSession(
  loadState(),
  saveState,
  Date.now(),
  !document.hidden,
)
createRoot(container).render(
  <StrictMode>
    <App session={session} />
  </StrictMode>,
)
