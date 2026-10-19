import './styles.css'
import { createActivityTimer, createClock } from './clock'
import { RESOURCES } from './constants'
import { formatResource } from './format'
import { createGame } from './game'
import { loadState, saveState } from './persistence'
import { createRenderer, element } from './render'
import type { Action, JobId } from './types'

let clock: ReturnType<typeof createClock>
const state = loadState()
const game = createGame(state, (snapshot) =>
  saveState({ ...snapshot, savedAt: clock?.settledAt() ?? Date.now() }),
)
const offline = game.applyOffline(Date.now())
const renderer = createRenderer(game, () => clock.tick(Date.now()))
const { render, feedback, actionViews } = renderer
clock = createClock(
  (elapsed) => game.advanceTime(elapsed),
  Date.now(),
  !document.hidden,
)

function showAway(elapsed: number, gains: Record<string, number>) {
  if (elapsed < 60000 || !state.researchLevels.shelters) return
  const minutes = Math.floor(elapsed / 60000)
  const duration =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes}m`
  element('away-title').textContent = `While you were away · ${duration}`
  element('away-trigger').textContent = `Away · ${duration}`
  element('away-gains').textContent =
    RESOURCES.filter((id) => gains[id] > 0)
      .map((id) => `+${formatResource(gains[id])} ${id}`)
      .join(' · ') || 'No resources gained.'
  element('away-trigger').hidden = false
}
showAway(offline.elapsed, offline.gains)

const activityTimers = new Set<ReturnType<typeof createActivityTimer>>()

function startAction(action: Action) {
  clock.tick(Date.now())
  if (!game.startAction(action)) return
  const item = Object.values(actionViews).find(
    (candidate) => candidate.button.id === `${action.id}-button`,
  )
  if (!item) return
  const duration = game.getActionDuration(action)
  const timer = createActivityTimer(
    duration,
    performance.now(),
    !document.hidden,
  )
  activityTimers.add(timer)
  const progress = () => {
    const active = action.researchId
      ? game.getActiveResearch()
      : game.getActiveAction()
    if (active !== action) return
    const elapsed = timer.sample(performance.now())
    const remaining = Math.max(0, duration - elapsed)
    item.progressBar.value = Math.min(100, (elapsed / duration) * 100)
    item.progressLabel.textContent = `${(Math.ceil(remaining / 100) / 10).toFixed(1)}s`
    if (remaining === 0) {
      clock.tick(Date.now())
      activityTimers.delete(timer)
      item.progressWrap.hidden = true
      const result = game.finishAction(action)
      if (
        action.researchId ||
        action.id === 'explore' ||
        action.id === 'explore-further'
      )
        feedback.textContent = action.researchId
          ? `${action.name} · level ${game.getResearchLevel(action.researchId)}`
          : result
      render()
      return
    }
    requestAnimationFrame(progress)
  }
  item.progressWrap.hidden = false
  render()
  requestAnimationFrame(progress)
}
let pendingChoice: Action | null = null
const dialog = element<HTMLDialogElement>('specialization-dialog')
for (const [key, item] of Object.entries(actionViews)) {
  const action = game.actions[key as keyof typeof game.actions]
  item.button.onclick = () => {
    if (
      action.researchId === 'forestry' ||
      action.researchId === 'stonecraft'
    ) {
      clock.tick(Date.now())
      if (state.specialization || !action.canStart?.()) return
      pendingChoice = action
      element('specialization-title').textContent = action.name
      element('specialization-effect').textContent =
        action.researchId === 'forestry'
          ? 'Wood and planks +60%. Unlocks Precision joinery: processors use 2 raw materials.'
          : 'Stone and blocks +60%. Unlocks Architecture: more housing capacity and +50% block output.'
      dialog.showModal()
    } else startAction(action)
  }
}
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'confirm' && pendingChoice)
    startAction(pendingChoice)
  pendingChoice = null
})
renderer.actionsTab.onclick = () => renderer.setView('camp')
renderer.researchTab.onclick = () => renderer.setView('research')
const tabs = [renderer.actionsTab, renderer.researchTab]
for (const tab of tabs)
  tab.onkeydown = (event) => {
    const available = tabs.filter((candidate) => !candidate.disabled)
    const index = available.indexOf(tab)
    const next =
      event.key === 'ArrowRight'
        ? available[(index + 1) % available.length]
        : event.key === 'ArrowLeft'
          ? available[(index - 1 + available.length) % available.length]
          : event.key === 'Home'
            ? available[0]
            : event.key === 'End'
              ? available.at(-1)
              : null
    if (!next) return
    event.preventDefault()
    next.click()
    next.focus()
  }
renderer.recruitButton.onclick = () => {
  clock.tick(Date.now())
  if (game.recruitPerson())
    feedback.textContent = 'A new person joined the tribe.'
  render()
}
renderer.feastButton.onclick = () => {
  clock.tick(Date.now())
  if (game.feast()) feedback.textContent = 'The tribe shared a feast.'
  render()
}
renderer.tribeList.onchange = (event) => {
  if (!(event.target instanceof HTMLSelectElement)) return
  clock.tick(Date.now())
  const person = renderer.getPersonForJobControl(event.target)
  if (person) game.assignJob(person, event.target.value as JobId)
  render()
}
function setVisible(visible: boolean) {
  for (const timer of activityTimers)
    timer.setVisible(visible, performance.now())
  const before = Object.fromEntries(RESOURCES.map((id) => [id, state[id]]))
  const elapsed = clock.setVisible(visible, Date.now())
  if (elapsed)
    showAway(
      elapsed,
      Object.fromEntries(
        RESOURCES.map((id) => [id, Math.max(0, state[id] - before[id])]),
      ),
    )
  game.saveProgress()
  render()
}
document.addEventListener('visibilitychange', () =>
  setVisible(!document.hidden),
)
window.addEventListener('pagehide', () => setVisible(false))
window.addEventListener('pageshow', () => setVisible(!document.hidden))
setInterval(() => {
  if (document.hidden) return
  clock.tick(Date.now())
  render()
}, 500)
render()
