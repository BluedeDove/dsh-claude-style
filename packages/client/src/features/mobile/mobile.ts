import { COMPOSER_CARD_SELECTOR, COMPOSER_TOOLS_SELECTOR, COMPOSER_TRAILING_SELECTOR, COMPOSER_DOCK_SELECTOR, COMPOSER_MODES_SELECTOR, HEADER_TITLE_ROW_SELECTOR, HEADER_TITLE_SELECTOR, HEADER_UTILITIES_SELECTOR, HEADER_CORNER_SELECTOR, HEADER_CLUSTER_SELECTOR, HEADER_ACTIONS_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createStamp, setAttributeIfChanged } from '../../shared/dom'
import { observeSize } from '../../core/bus'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mobile.manifest'
import { installNativeComposer } from './native-composer'
import { installMobileShell } from './mobile-shell'

const MOBILE = 'data-dsh-claude-mobile'
const TOOLS_OPEN = 'data-dsh-claude-mobile-tools-open'
const HEADER_OPEN = 'data-dsh-claude-mobile-header-open'
const SECONDARY = 'data-dsh-claude-mobile-secondary'

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stopNativeInput = installNativeComposer(ctx)
  const shell = installMobileShell(ctx)
  const query = matchMedia('(max-width: 720px)')
  const cardStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-card')
  const rowStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-toolbar')
  const dockStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-dock')
  const headerStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-header')
  const headerRootStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-header-root')
  const clusterStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-cluster')
  const titleStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-title')
  const actionsStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-actions')
  const utilitiesStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-utilities')
  const cornerStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-corner')
  const stamps = [cardStamp, rowStamp, dockStamp, headerStamp, headerRootStamp, clusterStamp, titleStamp, actionsStamp, utilitiesStamp, cornerStamp]
  let secondary = new Set<Element>()
  let toolsButton: HTMLButtonElement | null = null, headerButton: HTMLButtonElement | null = null
  let stopRowSize: (() => void) | null = null
  let viewportFrame = 0, baselineHeight = innerHeight, baselineWidth = innerWidth

  function button(label: string, attribute: string, marker: string) {
    const control = document.createElement('button')
    control.type = 'button'; control.className = 'dsh-claude-mobile-toggle'
    control.textContent = label; control.setAttribute('aria-label', label)
    control.setAttribute(marker, '')
    control.setAttribute('aria-expanded', 'false')
    control.addEventListener('click', () => {
      const open = !document.body.hasAttribute(attribute)
      if (open) document.body.setAttribute(attribute, '')
      else document.body.removeAttribute(attribute)
      control.setAttribute('aria-expanded', String(open))
      ui.schedule?.()
    })
    return control
  }

  function release() {
    toolsButton?.remove(); headerButton?.remove(); toolsButton = null; headerButton = null
    stopRowSize?.(); stopRowSize = null
    for (const stamp of stamps) stamp.release()
    for (const element of secondary) element.removeAttribute(SECONDARY)
    secondary.clear()
    for (const attribute of [MOBILE, TOOLS_OPEN, HEADER_OPEN, 'data-dsh-claude-mobile-keyboard']) document.body.removeAttribute(attribute)
    for (const property of ['--dsh-mobile-viewport-height', '--dsh-mobile-toolbar-height']) document.body.style.removeProperty(property)
  }

  function viewport() {
    viewportFrame = 0
    if (!query.matches) return
    const visual = window.visualViewport
    if (visual && visual.scale > 1.05) return
    if (Math.abs(innerWidth - baselineWidth) > 80) {baselineHeight = innerHeight; baselineWidth = innerWidth}
    baselineHeight = Math.max(baselineHeight, innerHeight)
    const height = Math.round(visual?.height ?? innerHeight)
    const value = `${height}px`
    if (document.body.style.getPropertyValue('--dsh-mobile-viewport-height') !== value) document.body.style.setProperty('--dsh-mobile-viewport-height', value)
    const keyboard = baselineHeight - height > 140
    if (keyboard) setAttributeIfChanged(document.body, 'data-dsh-claude-mobile-keyboard', '')
    else document.body.removeAttribute('data-dsh-claude-mobile-keyboard')
  }
  function scheduleViewport() {if (!viewportFrame) viewportFrame = requestAnimationFrame(viewport)}

  function sync() {
    shell.sync()
    if (!query.matches) {if (document.body.hasAttribute(MOBILE)) release(); return}
    setAttributeIfChanged(document.body, MOBILE, '')
    const card = document.querySelector<HTMLElement>(COMPOSER_CARD_SELECTOR)
    const trailing = card?.querySelector<HTMLElement>(COMPOSER_TRAILING_SELECTOR)
    const row = trailing?.parentElement ?? null
    if (cardStamp.current() !== card) {
      document.body.removeAttribute(TOOLS_OPEN)
      toolsButton?.setAttribute('aria-expanded', 'false')
    }
    cardStamp.mark(card)
    dockStamp.mark(card?.parentElement?.querySelector<HTMLElement>(`:scope > ${COMPOSER_DOCK_SELECTOR}`) ?? null)
    if (rowStamp.current() !== row) {
      stopRowSize?.(); stopRowSize = null; rowStamp.mark(row)
      if (row) stopRowSize = observeSize(row, () => {
        const height = `${Math.ceil(row.getBoundingClientRect().height)}px`
        if (document.body.style.getPropertyValue('--dsh-mobile-toolbar-height') !== height) document.body.style.setProperty('--dsh-mobile-toolbar-height', height)
      })
    }
    if (row && !toolsButton?.isConnected) {
      toolsButton?.remove(); toolsButton = button('工具', TOOLS_OPEN, 'data-dsh-claude-mobile-tools-toggle'); row.append(toolsButton)
    }
    const nextSecondary = new Set<Element>()
    const modes = card?.querySelector(COMPOSER_MODES_SELECTOR)
    if (modes) nextSecondary.add(modes)
    const tools = card?.querySelector(COMPOSER_TOOLS_SELECTOR)
    for (const element of secondary) if (!nextSecondary.has(element)) element.removeAttribute(SECONDARY)
    for (const element of nextSecondary) setAttributeIfChanged(element, SECONDARY, '')
    secondary = nextSecondary

    const title = document.querySelector<HTMLElement>(HEADER_TITLE_SELECTOR)
    const header = title?.closest<HTMLElement>(HEADER_TITLE_ROW_SELECTOR) ?? null
    headerStamp.mark(header); titleStamp.mark(title)
    headerRootStamp.mark(header?.closest<HTMLElement>('header') ?? null)
    clusterStamp.mark(header?.querySelector<HTMLElement>(HEADER_CLUSTER_SELECTOR) ?? null)
    actionsStamp.mark(header?.querySelector<HTMLElement>(HEADER_ACTIONS_SELECTOR) ?? null)
    utilitiesStamp.mark(header?.querySelector<HTMLElement>(HEADER_UTILITIES_SELECTOR) ?? null)
    cornerStamp.mark(header?.querySelector<HTMLElement>(HEADER_CORNER_SELECTOR) ?? null)
    if (header && !headerButton?.isConnected) {
      headerButton?.remove(); headerButton = button('更多', HEADER_OPEN, 'data-dsh-claude-mobile-header-toggle'); header.append(headerButton)
    }
    scheduleViewport()
  }
  function onWidthChange() {sync(); ui.schedule?.()}
  query.addEventListener('change', onWidthChange)
  window.addEventListener('resize', scheduleViewport)
  window.visualViewport?.addEventListener('resize', scheduleViewport)
  window.visualViewport?.addEventListener('scroll', scheduleViewport)
  ui.mobile = {sync}
  sync()
  return () => {
    query.removeEventListener('change', onWidthChange)
    window.removeEventListener('resize', scheduleViewport)
    window.visualViewport?.removeEventListener('resize', scheduleViewport)
    window.visualViewport?.removeEventListener('scroll', scheduleViewport)
    cancelAnimationFrame(viewportFrame); release(); shell.stop(); stopNativeInput(); delete ui.mobile
  }
}
