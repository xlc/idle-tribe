import { ACTION_SKILL_CONFIG, JOBS, RECRUIT_COST } from './constants'
import {
  BUILDINGS,
  getSettlementChapter,
  isAutomationUnlocked,
  JOB_BUILDING,
} from './economy'
import {
  formatCompactResource,
  formatDuration,
  formatResearchCost,
  formatResource,
} from './format'
import type { Game } from './game'
import {
  ACTION_KEYS,
  BUILDING_IDS,
  isJobId,
  JOB_IDS,
  RESEARCH_ITEM_KEYS,
  RESOURCES,
} from './ids'
import { createRecord } from './records'
import { isResearchExcluded, RESEARCH_GROUPS } from './research-definitions'
import { RESOURCE_DEFINITIONS } from './resources'
import type { Cost, Person, ResearchId } from './types'

export interface ActionView {
  button: HTMLButtonElement
  levelLabel: HTMLElement
  subtitle: HTMLElement
  progressWrap: HTMLElement
  progressBar: HTMLProgressElement
  progressLabel: HTMLElement
}

export function element(id: string): HTMLElement
export function element<T extends HTMLElement>(
  id: string,
  elementType: { new (): T },
): T
export function element(
  id: string,
  elementType: { new (): HTMLElement } = HTMLElement,
): HTMLElement {
  const found = document.getElementById(id)
  if (!found) throw new Error(`Missing element: ${id}`)
  if (!(found instanceof elementType))
    throw new Error(`Unexpected element type: ${id}`)
  return found
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
export function createRenderer(game: Game, beforeChange: () => void) {
  const { state } = game
  const feedback = element('feedback')
  const actionsTab = element('actions-tab', HTMLButtonElement)
  const researchTab = element('research-tab', HTMLButtonElement)
  const recruitButton = element('recruit-button', HTMLButtonElement)
  const feastButton = element('feast-button', HTMLButtonElement)
  const tribeList = element('tribe-list')
  let view: 'camp' | 'research' = 'camp'
  let wasAutomated = isAutomationUnlocked(state)
  element('manual-work', HTMLDetailsElement).open = !wasAutomated
  const resourceViews = RESOURCES.map((id) => {
    const row = node('div', `resource resource-${id}`)
    const title = node('span', 'resource-name', RESOURCE_DEFINITIONS[id].name)
    const value = node('strong', 'resource-value')
    const rate = node('span', 'resource-rate')
    row.append(title, value, rate)
    element('resource-list').append(row)
    return { id, row, value, rate }
  })
  const groups = RESEARCH_GROUPS.map((group) => {
    const collapsed = group.collapseWhen?.(state) ?? false
    const section = group.collapseWhen
      ? node('details', 'tech-section foundation-section')
      : node('section', 'tech-section')
    if (section instanceof HTMLDetailsElement) section.open = !collapsed
    section.append(node(group.collapseWhen ? 'summary' : 'h3', '', group.name))
    const list = node('div', 'tech-grid')
    section.append(list)
    element('research-groups').append(section)
    return { ...group, section, list, collapsed }
  })
  const researchViews = new Map<
    ResearchId,
    {
      card: HTMLElement
      costs: HTMLElement
      effect: HTMLElement
      requirement: HTMLElement
    }
  >()
  const actionViews = createRecord(ACTION_KEYS, (key): ActionView => {
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
    const item = {
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
      groups
        .find(
          (group) => group.id === game.getResearchDefinition(research).group,
        )
        ?.list.append(button)
      researchViews.set(research, { card: button, costs, effect, requirement })
    } else
      element(action.discovery ? 'discovery-list' : 'manual-list').append(
        button,
      )
    return item
  })
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
    const job = definition.job
    if (job) {
      minus.onclick = () => change(() => game.adjustWorkers(job, -1), '')
      plus.onclick = () => change(() => game.adjustWorkers(job, 1), '')
    }
    workers.append(minus, count, plus)
    workers.hidden = !definition.job
    const build = node('button', 'build-button')
    build.type = 'button'
    build.onclick = () => {
      const existed = state.buildings[id] > 0
      change(
        () => game.build(id),
        definition.milestone?.message ??
          `${definition.name} ${existed ? 'expanded' : 'built'}.`,
      )
      if (definition.milestone && state.buildings[id] > 0) {
        const milestone = element(definition.milestone.target)
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
    for (const group of groups) {
      const collapsed = group.collapseWhen?.(state) ?? false
      if (
        collapsed &&
        !group.collapsed &&
        group.section instanceof HTMLDetailsElement
      )
        group.section.open = false
      group.collapsed = collapsed
    }
    const automated = isAutomationUnlocked(state)
    if (automated && !wasAutomated)
      element('manual-work', HTMLDetailsElement).open = false
    wasAutomated = automated
    const rates = game.getResourceRates(null)
    for (const { id, row, value, rate } of resourceViews) {
      const visible = RESOURCE_DEFINITIONS[id].visible(state) || state[id] > 0
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
    element('chapter').textContent = getSettlementChapter(state)
    element('path-name').textContent = state.specialization
      ? game.getResearchDefinition(state.specialization).name
      : ''
    for (const id of BUILDING_IDS) {
      const milestone = BUILDINGS[id].milestone
      if (milestone)
        element(milestone.target).hidden = state.buildings[id] === 0
    }
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
        (!unlocked && !level) || Boolean(definition.milestone && level > 0)
      if (item.card.hidden) continue
      item.level.textContent = level ? `Lv ${level}` : 'Not built'
      item.card.dataset.built = String(level > 0)
      const people = definition.job
        ? state.people.filter((person) => person.job === definition.job)
        : []
      const worker = people[0] ?? {
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
        : (definition.description?.(state) ?? '')
      item.status.textContent = !definition.job
        ? level && definition.milestone
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
    for (const key of ACTION_KEYS) {
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
        item.button.hidden = action.visible ? !action.visible() : false
        item.levelLabel.textContent = `Lv ${game.getSkill(action.id).level}`
        const gain = game.getNextResourceGain(action.id)
        const resource = ACTION_SKILL_CONFIG[action.id].resource
        const cost = action.cost?.()
        const summary = resource
          ? `+${formatResource(gain)} ${resource}`
          : cost
            ? formatResearchCost({ ...cost, durationMs: 0 })
            : ''
        item.subtitle.textContent = `${summary} · ${formatDuration(duration)}`
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
      const otherPath = isResearchExcluded(state, id)
      const ready = definition.prerequisite()
      const group = groups.find(
        (candidate) => candidate.id === definition.group,
      )
      const visible = maxed || Boolean(group?.visible(state))
      item.button.hidden = !visible || otherPath
      item.button.dataset.locked = String(!ready || otherPath)
      item.button.dataset.complete = String(maxed)
      item.levelLabel.textContent = maxed
        ? 'Complete'
        : definition.levels.length > 1
          ? `${level}/${definition.levels.length}`
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
          ? `Requires ${definition.requirement}`
          : definition.specialization?.kind === 'choice' && !maxed
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
        `${action.name}. ${otherPath ? 'Other path locked' : maxed ? 'Complete' : !ready ? `Requires ${definition.requirement}` : next ? formatResearchCost(next) : ''}. ${item.subtitle.textContent}`,
      )
      const parent = maxed ? element('completed-list') : group?.list
      if (parent && item.button.parentElement !== parent)
        parent.append(item.button)
      if (maxed) completed++
    }
    element('discovery-section').hidden = !ACTION_KEYS.some(
      (key) => game.actions[key].discovery && !actionViews[key].button.hidden,
    )
    for (const group of groups)
      group.section.hidden = !Array.from(group.list.children).some(
        (child) => child instanceof HTMLElement && !child.hidden,
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
        for (const job of JOB_IDS) {
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
      for (const option of Array.from(personView.select.options)) {
        const job = option.value
        option.disabled =
          !isJobId(job) ||
          !game.isJobUnlocked(job) ||
          (job !== 'idle' &&
            job !== person.job &&
            state.people.filter((p) => p.job === job).length >=
              game.getJobCapacity(job))
      }
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
