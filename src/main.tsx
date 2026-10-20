import './styles.css'
import { Theme } from '@radix-ui/themes'
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
    <Theme
      className="game-theme"
      accentColor="grass"
      grayColor="sage"
      appearance="light"
      radius="small"
      hasBackground={false}
    >
      <App session={session} />
    </Theme>
  </StrictMode>,
)
