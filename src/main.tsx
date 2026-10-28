import './styles.css'
import * as Toast from '@radix-ui/react-toast'
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
      <Toast.Provider duration={20_000} label="Game notification">
        <App session={session} />
        <Toast.Viewport className="event-toast-viewport" />
      </Toast.Provider>
    </Theme>
  </StrictMode>,
)
