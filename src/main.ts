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
  const result = game.finishAction(action)
  if (result === null) return
  feedback.textContent = result
  render()
}

function startAction(action: Action, view: ActionView) {
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
  view.button.classList.add('is-working')
  view.button.setAttribute(
    'aria-label',
    `${action.name}. ${action.workingFeedback}`,
  )
  view.progressWrap.hidden = false
  view.progressBar.style.width = '0%'
  view.progressLabel.textContent = '0%'
  feedback.textContent = action.workingFeedback
  render()

  const updateProgress = () => {
    if (getActive() !== action) return
    const fraction = Math.min(1, (performance.now() - startedAt) / durationMs)
    const percent = Math.round(fraction * 100)
    view.progressBar.style.width = `${percent}%`
    view.progressLabel.textContent = `${percent}%`
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

let foodClockAt = performance.now()
let foodClockVisible = !document.hidden
function consumeFood() {
  const now = performance.now()
  const elapsed = foodClockVisible ? Math.max(0, now - foodClockAt) : 0
  foodClockAt = now
  if (game.advanceFood(elapsed)) render()
}

document.addEventListener('visibilitychange', () => {
  consumeFood()
  foodClockVisible = !document.hidden
  if (foodClockVisible) render()
})
window.addEventListener('pagehide', () => {
  consumeFood()
  foodClockVisible = false
  game.saveProgress()
})
window.addEventListener('pageshow', () => {
  foodClockAt = performance.now()
  foodClockVisible = !document.hidden
})
setInterval(consumeFood, 1000)

Object.values(actionViews).forEach(resetActionView)
render()
