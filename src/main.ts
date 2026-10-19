import './styles.css'
import { ACTION_IMMEDIATE_THRESHOLD_MS } from './constants'
import { createGame } from './game'
import { loadState, saveState } from './persistence'
import type { ActionView } from './render'
import { createRenderer } from './render'
import type { Action, ActionKey } from './types'

const state = loadState()
const game = createGame(state, saveState)
const renderer = createRenderer(game)
const { render, feedback, actionViews, resetActionView } = renderer

function finishAction(action: Action) {
  advanceGameplay()
  const result = game.finishAction(action)
  if (result === null) return
  feedback.textContent = result
  render()
}

function startAction(action: Action, view: ActionView) {
  advanceGameplay()
  const getActive = action.researchId
    ? game.getActiveResearch
    : game.getActiveAction
  if (getActive()) return
  const durationMs = game.getActionDuration(action)
  if (!game.startAction(action)) {
    feedback.textContent =
      typeof action.unavailableMessage === 'function'
        ? action.unavailableMessage()
        : (action.unavailableMessage ?? '')
    return
  }

  if (durationMs < ACTION_IMMEDIATE_THRESHOLD_MS) {
    finishAction(action)
    return
  }

  const startedAt = performance.now()
  view.button.setAttribute('aria-disabled', 'true')
  view.button.setAttribute('aria-busy', 'true')
  view.button.setAttribute(
    'aria-label',
    `${action.name}. ${action.workingFeedback}`,
  )
  view.progressWrap.hidden = false
  view.progressBar.value = 0
  view.progressLabel.textContent = `${(Math.ceil(durationMs / 100) / 10).toFixed(1)}s left`
  feedback.textContent = action.workingFeedback
  render()

  const updateProgress = () => {
    if (getActive() !== action) return
    const fraction = Math.min(1, (performance.now() - startedAt) / durationMs)
    const percent = Math.round(fraction * 100)
    view.progressBar.value = percent
    const remaining = Math.ceil(((1 - fraction) * durationMs) / 100) / 10
    view.progressLabel.textContent = `${remaining.toFixed(1)}s left`
    if (fraction >= 1) {
      resetActionView(view)
      finishAction(action)
      return
    }
    requestAnimationFrame(updateProgress)
  }
  requestAnimationFrame(updateProgress)
}

renderer.actionsTab.addEventListener('click', () => renderer.setView('camp'))
renderer.researchTab.addEventListener('click', () =>
  renderer.setView('research'),
)
const tabs = [renderer.actionsTab, renderer.researchTab]
for (const tab of tabs) {
  tab.addEventListener('keydown', (event) => {
    const available = tabs.filter((candidate) => !candidate.disabled)
    const index = available.indexOf(tab)
    let next: HTMLButtonElement | undefined
    if (event.key === 'ArrowRight')
      next = available[(index + 1) % available.length]
    else if (event.key === 'ArrowLeft')
      next = available[(index - 1 + available.length) % available.length]
    else if (event.key === 'Home') next = available[0]
    else if (event.key === 'End') next = available.at(-1)
    if (!next) return
    event.preventDefault()
    next.click()
    next.focus()
  })
}
for (const key of Object.keys(game.actions) as ActionKey[]) {
  actionViews[key].button.addEventListener('click', () =>
    startAction(game.actions[key], actionViews[key]),
  )
}

renderer.recruitButton.addEventListener('click', () => {
  advanceGameplay()
  if (game.recruitPerson()) feedback.textContent = 'Person recruited.'
  render()
})
renderer.tribeList.addEventListener('focusin', advanceGameplay)
renderer.tribeList.addEventListener('change', (event) => {
  const select = event.target
  if (!(select instanceof HTMLSelectElement)) return
  const job = select.value
  advanceGameplay()
  const person = renderer.getPersonForJobControl(select)
  if (!person) return
  if (
    job !== 'idle' &&
    job !== 'forager' &&
    job !== 'woodcutter' &&
    job !== 'stoneworker'
  )
    return
  if (game.assignJob(person, job))
    feedback.textContent = `${person.name}: ${job === 'idle' ? 'resting' : `working as a ${job}`}.`
  render()
})

let gameClockAt = performance.now()
let gameClockVisible = !document.hidden
function advanceGameplay() {
  const now = performance.now()
  const elapsed = gameClockVisible ? Math.max(0, now - gameClockAt) : 0
  gameClockAt = now
  if (game.advanceTime(elapsed)) render()
}

document.addEventListener('visibilitychange', () => {
  advanceGameplay()
  gameClockVisible = !document.hidden
  if (gameClockVisible) render()
})
window.addEventListener('pagehide', () => {
  advanceGameplay()
  gameClockVisible = false
  game.saveProgress()
})
window.addEventListener('pageshow', () => {
  gameClockAt = performance.now()
  gameClockVisible = !document.hidden
})
setInterval(advanceGameplay, 1000)

Object.values(actionViews).forEach(resetActionView)
render()
