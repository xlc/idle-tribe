import { JOBS, RECRUIT_COST, RESEARCH_ITEM_KEYS, RESOURCES } from './constants'
import {
  BUILDING_IDS,
  BUILDINGS,
  DEVELOPMENT_TECH,
  JOB_BUILDING,
  PRODUCTION_TECH,
  SPECIALIZATION_TECH,
} from './economy'
import {
  formatCompactResource,
  formatDuration,
  formatResearchCost,
  formatResource,
} from './format'
import type { Game } from './game'
import type {
  ActionKey,
  Cost,
  JobId,
  Person,
  ResearchId,
  ResourceId,
} from './types'

export interface ActionView {
  button: HTMLButtonElement
  levelLabel: HTMLElement
  subtitle: HTMLElement
  progressWrap: HTMLElement
  progressBar: HTMLProgressElement
  progressLabel: HTMLElement
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id)
  if (!found) throw new Error(`Missing element: ${id}`)
  return found as T
}
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
) {
  const result = document.createElement(tag)
  result.className = className
  result.textContent = text
  return result
}
const RESOURCE_NAMES: Record<ResourceId, string> = {
  fruit: 'Fruit',
  wood: 'Wood',
  stone: 'Stone',
  planks: 'Planks',
  blocks: 'Blocks',
  knowledge: 'Knowledge',
}
const REQUIREMENTS: Record<ResearchId, string> = {
  'sharpened-stick': '2 wood',
  'foraging-practice': 'Sharpened stick',
  shelters: 'Sharpened stick',
  'stone-flakes': 'Discover stone',
  'stone-axes': 'Flint knapping',
  quarrying: 'Stone axes',
  teamwork: 'Shelters',
  carpentry: 'Shelters · discover stone',
  masonry: 'Flint knapping',
  writing: 'Carpentry + Masonry',
  forestry: 'Writing',
  stonecraft: 'Writing',
  agriculture: 'Writing',
  joinery: 'Forestry',
  architecture: 'Stonecraft',
  engineering: 'Cultivation + your path technology',
}

