import { MAX_HUNGER, RESEARCH_ITEM_KEYS } from './constants'
import { formatDuration, formatResource, formatResourceRate } from './format'
import type { Game } from './game'
import type { Action, ActionKey, ResearchId } from './types'

type View = 'camp' | 'research'
export interface ActionView {
  researchId?: ResearchId
  button: HTMLButtonElement
  levelLabel: HTMLElement
  subtitle: HTMLElement
  progressWrap: HTMLElement
  progressBar: HTMLElement
  progressLabel: HTMLElement
  idleSubtitle: () => string
}

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector)
  if (!result) throw new Error(`Missing application element: ${selector}`)
  return result
}

export function createRenderer(game: Game) {
  const {
    state,
    actions,
    syncUnlocks,
    getSkill,
    getResearchLevel,
    getResearchDefinition,
    getResearchNextLevel,
    getResearchEffect,
    canAffordResearch,
    getUnreadResearch,
    markResearchSeen,
    getResearchSubtitle,
    getResearchCostLabel,
    getResearchRowLabel,
    getRequiredXp,
    getActionDuration,
    getNextResourceGain,
    getHungerEffects,
    getResourceRates,
    getActiveAction,
    getActiveResearch,
    getNextGoal,
  } = game
  const fruitValue = element<HTMLElement>('#fruit-value')
  const woodRow = element<HTMLElement>('#wood-row')
  const woodValue = element<HTMLElement>('#wood-value')
  const stoneRow = element<HTMLElement>('#stone-row')
  const stoneValue = element<HTMLElement>('#stone-value')
  const feedback = element<HTMLElement>('#feedback')
  const nextStep = element<HTMLElement>('#next-step')
  const tribeList = element<HTMLElement>('#tribe-list')
  const resourceRates = {
    fruit: element<HTMLElement>('#fruit-rate'),
    wood: element<HTMLElement>('#wood-rate'),
    stone: element<HTMLElement>('#stone-rate'),
  }
  const gatherButton = element<HTMLButtonElement>('#gather-button')
  const gatherLevel = element<HTMLElement>('#gather-level')
  const gatherSubtitle = element<HTMLElement>('#gather-subtitle')
  const gatherProgressWrap = element<HTMLElement>('#gather-progress-wrap')
  const gatherProgressBar = element<HTMLElement>('#gather-progress-bar')
  const gatherProgressLabel = element<HTMLElement>('#gather-progress-label')
  const exploreButton = element<HTMLButtonElement>('#explore-button')
  const exploreLevel = element<HTMLElement>('#explore-level')
  const exploreSubtitle = element<HTMLElement>('#explore-subtitle')
  const exploreProgressWrap = element<HTMLElement>('#explore-progress-wrap')
  const exploreProgressBar = element<HTMLElement>('#explore-progress-bar')
  const exploreProgressLabel = element<HTMLElement>('#explore-progress-label')
  const sticksButton = element<HTMLButtonElement>('#sticks-button')
  const sticksLevel = element<HTMLElement>('#sticks-level')
  const sticksSubtitle = element<HTMLElement>('#sticks-subtitle')
  const sticksProgressWrap = element<HTMLElement>('#sticks-progress-wrap')
  const sticksProgressBar = element<HTMLElement>('#sticks-progress-bar')
  const sticksProgressLabel = element<HTMLElement>('#sticks-progress-label')
  const exploreFurtherButton = element<HTMLButtonElement>(
    '#explore-further-button',
  )
  const exploreFurtherLevel = element<HTMLElement>('#explore-further-level')
  const exploreFurtherSubtitle = element<HTMLElement>(
    '#explore-further-subtitle',
  )
  const exploreFurtherProgressWrap = element<HTMLElement>(
    '#explore-further-progress-wrap',
  )
  const exploreFurtherProgressBar = element<HTMLElement>(
    '#explore-further-progress-bar',
  )
  const exploreFurtherProgressLabel = element<HTMLElement>(
    '#explore-further-progress-label',
  )
  const stoneButton = element<HTMLButtonElement>('#stone-button')
  const stoneLevel = element<HTMLElement>('#stone-level')
  const stoneSubtitle = element<HTMLElement>('#stone-subtitle')
  const stoneProgressWrap = element<HTMLElement>('#stone-progress-wrap')
  const stoneProgressBar = element<HTMLElement>('#stone-progress-bar')
  const stoneProgressLabel = element<HTMLElement>('#stone-progress-label')
  const gatherValue = element<HTMLElement>('#gather-value')
  const sticksValue = element<HTMLElement>('#sticks-value')
  const stoneActionValue = element<HTMLElement>('#stone-action-value')
  const actionsTab = element<HTMLButtonElement>('#actions-tab')
  const researchTab = element<HTMLButtonElement>('#research-tab')
  const researchUnread = element<HTMLElement>('#research-unread')
  const campView = element<HTMLElement>('#camp-view')
  const researchView = element<HTMLElement>('#research-view')
  const researchEmpty = element<HTMLElement>('#research-empty')
  const researchItemViews = {
    'sharpened-stick': {
      button: element<HTMLButtonElement>('#basic-tools-button'),
      levelLabel: element<HTMLElement>('#research-level'),
      subtitle: element<HTMLElement>('#research-subtitle'),
      costs: element<HTMLElement>('#research-costs'),
      progressWrap: element<HTMLElement>('#research-progress-wrap'),
      progressBar: element<HTMLElement>('#research-progress-bar'),
      progressLabel: element<HTMLElement>('#research-progress-label'),
      value: element<HTMLElement>('#basic-tools-button .row-value'),
      complete: element<HTMLElement>('#basic-tools-complete'),
      completeLevel: element<HTMLElement>('#research-complete-level'),
    },
    'foraging-practice': {
      button: element<HTMLButtonElement>('#foraging-practice-button'),
      levelLabel: element<HTMLElement>('#foraging-practice-level'),
      subtitle: element<HTMLElement>('#foraging-practice-subtitle'),
      costs: element<HTMLElement>('#foraging-practice-costs'),
      progressWrap: element<HTMLElement>('#foraging-practice-progress-wrap'),
      progressBar: element<HTMLElement>('#foraging-practice-progress-bar'),
      progressLabel: element<HTMLElement>('#foraging-practice-progress-label'),
      value: element<HTMLElement>('#foraging-practice-button .row-value'),
      complete: element<HTMLElement>('#foraging-practice-complete'),
      completeLevel: element<HTMLElement>('#foraging-practice-complete-level'),
    },
    'stone-flakes': {
      button: element<HTMLButtonElement>('#stone-flakes-button'),
      levelLabel: element<HTMLElement>('#stone-flakes-level'),
      subtitle: element<HTMLElement>('#stone-flakes-subtitle'),
      costs: element<HTMLElement>('#stone-flakes-costs'),
      progressWrap: element<HTMLElement>('#stone-flakes-progress-wrap'),
      progressBar: element<HTMLElement>('#stone-flakes-progress-bar'),
      progressLabel: element<HTMLElement>('#stone-flakes-progress-label'),
      value: element<HTMLElement>('#stone-flakes-button .row-value'),
      complete: element<HTMLElement>('#stone-flakes-complete'),
      completeLevel: element<HTMLElement>('#stone-flakes-complete-level'),
    },
  }
  let currentView: View = 'camp'

  const actionViews: Record<ActionKey, ActionView> = {
    gather: {
      button: gatherButton,
      levelLabel: gatherLevel,
      subtitle: gatherSubtitle,
      progressWrap: gatherProgressWrap,
      progressBar: gatherProgressBar,
      progressLabel: gatherProgressLabel,
      idleSubtitle: () =>
        `By hand · ${formatDuration(getActionDuration(actions.gather))}`,
    },
    explore: {
      button: exploreButton,
      levelLabel: exploreLevel,
      subtitle: exploreSubtitle,
      progressWrap: exploreProgressWrap,
      progressBar: exploreProgressBar,
      progressLabel: exploreProgressLabel,
      idleSubtitle: () =>
        `Search nearby · ${formatDuration(getActionDuration(actions.explore))}`,
    },
    sticks: {
      button: sticksButton,
      levelLabel: sticksLevel,
      subtitle: sticksSubtitle,
      progressWrap: sticksProgressWrap,
      progressBar: sticksProgressBar,
      progressLabel: sticksProgressLabel,
      idleSubtitle: () =>
        `By hand · ${formatDuration(getActionDuration(actions.sticks))}`,
    },
    exploreFurther: {
      button: exploreFurtherButton,
      levelLabel: exploreFurtherLevel,
      subtitle: exploreFurtherSubtitle,
      progressWrap: exploreFurtherProgressWrap,
      progressBar: exploreFurtherProgressBar,
      progressLabel: exploreFurtherProgressLabel,
      idleSubtitle: () =>
        `Search beyond the trees · ${formatDuration(getActionDuration(actions.exploreFurther))}`,
    },
    stone: {
      button: stoneButton,
      levelLabel: stoneLevel,
      subtitle: stoneSubtitle,
      progressWrap: stoneProgressWrap,
      progressBar: stoneProgressBar,
      progressLabel: stoneProgressLabel,
      idleSubtitle: () =>
        `By hand · ${formatDuration(getActionDuration(actions.stone))}`,
    },
    research: {
      researchId: 'sharpened-stick',
      button: researchItemViews['sharpened-stick'].button,
      levelLabel: researchItemViews['sharpened-stick'].levelLabel,
      subtitle: researchItemViews['sharpened-stick'].subtitle,
      progressWrap: researchItemViews['sharpened-stick'].progressWrap,
      progressBar: researchItemViews['sharpened-stick'].progressBar,
      progressLabel: researchItemViews['sharpened-stick'].progressLabel,
      idleSubtitle: () => getResearchSubtitle('sharpened-stick'),
    },
    researchForaging: {
      researchId: 'foraging-practice',
      button: researchItemViews['foraging-practice'].button,
      levelLabel: researchItemViews['foraging-practice'].levelLabel,
      subtitle: researchItemViews['foraging-practice'].subtitle,
      progressWrap: researchItemViews['foraging-practice'].progressWrap,
      progressBar: researchItemViews['foraging-practice'].progressBar,
      progressLabel: researchItemViews['foraging-practice'].progressLabel,
      idleSubtitle: () => getResearchSubtitle('foraging-practice'),
    },
    researchStone: {
      researchId: 'stone-flakes',
      button: researchItemViews['stone-flakes'].button,
      levelLabel: researchItemViews['stone-flakes'].levelLabel,
      subtitle: researchItemViews['stone-flakes'].subtitle,
      progressWrap: researchItemViews['stone-flakes'].progressWrap,
      progressBar: researchItemViews['stone-flakes'].progressBar,
      progressLabel: researchItemViews['stone-flakes'].progressLabel,
      idleSubtitle: () => getResearchSubtitle('stone-flakes'),
    },
  }
  function setHidden(element: HTMLElement, hidden: boolean) {
    element.hidden = hidden
  }

  function setView(view: View) {
    const nextView =
      view === 'research' && state.researchUnlocked ? 'research' : 'camp'
    currentView = nextView
    const showingResearch = nextView === 'research'
    setHidden(campView, showingResearch)
    setHidden(researchView, !showingResearch)
    actionsTab.classList.toggle('is-active', !showingResearch)
    researchTab.classList.toggle('is-active', showingResearch)
    actionsTab.setAttribute('aria-selected', String(!showingResearch))
    researchTab.setAttribute('aria-selected', String(showingResearch))
    actionsTab.tabIndex = showingResearch ? -1 : 0
    researchTab.tabIndex = showingResearch ? 0 : -1
    if (showingResearch && !document.hidden) markResearchSeen()
    const hasUnreadResearch = getUnreadResearch().length > 0
    setHidden(researchUnread, !hasUnreadResearch)
    researchTab.setAttribute(
      'aria-label',
      hasUnreadResearch ? 'Research, new research available' : 'Research',
    )
  }

  function syncActionView(action: Action, view: ActionView) {
    const active = view.researchId ? getActiveResearch() : getActiveAction()
    view.button.disabled = Boolean(active && active !== action)
    view.button.setAttribute('aria-disabled', String(Boolean(active)))
    if (view.researchId) {
      view.levelLabel.textContent = getResearchRowLabel(view.researchId)
    } else {
      const skill = getSkill(action.id)
      view.levelLabel.textContent = `Lv ${skill.level} · ${skill.xp}/${getRequiredXp(action.id)} XP`
    }
    if (active === action) return
    view.subtitle.textContent = view.researchId
      ? getResearchSubtitle(view.researchId)
      : view.idleSubtitle()
    const duration = formatDuration(getActionDuration(action))
    const labels = {
      gather: `Gather fruit. Collect ${formatResource(getNextResourceGain('gather'))} fruit by hand. Takes ${duration}.`,
      explore: `Explore nearby. Spend 10 fruit. Takes ${duration}.`,
      sticks: `Gather sticks. Collect ${formatResource(getNextResourceGain('sticks'))} wood by hand. Takes ${duration}.`,
      'explore-further': `Explore farther. Spend 10 fruit. Takes ${duration}.`,
      stone: `Gather stone. Collect ${formatResource(getNextResourceGain('stone'))} stone by hand. Takes ${duration}.`,
      research: `Sharpened stick. Research ${getResearchCostLabel('sharpened-stick')} next. Takes ${duration}.`,
      'research-foraging': `Woven baskets. Research ${getResearchCostLabel('foraging-practice')} next. Takes ${duration}.`,
      'research-stone-flakes': `Flint knapping. Research ${getResearchCostLabel('stone-flakes')} next. Takes ${duration}.`,
    }
    view.button.setAttribute('aria-label', labels[action.id])
  }

  function renderResearchItem(researchId: ResearchId) {
    const definition = getResearchDefinition(researchId)
    const itemView = researchItemViews[researchId]
    const level = getResearchLevel(researchId)
    const prerequisiteMet = Boolean(definition?.prerequisite())
    const maxed = level >= definition.maxLevel
    const visible = prerequisiteMet
    setHidden(itemView.button, !visible || maxed)
    setHidden(itemView.complete, !visible || !maxed)
    itemView.levelLabel.textContent = getResearchRowLabel(researchId)
    itemView.completeLevel.textContent = `Lv ${level}/${definition.maxLevel}`
    const next = getResearchNextLevel(researchId)
    if (next) {
      const action = Object.values(actions).find(
        (candidate) => candidate.id === definition.actionId,
      )
      if (!action) return
      const activeAction = getActiveResearch()
      const working = activeAction === action
      const affordable = canAffordResearch(researchId)
      const availability = working
        ? 'working'
        : activeAction
          ? 'busy'
          : affordable
            ? 'ready'
            : 'missing'
      const status = {
        working: 'Upgrading',
        busy: 'Busy',
        ready: 'Upgrade',
        missing: 'Missing resources',
      }[availability]
      itemView.button.dataset.availability = availability
      itemView.button.disabled = Boolean(activeAction && !working)
      itemView.button.setAttribute(
        'aria-disabled',
        String(Boolean(activeAction) || !affordable),
      )
      itemView.subtitle.textContent = `${getResearchEffect(researchId, level)} → ${getResearchEffect(researchId, level + 1)} · ${formatDuration(getActionDuration(action))}`

      const costLabels: string[] = []
      const costs = []
      for (const resource of ['wood', 'stone', 'fruit'] as const) {
        const required = next[resource]
        if (!required) continue
        const enough = state[resource] >= required
        const chip = document.createElement('span')
        chip.className = `research-cost ${enough ? 'is-enough' : 'is-missing'}`
        chip.textContent = `${enough ? '✓' : '−'} ${formatResource(state[resource])}/${formatResource(required)} ${resource}`
        costLabels.push(
          `${resource}: ${formatResource(state[resource])} of ${formatResource(required)} required${enough ? ', enough' : ', missing'}`,
        )
        costs.push(chip)
      }
      if (working) {
        const paid = document.createElement('span')
        paid.className = 'research-cost is-paid'
        paid.textContent = '✓ Resources reserved'
        itemView.costs.replaceChildren(paid)
      } else {
        itemView.costs.replaceChildren(...costs)
      }

      const statusLabel = document.createElement('span')
      statusLabel.className = 'research-status'
      statusLabel.textContent = status
      const nextLevel = document.createElement('span')
      nextLevel.className = 'research-next-level'
      nextLevel.textContent = `Lv ${level + 1}`
      itemView.value.removeAttribute('aria-label')
      itemView.value.replaceChildren(statusLabel, nextLevel)
      itemView.button.setAttribute(
        'aria-label',
        `${definition.name}. ${status}${availability === 'ready' ? ' available' : ''} to level ${level + 1}. ${working ? 'Resources reserved until complete.' : `${costLabels.join('. ')}.`} Takes ${formatDuration(getActionDuration(action))}.`,
      )
    }
  }

  function render() {
    const focusedAction = Object.values(actionViews).find(
      (view) => view.button === document.activeElement,
    )
    syncUnlocks()
    nextStep.textContent = getNextGoal()
    fruitValue.textContent = formatResource(state.fruit)
    woodValue.textContent = formatResource(state.wood)
    stoneValue.textContent = formatResource(state.stone)
    const rates = getResourceRates(getActiveAction())
    for (const resource of ['fruit', 'wood', 'stone'] as const) {
      const rate = rates[resource]
      const label = resourceRates[resource]
      label.hidden = rate === 0
      label.textContent = formatResourceRate(rate)
      label.dataset.direction =
        rate > 0 ? 'gain' : rate < 0 ? 'loss' : 'neutral'
      label.title =
        'Net rate while gathering, minus ongoing food consumption. Action costs are paid once. Food is consumed each minute.'
      label.setAttribute(
        'aria-label',
        `${resource}: ${rate === 0 ? 'no net change' : `${rate > 0 ? 'gain' : 'loss'} of ${Math.abs(rate).toLocaleString('en-US', { maximumFractionDigits: 4 })} per second`}`,
      )
    }
    const totalFruitGain = getNextResourceGain('gather')
    const woodGain = getNextResourceGain('sticks')
    const stoneGain = getNextResourceGain('stone')
    gatherValue.textContent = `+${formatResource(totalFruitGain)}`
    gatherValue.setAttribute(
      'aria-label',
      `Gain ${formatResource(totalFruitGain)} fruit`,
    )
    sticksValue.textContent = `+${formatResource(woodGain)}`
    sticksValue.setAttribute(
      'aria-label',
      `Gain ${formatResource(woodGain)} wood`,
    )
    stoneActionValue.textContent = `+${formatResource(stoneGain)}`
    stoneActionValue.setAttribute(
      'aria-label',
      `Gain ${formatResource(stoneGain)} stone`,
    )
    for (const key of Object.keys(actions) as ActionKey[]) {
      syncActionView(actions[key], actionViews[key])
    }
    setHidden(woodRow, !state.explored)
    const exploring = getActiveAction()?.id === 'explore'

    setHidden(
      exploreButton,
      state.explored || (!exploring && !state.exploreUnlocked),
    )
    setHidden(sticksButton, !state.explored)
    const exploringFurther = getActiveAction()?.id === 'explore-further'
    setHidden(
      exploreFurtherButton,
      state.stoneFound || (!state.basicTools && !exploringFurther),
    )
    setHidden(stoneRow, !state.stoneFound)
    setHidden(stoneButton, !state.stoneFound)

    const researching = Boolean(getActiveResearch())
    RESEARCH_ITEM_KEYS.forEach(renderResearchItem)
    const anyResearchVisible = RESEARCH_ITEM_KEYS.some((researchId) =>
      getResearchDefinition(researchId).prerequisite(),
    )
    setHidden(researchEmpty, anyResearchVisible || researching)
    researchTab.disabled = !state.researchUnlocked
    researchTab.setAttribute('aria-disabled', String(researchTab.disabled))
    if (!state.researchUnlocked) currentView = 'camp'
    setView(currentView)

    renderHunger()
    if (focusedAction?.button.hidden) {
      const panel = currentView === 'camp' ? campView : researchView
      const nextAction = panel.querySelector<HTMLButtonElement>(
        'button:not([hidden]):not(:disabled)',
      )
      const focusTarget =
        nextAction ?? (currentView === 'camp' ? actionsTab : researchTab)
      focusTarget.focus()
    }
  }
  function renderHunger() {
    tribeList.replaceChildren(
      ...state.people.map((person) => {
        const row = document.createElement('div')
        row.className = 'row'
        const icon = document.createElement('span')
        icon.className = 'person-dot'
        icon.textContent = '●'
        icon.setAttribute('aria-hidden', 'true')
        const name = document.createElement('span')
        name.className = 'row-copy row-title'
        name.textContent = person.name
        const hunger = document.createElement('span')
        hunger.className = 'hunger'
        const value = document.createElement('span')
        value.className = 'sr-only'
        value.textContent = `Hunger ${formatResource(person.hunger)}/${formatResource(person.maxHunger)}`
        const hearts = document.createElement('span')
        hearts.className = 'hunger-hearts'
        hearts.setAttribute('aria-hidden', 'true')
        const filledHearts = Math.ceil(
          (person.hunger / person.maxHunger) * MAX_HUNGER,
        )
        const emptyHearts = MAX_HUNGER - filledHearts
        hearts.textContent = '♥'.repeat(filledHearts) + '♡'.repeat(emptyHearts)
        hunger.append(value, hearts)
        const effects = getHungerEffects(person)
        hunger.title = `${person.hunger}/${person.maxHunger} · Eats ${effects.portion} fruit per minute`
        row.append(icon, name, hunger)
        return row
      }),
    )
  }
  function resetActionView(view: ActionView) {
    view.button.disabled = false
    view.button.removeAttribute('aria-disabled')
    view.button.removeAttribute('aria-busy')
    view.button.classList.remove('is-working')
    setHidden(view.progressWrap, true)
    view.progressBar.style.width = '0%'
    view.progressLabel.textContent = '0%'
  }

  return {
    render,
    setView,
    resetActionView,
    actionViews,
    feedback,
    actionsTab,
    researchTab,
  }
}
