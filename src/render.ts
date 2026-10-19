import { JOBS, RECRUIT_COST, RESEARCH_ITEM_KEYS } from './constants'
import { formatDuration, formatResource, formatResourceRate } from './format'
import type { Game } from './game'
import type { Action, ActionKey, JobId, Person, ResearchId } from './types'

type View = 'camp' | 'research'
export interface ActionView {
  researchId?: ResearchId
  button: HTMLButtonElement
  levelLabel: HTMLElement
  subtitle: HTMLElement
  progressWrap: HTMLElement
  progressBar: HTMLProgressElement
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
  } = game
  const fruitValue = element<HTMLElement>('#fruit-value')
  const woodRow = element<HTMLElement>('#wood-row')
  const woodValue = element<HTMLElement>('#wood-value')
  const stoneRow = element<HTMLElement>('#stone-row')
  const stoneValue = element<HTMLElement>('#stone-value')
  const feedback = element<HTMLElement>('#feedback')
  const tribeList = element<HTMLElement>('#tribe-list')
  const recruitButton = element<HTMLButtonElement>('#recruit-button')
  const populationCount = element<HTMLElement>('#population-count')
  const campSummary = element<HTMLElement>('#camp-summary')
  const recruitStatus = element<HTMLElement>('#recruit-status')
  const resourceRates = {
    fruit: element<HTMLElement>('#fruit-rate'),
    wood: element<HTMLElement>('#wood-rate'),
    stone: element<HTMLElement>('#stone-rate'),
  }
  const gatherButton = element<HTMLButtonElement>('#gather-button')
  const gatherLevel = element<HTMLElement>('#gather-level')
  const gatherSubtitle = element<HTMLElement>('#gather-subtitle')
  const gatherProgressWrap = element<HTMLElement>('#gather-progress-wrap')
  const gatherProgressBar = element<HTMLProgressElement>('#gather-progress-bar')
  const gatherProgressLabel = element<HTMLElement>('#gather-progress-label')
  const exploreButton = element<HTMLButtonElement>('#explore-button')
  const exploreLevel = element<HTMLElement>('#explore-level')
  const exploreSubtitle = element<HTMLElement>('#explore-subtitle')
  const exploreProgressWrap = element<HTMLElement>('#explore-progress-wrap')
  const exploreProgressBar = element<HTMLProgressElement>(
    '#explore-progress-bar',
  )
  const exploreProgressLabel = element<HTMLElement>('#explore-progress-label')
  const sticksButton = element<HTMLButtonElement>('#sticks-button')
  const sticksLevel = element<HTMLElement>('#sticks-level')
  const sticksSubtitle = element<HTMLElement>('#sticks-subtitle')
  const sticksProgressWrap = element<HTMLElement>('#sticks-progress-wrap')
  const sticksProgressBar = element<HTMLProgressElement>('#sticks-progress-bar')
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
  const exploreFurtherProgressBar = element<HTMLProgressElement>(
    '#explore-further-progress-bar',
  )
  const exploreFurtherProgressLabel = element<HTMLElement>(
    '#explore-further-progress-label',
  )
  const stoneButton = element<HTMLButtonElement>('#stone-button')
  const stoneLevel = element<HTMLElement>('#stone-level')
  const stoneSubtitle = element<HTMLElement>('#stone-subtitle')
  const stoneProgressWrap = element<HTMLElement>('#stone-progress-wrap')
  const stoneProgressBar = element<HTMLProgressElement>('#stone-progress-bar')
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
  function researchElements(id: string) {
    return {
      button: element<HTMLButtonElement>(`#${id}-button`),
      levelLabel: element<HTMLElement>(`#${id}-level`),
      subtitle: element<HTMLElement>(`#${id}-subtitle`),
      costs: element<HTMLElement>(`#${id}-costs`),
      progressWrap: element<HTMLElement>(`#${id}-progress-wrap`),
      progressBar: element<HTMLProgressElement>(`#${id}-progress-bar`),
      progressLabel: element<HTMLElement>(`#${id}-progress-label`),
      value: element<HTMLElement>(`#${id}-button [data-action-value]`),
      complete: element<HTMLElement>(`#${id}-complete`),
      completeLevel: element<HTMLElement>(`#${id}-complete-level`),
    }
  }
  const researchItemViews = {
    shelters: researchElements('shelters'),
    'stone-axes': researchElements('stone-axes'),
    quarrying: researchElements('quarrying'),
    teamwork: researchElements('teamwork'),
    'sharpened-stick': {
      button: element<HTMLButtonElement>('#basic-tools-button'),
      levelLabel: element<HTMLElement>('#research-level'),
      subtitle: element<HTMLElement>('#research-subtitle'),
      costs: element<HTMLElement>('#research-costs'),
      progressWrap: element<HTMLElement>('#research-progress-wrap'),
      progressBar: element<HTMLProgressElement>('#research-progress-bar'),
      progressLabel: element<HTMLElement>('#research-progress-label'),
      value: element<HTMLElement>('#basic-tools-button [data-action-value]'),
      complete: element<HTMLElement>('#basic-tools-complete'),
      completeLevel: element<HTMLElement>('#research-complete-level'),
    },
    'foraging-practice': {
      button: element<HTMLButtonElement>('#foraging-practice-button'),
      levelLabel: element<HTMLElement>('#foraging-practice-level'),
      subtitle: element<HTMLElement>('#foraging-practice-subtitle'),
      costs: element<HTMLElement>('#foraging-practice-costs'),
      progressWrap: element<HTMLElement>('#foraging-practice-progress-wrap'),
      progressBar: element<HTMLProgressElement>(
        '#foraging-practice-progress-bar',
      ),
      progressLabel: element<HTMLElement>('#foraging-practice-progress-label'),
      value: element<HTMLElement>(
        '#foraging-practice-button [data-action-value]',
      ),
      complete: element<HTMLElement>('#foraging-practice-complete'),
      completeLevel: element<HTMLElement>('#foraging-practice-complete-level'),
    },
    'stone-flakes': {
      button: element<HTMLButtonElement>('#stone-flakes-button'),
      levelLabel: element<HTMLElement>('#stone-flakes-level'),
      subtitle: element<HTMLElement>('#stone-flakes-subtitle'),
      costs: element<HTMLElement>('#stone-flakes-costs'),
      progressWrap: element<HTMLElement>('#stone-flakes-progress-wrap'),
      progressBar: element<HTMLProgressElement>('#stone-flakes-progress-bar'),
      progressLabel: element<HTMLElement>('#stone-flakes-progress-label'),
      value: element<HTMLElement>('#stone-flakes-button [data-action-value]'),
      complete: element<HTMLElement>('#stone-flakes-complete'),
      completeLevel: element<HTMLElement>('#stone-flakes-complete-level'),
    },
  }
  let currentView: View = 'camp'

  function researchActionView(researchId: ResearchId): ActionView {
    return {
      ...researchItemViews[researchId],
      researchId,
      idleSubtitle: () => getResearchSubtitle(researchId),
    }
  }
  const actionViews: Record<ActionKey, ActionView> = {
    researchShelters: researchActionView('shelters'),
    researchAxes: researchActionView('stone-axes'),
    researchQuarrying: researchActionView('quarrying'),
    researchTeamwork: researchActionView('teamwork'),
    gather: {
      button: gatherButton,
      levelLabel: gatherLevel,
      subtitle: gatherSubtitle,
      progressWrap: gatherProgressWrap,
      progressBar: gatherProgressBar,
      progressLabel: gatherProgressLabel,
      idleSubtitle: () =>
        `${formatDuration(getActionDuration(actions.gather))}`,
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
        `${formatDuration(getActionDuration(actions.sticks))}`,
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
      idleSubtitle: () => `${formatDuration(getActionDuration(actions.stone))}`,
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
    actionsTab.classList.toggle('tab-active', !showingResearch)
    researchTab.classList.toggle('tab-active', showingResearch)
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
    view.button.setAttribute(
      'aria-label',
      action.researchId
        ? `${action.name}. ${getResearchCostLabel(action.researchId)}. Takes ${duration}.`
        : labels[action.id as keyof typeof labels],
    )
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
    const completedEffect = itemView.complete.querySelector(
      '[data-research-effect]',
    )
    if (completedEffect)
      completedEffect.textContent = getResearchEffect(researchId, level)
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
        missing: '',
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
        chip.className = `inline-flex items-center gap-1 text-xs leading-normal font-medium whitespace-nowrap tabular-nums ${enough ? 'text-success' : 'text-error'}`
        const icon = document.createElement('span')
        icon.setAttribute('aria-hidden', 'true')
        icon.textContent = { wood: '🪵', stone: '🪨', fruit: '🍎' }[resource]
        const label = document.createElement('span')
        label.className = 'sr-only'
        label.textContent = `${resource}: `
        chip.append(
          icon,
          label,
          ` ${formatResource(state[resource])}/${formatResource(required)}`,
        )
        costLabels.push(
          `${resource}: ${formatResource(state[resource])} of ${formatResource(required)} required${enough ? ', enough' : ', missing'}`,
        )
        costs.push(chip)
      }
      // Retain the measured cost layout while reserved materials are hidden.
      if (!working) itemView.costs.replaceChildren(...costs)

      itemView.value.removeAttribute('aria-label')
      itemView.value.textContent = status
      itemView.button.setAttribute(
        'aria-label',
        `${definition.name}. ${status ? `${status}${availability === 'ready' ? ' available' : ''}. ` : ''}Level ${level} of ${definition.maxLevel}, upgrading to level ${level + 1}. ${working ? 'Resources reserved until complete.' : `${costLabels.join('. ')}.`} Takes ${formatDuration(getActionDuration(action))}.`,
      )
    }
  }

  function render() {
    const focusedAction = Object.values(actionViews).find(
      (view) => view.button === document.activeElement,
    )
    syncUnlocks()
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
        'Net rate from assigned jobs and manual gathering, minus food consumption. Action costs are paid once. Food is consumed each minute.'
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
  // Keep controls mounted while resources tick so keyboard focus and open
  // native menus survive background rendering.
  const peopleViews = new Map<
    Person,
    {
      row: HTMLElement
      name: HTMLElement
      hunger: HTMLElement
      select: HTMLSelectElement
      status: HTMLElement
    }
  >()
  function getPersonForJobControl(select: HTMLSelectElement) {
    return [...peopleViews].find(([, view]) => view.select === select)?.[0]
  }
  function renderHunger() {
    const jobsUnlocked = getResearchLevel('shelters') > 0
    populationCount.textContent = `${state.people.length} / ${game.getPopulationCapacity()}`
    populationCount.title = 'People / shelter capacity'
    populationCount.setAttribute(
      'aria-label',
      `${state.people.length} people, capacity ${game.getPopulationCapacity()}`,
    )
    const working = state.people.filter(
      (person) =>
        person.job !== 'idle' && getHungerEffects(person).outputMultiplier > 0,
    ).length
    campSummary.textContent = `${state.people.length} ${state.people.length === 1 ? 'person' : 'people'} · ${working} working`
    recruitButton.hidden = !jobsUnlocked
    recruitButton.setAttribute('aria-disabled', String(!game.canRecruit()))
    recruitStatus.textContent = !jobsUnlocked
      ? ''
      : state.people.length >= game.getPopulationCapacity()
        ? 'Shelters full.'
        : state.fruit < RECRUIT_COST
          ? `Need ${formatResource(RECRUIT_COST - state.fruit)} more fruit.`
          : ''
    for (const [person, view] of peopleViews) {
      if (state.people.includes(person)) continue
      const hadFocus = view.row.contains(document.activeElement)
      view.row.remove()
      peopleViews.delete(person)
      if (hadFocus) recruitButton.focus()
    }
    for (const person of state.people) {
      let view = peopleViews.get(person)
      if (!view) {
        const row = document.createElement('div')
        row.className =
          'list-row grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-[18px] py-4'
        const copy = document.createElement('div')
        copy.className = 'col-start-1 row-span-2 min-w-0'
        const name = document.createElement('span')
        name.className =
          'block text-[15px] leading-snug font-semibold [overflow-wrap:anywhere]'
        const hunger = document.createElement('span')
        hunger.className =
          'col-start-2 text-right text-base whitespace-nowrap tracking-[2px] text-error'
        hunger.setAttribute('role', 'img')
        const status = document.createElement('span')
        status.className = 'mt-1.5 block text-xs leading-normal text-muted'
        const select = document.createElement('select')
        select.className =
          'select select-sm col-start-2 row-start-2 min-h-11 w-[150px] max-w-full text-xs min-[421px]:min-h-[38px]'
        for (const job of [
          'idle',
          'forager',
          'woodcutter',
          'stoneworker',
        ] as const) {
          const option = document.createElement('option')
          option.value = job
          option.textContent = job === 'idle' ? 'Idle' : JOBS[job].name
          select.append(option)
        }
        copy.append(name, status)
        row.append(copy, hunger, select)
        tribeList.append(row)
        view = { row, name, hunger, select, status }
        peopleViews.set(person, view)
      }
      view.name.textContent = person.name
      view.select.setAttribute('aria-label', `Job for ${person.name}`)
      view.select.hidden = !jobsUnlocked
      for (const option of Array.from(view.select.options))
        option.disabled = !game.isJobUnlocked(option.value as JobId)
      view.select.value = person.job
      const effects = getHungerEffects(person)
      const health =
        effects.outputMultiplier === 1
          ? 'Fed'
          : effects.outputMultiplier === 0
            ? 'Starving'
            : 'Hungry'
      const filledHearts = Math.ceil(person.hunger)
      view.hunger.textContent =
        '♥'.repeat(filledHearts) +
        '♡'.repeat(Math.ceil(person.maxHunger) - filledHearts)
      const hungerLabel = `${health}. Hunger ${formatResource(person.hunger)}/${formatResource(person.maxHunger)}. Eats ${effects.portion} fruit per minute.`
      view.hunger.title = hungerLabel
      view.hunger.setAttribute('aria-label', hungerLabel)
      view.status.textContent =
        person.job === 'idle'
          ? 'Idle'
          : effects.outputMultiplier === 0
            ? 'Too hungry to work · gather fruit to recover at the next meal'
            : `+${formatResource(game.getWorkerGain(person))} ${JOBS[person.job].resource} / ${formatDuration(JOBS[person.job].durationMs)}${effects.outputMultiplier < 1 ? ' · hungry: reduced output' : ''}`
      view.status.hidden = !jobsUnlocked
    }
  }
  function resetActionView(view: ActionView) {
    view.button.disabled = false
    view.button.removeAttribute('aria-disabled')
    view.button.removeAttribute('aria-busy')
    setHidden(view.progressWrap, true)
    view.progressBar.value = 0
    view.progressLabel.textContent = ''
  }

  return {
    render,
    setView,
    resetActionView,
    actionViews,
    feedback,
    actionsTab,
    researchTab,
    recruitButton,
    tribeList,
    getPersonForJobControl,
  }
}