export function createRenderer(game: Game, beforeChange: () => void) {
  const { state } = game
  const feedback = element('feedback')
  const actionsTab = element<HTMLButtonElement>('actions-tab')
  const researchTab = element<HTMLButtonElement>('research-tab')
  const recruitButton = element<HTMLButtonElement>('recruit-button')
  const feastButton = element<HTMLButtonElement>('feast-button')
  const tribeList = element('tribe-list')
  let view: 'camp' | 'research' = 'camp'
  let wasAutomated = state.researchLevels.shelters > 0
  let wasWriting = state.researchLevels.writing > 0
  element<HTMLDetailsElement>('manual-work').open = !wasAutomated
  const resourceViews = RESOURCES.map((id) => {
    const row = node('div', `resource resource-${id}`)
    const title = node('span', 'resource-name', RESOURCE_NAMES[id])
    const value = node('strong', 'resource-value')
    const rate = node('span', 'resource-rate')
    row.append(title, value, rate)
    element('resource-list').append(row)
    return { id, row, value, rate }
  })
  const groups = [
    {
      name: 'Foundations',
      ids: RESEARCH_ITEM_KEYS.filter(
        (id) =>
          ![
            ...PRODUCTION_TECH,
            ...SPECIALIZATION_TECH,
            ...DEVELOPMENT_TECH,
          ].includes(id),
      ),
    },
    { name: 'Workshops', ids: PRODUCTION_TECH },
    { name: 'Choose a specialization', ids: SPECIALIZATION_TECH },
    { name: 'A growing village', ids: DEVELOPMENT_TECH },
  ].map((group) => {
    const section =
      group.name === 'Foundations'
        ? node('details', 'tech-section foundation-section')
        : node('section', 'tech-section')
    if (section instanceof HTMLDetailsElement) section.open = !wasWriting
    section.append(
      node(group.name === 'Foundations' ? 'summary' : 'h3', '', group.name),
    )
    const list = node('div', 'tech-grid')
    section.append(list)
    element('research-groups').append(section)
    return { ...group, section, list }
  })
  const actionViews = {} as Record<ActionKey, ActionView>
  const researchViews = new Map<
    ResearchId,
    {
      card: HTMLElement
      costs: HTMLElement
      effect: HTMLElement
      requirement: HTMLElement
    }
  >()
  for (const key of Object.keys(game.actions) as ActionKey[]) {
    const action = game.actions[key]
    const research = action.researchId
    const button = node('button', research ? 'tech-card' : 'manual-action')
    button.type = 'button'
    button.id = `${action.id}-button`
    const top = node('span', 'card-title')
    const name = node('span', '', action.name)
    const levelLabel = node('span', 'level-label')
    top.append(name, levelLabel)
    const subtitle = node('span', 'action-subtitle')
    const progressWrap = node('span', 'action-progress')
    progressWrap.hidden = true
    const progressBar = node('progress')
    progressBar.max = 100
    const progressLabel = node('span')
    progressWrap.append(progressBar, progressLabel)
    const actionStatus = node('span', 'action-status')
    actionStatus.append(subtitle, progressWrap)
    button.append(top, actionStatus)
    actionViews[key] = {
      button,
      levelLabel,
      subtitle,
      progressWrap,
      progressBar,
      progressLabel,
    }
    if (research) {
      const costs = node('span', 'costs')
      const requirement = node('span', 'requirement')
      const effect = node('span', 'tech-effect')
      button.append(effect, costs, requirement)
      groups.find((group) => group.ids.includes(research))?.list.append(button)
      researchViews.set(research, { card: button, costs, effect, requirement })
    } else
      element(
        key === 'explore' || key === 'exploreFurther'
          ? 'discovery-list'
          : 'manual-list',
      ).append(button)
  }
  function change(run: () => boolean, message: string) {
    beforeChange()
    if (run()) feedback.textContent = message
    render()
  }
  const buildingViews = BUILDING_IDS.map((id) => {
    const definition = BUILDINGS[id]
    const card = node('article', 'building-card')
    card.id = `building-${id}`
    const top = node('div', 'card-title')
    const name = node('h3', '', definition.name)
    const level = node('span', 'level-label')
    top.append(name, level)
    const recipe = node('p', 'building-recipe')
    const status = node('p', 'building-status')
    const progress = node('progress', 'work-progress')
    progress.max = 100
    progress.setAttribute('aria-label', `${definition.name} production cycle`)
    const controls = node('div', 'building-controls')
    const workers = node('div', 'worker-control')
    const minus = node('button', 'worker-button', '−')
    const count = node('span', 'worker-count')
    const plus = node('button', 'worker-button', '+')
    for (const button of [minus, plus]) button.type = 'button'
    minus.setAttribute('aria-label', `Remove worker from ${definition.name}`)
    plus.setAttribute('aria-label', `Assign worker to ${definition.name}`)
    minus.onclick = () =>
      definition.job &&
      change(
        () => game.adjustWorkers(definition.job as Exclude<JobId, 'idle'>, -1),
        '',
      )
    plus.onclick = () =>
      definition.job &&
      change(
        () => game.adjustWorkers(definition.job as Exclude<JobId, 'idle'>, 1),
        '',
      )
    workers.append(minus, count, plus)
    workers.hidden = !definition.job
    const build = node('button', 'build-button')
    build.type = 'button'
    build.onclick = () => {
      const existed = state.buildings[id] > 0
      change(
        () => game.build(id),
        id === 'great-hall'
          ? 'The Great Hall is complete.'
          : `${definition.name} ${existed ? 'expanded' : 'built'}.`,
      )
      if (id === 'great-hall' && state.buildings[id] > 0) {
        const milestone = element('village-complete')
        milestone.scrollIntoView({ block: 'start' })
        milestone.focus({ preventScroll: true })
      }
    }
    controls.append(workers, build)
    const costs = node('p', 'costs')
    card.append(top, recipe, status, progress, controls, costs)
    element('building-list').append(card)
    return {
      id,
      definition,
      card,
      level,
      recipe,
      status,
      progress,
      workers,
      count,
      minus,
      plus,
      build,
      costs,
    }
  })
  const peopleViews = new Map<
    Person,
    {
      row: HTMLElement
      name: HTMLElement
      health: HTMLElement
      select: HTMLSelectElement
    }
  >()
  function getPersonForJobControl(select: HTMLSelectElement) {
    return [...peopleViews].find(([, person]) => person.select === select)?.[0]
  }
  function setView(next: 'camp' | 'research') {
    view = next === 'research' && state.researchUnlocked ? next : 'camp'
    const researching = view === 'research'
    element('camp-view').hidden = researching
    element('research-view').hidden = !researching
    actionsTab.setAttribute('aria-selected', String(!researching))
    researchTab.setAttribute('aria-selected', String(researching))
    actionsTab.tabIndex = researching ? -1 : 0
    researchTab.tabIndex = researching ? 0 : -1
    if (researching && !document.hidden) game.markResearchSeen()
    element('research-unread').hidden = game.getUnreadResearch().length === 0
  }
  function renderCosts(target: HTMLElement, cost: Cost) {
    // Update text nodes in place: production ticks never replace focused controls.
    const labels = RESOURCES.filter((id) => cost[id]).map((id) => {
      const required = cost[id] ?? 0
      const chip = node(
        'span',
        state[id] >= required ? 'cost-enough' : 'cost-missing',
        `${formatCompactResource(required)} ${id}`,
      )
      return chip
    })
    target.replaceChildren(...labels)
  }
  function render() {
    const focused = document.activeElement
    game.syncUnlocks()
    if (!wasWriting && state.researchLevels.writing > 0) {
      const foundation = groups.find(
        (group) => group.name === 'Foundations',
      )?.section
      if (foundation instanceof HTMLDetailsElement) foundation.open = false
    }
    wasWriting = state.researchLevels.writing > 0
    const automated = game.getResearchLevel('shelters') > 0
    if (automated && !wasAutomated)
      element<HTMLDetailsElement>('manual-work').open = false
    wasAutomated = automated
    const rates = game.getResourceRates(null)
    for (const { id, row, value, rate } of resourceViews) {
      const visible =
        id === 'fruit' ||
        (id === 'wood' && state.explored) ||
        (id === 'stone' && state.stoneFound) ||
        (id === 'planks' && game.getResearchLevel('carpentry') > 0) ||
        (id === 'blocks' && game.getResearchLevel('masonry') > 0) ||
        (id === 'knowledge' && game.getResearchLevel('writing') > 0) ||
        state[id] > 0
      row.hidden = !visible
      value.textContent = formatCompactResource(state[id])
      value.title = formatResource(state[id])
      value.setAttribute('aria-label', `${formatResource(state[id])} ${id}`)
      const perMinute = rates[id] * 60
      rate.textContent =
        Math.abs(perMinute) < 0.05
          ? '—'
          : `${perMinute > 0 ? '+' : '−'}${formatCompactResource(Math.abs(perMinute))}/min`
      rate.dataset.negative = String(perMinute < 0)
      rate.title =
        'Current net production per minute, including processing and meals.'
    }
    element('chapter').textContent = state.buildings['great-hall']
      ? 'Village established'
      : state.specialization
        ? 'A growing village'
        : game.getResearchLevel('carpentry')
          ? 'The workshop age'
          : automated
            ? 'A working settlement'
            : 'A small beginning'
    element('path-name').textContent =
      state.specialization === 'forestry'
        ? 'Forestry'
        : state.specialization === 'stonecraft'
          ? 'Stonecraft'
          : ''
    element('village-complete').hidden = !state.buildings['great-hall']
    const idle = state.people.filter((person) => person.job === 'idle').length
    element('population-count').textContent =
      `${state.people.length} / ${game.getPopulationCapacity()} ${state.people.length === 1 ? 'person' : 'people'}`
    element('camp-summary').hidden = !automated
    element('camp-summary').textContent = automated
      ? `${state.people.length - idle} working · ${idle} available`
      : 'A tribe of one'
    recruitButton.hidden = !automated
    recruitButton.disabled = !game.canRecruit()
    element('recruit-status').textContent = !automated
      ? ''
      : state.people.length >= game.getPopulationCapacity()
        ? 'More shelter needed'
        : ''
    element('production-section').hidden = !automated

    for (const item of buildingViews) {
      const { id, definition } = item
      const level = state.buildings[id]
      const unlocked = game.isBuildingUnlocked(id)
      item.card.hidden =
        (!unlocked && !level) || (id === 'great-hall' && level > 0)
      if (item.card.hidden) continue
      item.level.textContent = level ? `Lv ${level}` : 'Not built'
      item.card.dataset.built = String(level > 0)
      const people = definition.job
        ? state.people.filter((person) => person.job === definition.job)
        : []
      const worker = people[0] ?? {
        ...state.people[0],
        job: definition.job ?? 'idle',
        hunger: 5,
        maxHunger: 5,
      }
      const gain = game.getWorkerGain(
        { ...worker, hunger: worker.maxHunger },
        true,
      )
      const input = definition.job ? game.getJobInput(definition.job) : {}
      item.recipe.textContent = definition.job
        ? `${Object.keys(input).length ? `${formatResearchCost({ ...input, durationMs: 0 })} → ` : '+'}${formatResource(gain)} ${JOBS[definition.job].resource} / ${JOBS[definition.job].durationMs / 1000}s per worker`
        : id === 'houses'
          ? `+${game.getResearchLevel('architecture') ? 4 : 2} places per level`
          : 'Complete the village'
      item.status.textContent = !definition.job
        ? level && id === 'great-hall'
          ? 'Established'
          : ''
        : !level
          ? 'Build to assign workers'
          : !people.length
            ? 'No workers assigned'
            : !people.some(game.canWork)
              ? `Waiting for ${Object.keys(input).join(', ')}`
              : people.some((person) => person.hunger <= 3)
                ? 'Food shortage · reduced output'
                : 'Producing'
      item.progress.hidden = !definition.job || !people.length
      item.progress.value =
        definition.job && people.length
          ? (Math.max(...people.map((p) => p.workElapsedMs)) /
              JOBS[definition.job].durationMs) *
            100
          : 0
      item.count.textContent = `${people.length} / ${definition.job ? game.getJobCapacity(definition.job) : 0}`
      item.count.setAttribute(
        'aria-label',
        `${people.length} workers, capacity ${definition.job ? game.getJobCapacity(definition.job) : 0}`,
      )
      item.minus.disabled = !people.length
      item.plus.disabled =
        !definition.job ||
        !idle ||
        !game.isJobUnlocked(definition.job) ||
        people.length >= game.getJobCapacity(definition.job)
      const maxed = level >= definition.maxLevel
      item.build.textContent = maxed ? 'Complete' : level ? 'Expand' : 'Build'
      item.build.setAttribute(
        'aria-label',
        `${level ? 'Expand' : 'Build'} ${definition.name}`,
      )
      item.build.disabled = !game.canBuild(id)
      item.build.hidden = maxed
      item.costs.hidden = maxed
      renderCosts(item.costs, game.getBuildingCost(id))
    }
    let completed = 0
    for (const key of Object.keys(game.actions) as ActionKey[]) {
      const action = game.actions[key]
      const item = actionViews[key]
      const active = action.researchId
        ? game.getActiveResearch()
        : game.getActiveAction()
      const working = active === action
      item.button.disabled = Boolean(active && !working)
      item.button.setAttribute('aria-busy', String(working))
      const duration = game.getActionDuration(action)
      if (!action.researchId) {
        item.button.hidden =
          key === 'explore'
            ? state.explored || !state.exploreUnlocked
            : key === 'sticks'
              ? !state.explored
              : key === 'exploreFurther'
                ? state.stoneFound || !state.basicTools
                : key === 'stone'
                  ? !state.stoneFound
                  : false
        item.levelLabel.textContent = `Lv ${game.getSkill(action.id).level}`
        const gain = game.getNextResourceGain(action.id)
        item.subtitle.textContent = `${gain ? `+${formatResource(gain)} ${JOBS[key === 'gather' ? 'forager' : key === 'sticks' ? 'woodcutter' : 'stoneworker'].resource}` : '10 fruit'} · ${formatDuration(duration)}`
        item.button.disabled =
          !working &&
          (Boolean(active) || Boolean(action.canStart && !action.canStart()))
        item.button.setAttribute(
          'aria-disabled',
          String(working || item.button.disabled),
        )
        item.button.setAttribute(
          'aria-label',
          `${action.name}. ${item.subtitle.textContent}`,
        )
        continue
      }
      const id = action.researchId
      const research = researchViews.get(id)
      if (!research) continue
      const definition = game.getResearchDefinition(id)
      const level = game.getResearchLevel(id)
      const maxed = !game.getResearchNextLevel(id)
      const otherPath =
        ((id === 'forestry' || id === 'joinery') &&
          state.specialization === 'stonecraft') ||
        ((id === 'stonecraft' || id === 'architecture') &&
          state.specialization === 'forestry')
      const ready = definition.prerequisite()
      const group = groups.find((candidate) => candidate.ids.includes(id))
      const visible =
        maxed ||
        (group?.name === 'Foundations'
          ? state.researchUnlocked
          : group?.ids === PRODUCTION_TECH
            ? automated && state.stoneFound
            : group?.ids === SPECIALIZATION_TECH
              ? game.getResearchLevel('writing') > 0
              : game.getResearchLevel('writing') > 0)
      item.button.hidden = !visible || otherPath
      item.button.dataset.locked = String(!ready || otherPath)
      item.button.dataset.complete = String(maxed)
      item.levelLabel.textContent = maxed
        ? 'Complete'
        : definition.maxLevel > 1
          ? `${level}/${definition.maxLevel}`
          : ''
      item.subtitle.textContent = maxed
        ? game.getResearchEffect(id, level)
        : game.getResearchEffect(id, level + 1)
      research.effect.textContent = maxed ? '' : formatDuration(duration)
      const next = game.getResearchNextLevel(id)
      research.costs.hidden = !next
      if (next) renderCosts(research.costs, next)
      research.requirement.textContent = otherPath
        ? 'Other path locked'
        : !ready && !maxed
          ? `Requires ${REQUIREMENTS[id]}`
          : (id === 'forestry' || id === 'stonecraft') && !maxed
            ? 'Choose for this run'
            : ''
      research.requirement.hidden = !research.requirement.textContent
      item.button.disabled =
        !working &&
        (maxed ||
          Boolean(active) ||
          !ready ||
          otherPath ||
          !game.canAffordResearch(id))
      item.button.setAttribute(
        'aria-disabled',
        String(working || item.button.disabled),
      )
      item.button.setAttribute(
        'aria-label',
        `${action.name}. ${otherPath ? 'Other path locked' : maxed ? 'Complete' : !ready ? `Requires ${REQUIREMENTS[id]}` : next ? formatResearchCost(next) : ''}. ${item.subtitle.textContent}`,
      )
      const parent = maxed ? element('completed-list') : group?.list
      if (parent && item.button.parentElement !== parent)
        parent.append(item.button)
      if (maxed) completed++
    }
    element('discovery-section').hidden =
      actionViews.explore.button.hidden &&
      actionViews.exploreFurther.button.hidden
    for (const group of groups)
      group.section.hidden = !Array.from(group.list.children).some(
        (child) => !(child as HTMLElement).hidden,
      )
    element('completed-research').hidden = completed === 0
    element('completed-count').textContent = `Completed · ${completed}`
    element('technology-count').textContent =
      `${RESEARCH_ITEM_KEYS.filter((id) => game.getResearchLevel(id) > 0).length} researched`
    researchTab.disabled = !state.researchUnlocked
    setView(view)
    const hungry = state.people.filter((person) => person.hunger <= 3).length
    element('food-summary').textContent = hungry ? `${hungry} hungry` : 'Fed'
    for (const person of state.people) {
      let personView = peopleViews.get(person)
      if (!personView) {
        const row = node('div', 'person-row')
        const name = node('span')
        const health = node('span', 'person-health')
        const select = node('select')
        for (const job of ['idle', ...Object.keys(JOBS)] as JobId[]) {
          const option = node(
            'option',
            '',
            job === 'idle' ? 'Available' : BUILDINGS[JOB_BUILDING[job]].name,
          )
          option.value = job
          select.append(option)
        }
        row.append(name, health, select)
        tribeList.append(row)
        personView = { row, name, health, select }
        peopleViews.set(person, personView)
      }
      personView.name.textContent = person.name
      personView.health.textContent = `${formatResource(person.hunger)}/${formatResource(person.maxHunger)}`
      personView.health.title = `${person.hunger <= 3 ? 'Hungry · reduced output' : 'Fed'} · 1 fruit per person each minute when fed`
      personView.health.dataset.hungry = String(person.hunger <= 3)
      personView.select.setAttribute(
        'aria-label',
        `Workplace for ${person.name}`,
      )
      personView.select.hidden = !automated
      personView.select.value = person.job
      for (const option of Array.from(personView.select.options))
        option.disabled =
          !game.isJobUnlocked(option.value as JobId) ||
          (option.value !== 'idle' &&
            option.value !== person.job &&
            state.people.filter((p) => p.job === option.value).length >=
              game.getJobCapacity(option.value as JobId))
    }
    feastButton.disabled = !game.canFeast()
    element('feast-cost').textContent = game.getFeastCost()
      ? `${game.getFeastCost()} fruit · restore everyone`
      : 'Everyone is fed'
    if (
      focused instanceof HTMLButtonElement &&
      Object.values(actionViews).some((item) => item.button === focused) &&
      (focused.hidden ||
        focused.disabled ||
        focused.closest('details:not([open])'))
    ) {
      const tab = view === 'research' ? researchTab : actionsTab
      tab.focus()
    }
    recruitButton.setAttribute(
      'aria-label',
      `Invite a person. ${RECRUIT_COST} fruit`,
    )
  }
  return {
    render,
    setView,
    feedback,
    actionViews,
    actionsTab,
    researchTab,
    recruitButton,
    feastButton,
    tribeList,
    getPersonForJobControl,
  }
}
