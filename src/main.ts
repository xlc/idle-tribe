import './styles.css'
import { ACTION_IMMEDIATE_THRESHOLD_MS } from './constants'
import { createGame } from './game'
import { loadState, saveState } from './persistence'
import { createRenderer } from './render'
import type { ActionView } from './render'
import type { Action, ActionKey } from './types'

const state = loadState()
const game = createGame(state, () => saveState(state))
let activeAction: Action | null = null
const renderer = createRenderer(game, () => activeAction)
const { render, feedback, actionViews, resetActionView } = renderer

function finishAction(action: Action) {
  feedback.textContent = game.finishAction(action)
  render()
}

function startAction(action: Action, view: ActionView) {
  if (activeAction) return
  if (action.canStart && !action.canStart()) {
    feedback.textContent = typeof action.unavailableMessage === 'function'
      ? action.unavailableMessage()
      : action.unavailableMessage ?? ''
    return
  }

  const durationMs = game.getActionDuration(action)
  if (durationMs < ACTION_IMMEDIATE_THRESHOLD_MS) {
    action.onStart?.()
    finishAction(action)
    return
  }

  const startedAt = performance.now()
  activeAction = action
  action.onStart?.()
  view.button.disabled = true
  view.button.setAttribute('aria-busy', 'true')
  view.button.classList.add('is-working')
  view.button.setAttribute('aria-label', view.workingLabel)
  view.subtitle.textContent = view.workingSubtitle
  view.progressWrap.hidden = false
  view.progressWrap.style.display = ''
  view.progressBar.style.width = '0%'
  view.progressLabel.textContent = '0%'
  feedback.textContent = action.workingFeedback
  render()

  const updateProgress = () => {
    if (activeAction !== action) return
    const fraction = Math.min(1, (performance.now() - startedAt) / durationMs)
    const percent = Math.round(fraction * 100)
    view.progressBar.style.width = `${percent}%`
    view.progressLabel.textContent = `${percent}%`
    if (fraction >= 1) {
      resetActionView(view)
      activeAction = null
      finishAction(action)
      return
    }
    requestAnimationFrame(updateProgress)
  }
  requestAnimationFrame(updateProgress)
}

renderer.actionsTab.addEventListener('click', () => renderer.setView('camp'))
renderer.researchTab.addEventListener('click', () => renderer.setView('research'))
for (const key of Object.keys(game.actions) as ActionKey[]) {
  actionViews[key].button.addEventListener('click', () => startAction(game.actions[key], actionViews[key]))
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
})
window.addEventListener('pagehide', () => {
  consumeFood()
  foodClockVisible = false
  saveState(state)
})
window.addEventListener('pageshow', () => {
  foodClockAt = performance.now()
  foodClockVisible = !document.hidden
})
setInterval(consumeFood, 1000)

Object.values(actionViews).forEach(resetActionView)
render()
