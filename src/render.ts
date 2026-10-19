import { RESEARCH_ITEM_KEYS } from './constants'
import { formatDuration, formatResearchCost, formatResource } from './format'
import type { Game } from './game'
import type { Action, ActionId, ActionKey, ResearchId } from './types'

type View = 'camp' | 'research'
export interface ActionView {
  id: ActionId
  researchId?: ResearchId
  button: HTMLButtonElement
  levelLabel: HTMLElement
  subtitle: HTMLElement
  progressWrap: HTMLElement
  progressBar: HTMLElement
  progressLabel: HTMLElement
  idleSubtitle: () => string
  workingSubtitle: string
  idleLabel: string
  workingLabel: string
}

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector)
  if (!result) throw new Error(`Missing application element: ${selector}`)
  return result
}

export function createRenderer(
  game: Game,
  getActiveAction: () => Action | null,
) {
  const {
    state,
    actions,
    syncUnlocks,
    getSkill,
    getResearchLevel,
    getResearchDefinition,
    getResearchNextLevel,
    getResearchSubtitle,
    getResearchCostLabel,
    getFruitResearchBonus,
    getStoneResearchBonus,
    getResearchRowLabel,
    getRequiredXp,
    getActionDuration,
    getResourceMilestoneBonus,
    getHungerEffects,
  } = game
  const fruitValue = element<HTMLElement>('#fruit-value')
  const woodRow = element<HTMLElement>('#wood-row')
  const woodValue = element<HTMLElement>('#wood-value')
  const stoneRow = element<HTMLElement>('#stone-row')
  const stoneValue = element<HTMLElement>('#stone-value')
  const feedback = element<HTMLElement>('#feedback')
  const tribeList = element<HTMLElement>('#tribe-list')
  const rateLabel = element<HTMLElement>('#rate-label')
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
  const campView = element<HTMLElement>('#camp-view')
  const researchView = element<HTMLElement>('#research-view')
  const researchEmpty = element<HTMLElement>('#research-empty')
  const researchItemViews = {
    'sharpened-stick': {
      button: element<HTMLButtonElement>('#basic-tools-button'),
      levelLabel: element<HTMLElement>('#research-level'),
      subtitle: element<HTMLElement>('#research-subtitle'),
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
      id: 'gather',
      button: gatherButton,
      levelLabel: gatherLevel,
      subtitle: gatherSubtitle,
      progressWrap: gatherProgressWrap,
      progressBar: gatherProgressBar,
      progressLabel: gatherProgressLabel,
      idleSubtitle: () =>
        `By hand · ${formatDuration(getActionDuration(actions.gather))}`,
      workingSubtitle: 'Gathering fruit...',
      idleLabel:
        'Gather fruit. Collect one fruit by hand. Takes 1 second. Gain one fruit.',
      workingLabel: 'Gather fruit. Gathering fruit in progress.',
    },
    explore: {
      id: 'explore',
      button: exploreButton,
      levelLabel: exploreLevel,
      subtitle: exploreSubtitle,
      progressWrap: exploreProgressWrap,
      progressBar: exploreProgressBar,
      progressLabel: exploreProgressLabel,
      idleSubtitle: () =>
        `Search nearby · ${formatDuration(getActionDuration(actions.explore))}`,
      workingSubtitle: 'Exploring nearby...',
      idleLabel: 'Explore nearby. Spend 10 fruit. Takes 2 seconds.',
      workingLabel: 'Explore nearby. Exploration in progress.',
    },
    sticks: {
      id: 'sticks',
      button: sticksButton,
      levelLabel: sticksLevel,
      subtitle: sticksSubtitle,
      progressWrap: sticksProgressWrap,
      progressBar: sticksProgressBar,
      progressLabel: sticksProgressLabel,
      idleSubtitle: () =>
        `By hand · ${formatDuration(getActionDuration(actions.sticks))}`,
      workingSubtitle: 'Gathering sticks...',
      idleLabel:
        'Gather sticks. Collect one bundle by hand. Takes 2 seconds. Gain one wood.',
      workingLabel: 'Gather sticks. Gathering in progress.',
    },
    exploreFurther: {
      id: 'explore-further',
      button: exploreFurtherButton,
      levelLabel: exploreFurtherLevel,
      subtitle: exploreFurtherSubtitle,
      progressWrap: exploreFurtherProgressWrap,
      progressBar: exploreFurtherProgressBar,
      progressLabel: exploreFurtherProgressLabel,
      idleSubtitle: () =>
        `Search beyond the trees · ${formatDuration(getActionDuration(actions.exploreFurther))}`,
      workingSubtitle: 'Exploring farther...',
      idleLabel: 'Explore farther. Spend 10 fruit. Takes 3 seconds.',
      workingLabel: 'Explore farther. Exploration in progress.',
    },
    stone: {
      id: 'stone',
      button: stoneButton,
      levelLabel: stoneLevel,
      subtitle: stoneSubtitle,
      progressWrap: stoneProgressWrap,
      progressBar: stoneProgressBar,
      progressLabel: stoneProgressLabel,
      idleSubtitle: () =>
        `By hand · ${formatDuration(getActionDuration(actions.stone))}`,
      workingSubtitle: 'Gathering stone...',
      idleLabel:
        'Gather stone. Collect one stone by hand. Takes 3 seconds. Gain one stone.',
      workingLabel: 'Gather stone. Gathering in progress.',
    },
    research: {
      id: 'research',
      researchId: 'sharpened-stick',
      button: researchItemViews['sharpened-stick'].button,
      levelLabel: researchItemViews['sharpened-stick'].levelLabel,
      subtitle: researchItemViews['sharpened-stick'].subtitle,
      progressWrap: researchItemViews['sharpened-stick'].progressWrap,
      progressBar: researchItemViews['sharpened-stick'].progressBar,
      progressLabel: researchItemViews['sharpened-stick'].progressLabel,
      idleSubtitle: () => getResearchSubtitle('sharpened-stick'),
      workingSubtitle: 'Sharpening a stick...',
      idleLabel: 'Sharpened stick research.',
      workingLabel: 'Sharpened stick. Research in progress.',
    },
    researchForaging: {
      id: 'research-foraging',
      researchId: 'foraging-practice',
      button: researchItemViews['foraging-practice'].button,
      levelLabel: researchItemViews['foraging-practice'].levelLabel,
      subtitle: researchItemViews['foraging-practice'].subtitle,
      progressWrap: researchItemViews['foraging-practice'].progressWrap,
      progressBar: researchItemViews['foraging-practice'].progressBar,
      progressLabel: researchItemViews['foraging-practice'].progressLabel,
      idleSubtitle: () => getResearchSubtitle('foraging-practice'),
      workingSubtitle: 'Practicing foraging...',
      idleLabel: 'Woven baskets research.',
      workingLabel: 'Woven baskets. Research in progress.',
    },
    researchStone: {
      id: 'research-stone-flakes',
      researchId: 'stone-flakes',
      button: researchItemViews['stone-flakes'].button,
      levelLabel: researchItemViews['stone-flakes'].levelLabel,
      subtitle: researchItemViews['stone-flakes'].subtitle,
      progressWrap: researchItemViews['stone-flakes'].progressWrap,
      progressBar: researchItemViews['stone-flakes'].progressBar,
      progressLabel: researchItemViews['stone-flakes'].progressLabel,
      idleSubtitle: () => getResearchSubtitle('stone-flakes'),
      workingSubtitle: 'Knapping stone flakes...',
      idleLabel: 'Flint knapping research.',
      workingLabel: 'Flint knapping. Research in progress.',
    },
  }
  function setHidden(element: HTMLElement, hidden: boolean) {
    element.hidden = hidden
    element.style.display = hidden ? 'none' : ''
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
  }

  function syncActionView(action: Action, view: ActionView) {
    if (view.researchId) {
      view.levelLabel.textContent = getResearchRowLabel(view.researchId)
    } else {
      const skill = getSkill(action.id)
      view.levelLabel.textContent = `Lv ${skill.level} · ${skill.xp}/${getRequiredXp(action.id)} XP`
    }
    if (getActiveAction() === action) return
    view.subtitle.textContent = view.researchId
      ? getResearchSubtitle(view.researchId)
      : view.idleSubtitle()
    const duration = formatDuration(getActionDuration(action))
    const labels = {
      gather: `Gather fruit. Collect ${formatResource(1 + getFruitResearchBonus() + getResourceMilestoneBonus('gather'))} fruit by hand. Takes ${duration}.`,
      explore: `Explore nearby. Spend 10 fruit. Takes ${duration}.`,
      sticks: `Gather sticks. Collect ${formatResource(1 + getResourceMilestoneBonus('sticks'))} wood by hand. Takes ${duration}.`,
      'explore-further': `Explore farther. Spend 10 fruit. Takes ${duration}.`,
      stone: `Gather stone. Collect ${formatResource(1 + getStoneResearchBonus() + getResourceMilestoneBonus('stone'))} stone by hand. Takes ${duration}.`,
      research: `Sharpened stick. Research ${getResearchCostLabel('sharpened-stick')} next. Takes ${duration}.`,
      'research-foraging': `Woven baskets. Research ${getResearchCostLabel('foraging-practice')} next. Takes ${duration}.`,
      'research-stone-flakes': `Flint knapping. Research ${getResearchCostLabel('stone-flakes')} next. Takes ${duration}.`,
    }
    view.button.setAttribute('aria-label', labels[action.id] || view.idleLabel)
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
    itemView.subtitle.textContent = getResearchSubtitle(researchId)
    itemView.completeLevel.textContent = `Lv ${level}/${definition.maxLevel}`
    if (itemView.value)
      itemView.value.textContent = maxed ? 'Max' : `Lv ${level + 1}`
    const next = getResearchNextLevel(researchId)
    if (next) {
      const action = Object.values(actions).find(
        (candidate) => candidate.id === definition.actionId,
      )
      if (action)
        itemView.button.setAttribute(
          'aria-label',
          `${definition.name}. Spend ${formatResearchCost(next)}. Takes ${formatDuration(getActionDuration(action))}.`,
        )
    }
  }

  function render() {
    syncUnlocks()
    fruitValue.textContent = formatResource(state.fruit)
    woodValue.textContent = formatResource(state.wood)
    stoneValue.textContent = formatResource(state.stone)
    const fruitGain = 1 + getFruitResearchBonus()
    const fruitMilestoneGain = getResourceMilestoneBonus('gather')
    const totalFruitGain = fruitGain + fruitMilestoneGain
    const woodGain = 1 + getResourceMilestoneBonus('sticks')
    const stoneGain =
      1 + getStoneResearchBonus() + getResourceMilestoneBonus('stone')
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
    gatherButton.setAttribute(
      'aria-label',
      `Gather fruit. Collect ${formatResource(totalFruitGain)} fruit by hand. Takes ${formatDuration(getActionDuration(actions.gather))}. Gain ${formatResource(totalFruitGain)} fruit.`,
    )
    Object.values(actionViews).forEach((view) => {
      const action = Object.values(actions).find(
        (candidate) => candidate.id === view.id,
      )
      if (action) syncActionView(action, view)
    })
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

    const researching = getActiveAction()?.id?.startsWith('research') ?? false
    RESEARCH_ITEM_KEYS.forEach(renderResearchItem)
    const anyResearchVisible = RESEARCH_ITEM_KEYS.some((researchId) =>
      getResearchDefinition(researchId).prerequisite(),
    )
    setHidden(researchEmpty, anyResearchVisible || researching)
    actionsTab.disabled = Boolean(getActiveAction())
    researchTab.disabled = Boolean(getActiveAction()) || !state.researchUnlocked
    researchTab.setAttribute('aria-disabled', String(researchTab.disabled))
    if (!state.researchUnlocked) currentView = 'camp'
    setView(currentView)

    renderHunger()
  }
  function renderHunger() {
    rateLabel.textContent = `${formatResource(state.people.reduce((sum, person) => sum + getHungerEffects(person).portion, 0))} fruit / min`
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
        const percent = Math.round((person.hunger / person.maxHunger) * 100)
        hunger.textContent = `Hunger ${percent}%`
        hunger.style.fontVariantNumeric = 'tabular-nums'
        const effects = getHungerEffects(person)
        hunger.title = `${person.hunger}/${person.maxHunger} · ${effects.portion} fruit/min · Auto output ${effects.outputMultiplier * 100}%`
        row.append(icon, name, hunger)
        return row
      }),
    )
  }
  function resetActionView(view: ActionView) {
    view.button.disabled = false
    view.button.removeAttribute('aria-busy')
    view.button.classList.remove('is-working')
    view.button.setAttribute('aria-label', view.idleLabel)
    view.subtitle.textContent = view.idleSubtitle()
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
