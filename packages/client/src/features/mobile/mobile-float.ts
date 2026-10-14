import { observeSize } from '../../core/bus'
import { setAttributeIfChanged } from '../../shared/dom'

type Kind = 'header' | 'tools'
type Surface = { button: HTMLButtonElement; groups: HTMLElement[] }
const FLOATING = 'data-dsh-claude-mobile-floating'
const OPEN = {header: 'data-dsh-claude-mobile-header-open', tools: 'data-dsh-claude-mobile-tools-open'}
const PROPERTIES = ['--dsh-mobile-float-left', '--dsh-mobile-float-top', '--dsh-mobile-float-width', '--dsh-mobile-float-height']

/** D52: preserve the host's parent relationships and place its real controls by measurement. */
export function installMobileFloat() {
  const surfaces = new Map<Kind, Surface>()
  const savedIds = new Map<HTMLElement, string>()
  const ancestors = new Set<HTMLElement>()
  let active: Kind | null = null, frame = 0
  let offs: (() => void)[] = []
  const backdrop = document.createElement('button')
  backdrop.className = 'dsh-claude-mobile-float-backdrop'
  backdrop.type = 'button'; backdrop.setAttribute('aria-label', '关闭浮窗'); backdrop.tabIndex = -1
  const panel = document.createElement('section')
  panel.className = 'dsh-claude-mobile-float'; panel.id = 'dsh-claude-mobile-float'
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false')
  const title = document.createElement('strong')
  const close = document.createElement('button')
  close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', '关闭浮窗')
  const heading = document.createElement('div')
  heading.className = 'dsh-claude-mobile-float-heading'; heading.append(title, close); panel.append(heading)
  backdrop.hidden = true; panel.hidden = true
  document.body.append(backdrop, panel)

  function property(element: HTMLElement, name: string, value: string) {
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value)
  }
  function clearGroups() {
    for (const off of offs) off()
    offs = []
    for (const [group, id] of savedIds) {
      group.removeAttribute(FLOATING)
      for (const name of PROPERTIES) group.style.removeProperty(name)
      if (id) group.id = id
      else group.removeAttribute('id')
    }
    savedIds.clear()
    for (const element of ancestors) {
      element.removeAttribute('data-dsh-claude-mobile-float-ancestor')
      element.removeAttribute('data-dsh-claude-mobile-float-container')
      element.removeAttribute('data-dsh-claude-mobile-float-sticky')
    }
    ancestors.clear()
  }
  function dismiss(restoreFocus = false) {
    const button = active && surfaces.get(active)?.button
    clearGroups()
    for (const [kind, surface] of surfaces) {
      document.body.removeAttribute(OPEN[kind]); surface.button.setAttribute('aria-expanded', 'false')
    }
    active = null; panel.hidden = true; backdrop.hidden = true; panel.removeAttribute('aria-owns')
    if (panel.parentElement !== document.body) document.body.append(panel)
    if (restoreFocus && button?.isConnected) button.focus({preventScroll: true})
  }
  function layout() {
    frame = 0
    const surface = active && surfaces.get(active)
    if (!surface || !surface.button.isConnected) {dismiss(); return}
    const visual = window.visualViewport
    const left = (visual?.offsetLeft ?? 0) + 12, width = Math.max(160, (visual?.width ?? innerWidth) - 24)
    const topLimit = (visual?.offsetTop ?? 0) + 12, bottomLimit = topLimit + (visual?.height ?? innerHeight) - 24
    const groups = surface.groups.filter(group => group.isConnected)
    const available = Math.max(40, bottomLimit - topLimit - 60 - groups.length * 8)
    const share = Math.floor(available / Math.max(1, groups.length))
    const heights = groups.map(group => {
      property(group, '--dsh-mobile-float-width', `${width - 24}px`)
      property(group, '--dsh-mobile-float-height', `${available}px`)
      return Math.min(Math.ceil(group.scrollHeight), share)
    })
    const height = 52 + heights.reduce((sum, value) => sum + value + 8, 0)
    const anchor = surface.button.getBoundingClientRect()
    const preferred = active === 'header' ? anchor.bottom + 8 : anchor.top - height - 8
    const top = Math.max(topLimit, Math.min(preferred, bottomLimit - height))
    property(panel, 'left', `${left}px`); property(panel, 'top', `${top}px`)
    property(panel, 'width', `${width}px`); property(panel, 'height', `${height}px`)
    let y = top + 48
    groups.forEach((group, index) => {
      property(group, '--dsh-mobile-float-left', `${left + 12}px`)
      property(group, '--dsh-mobile-float-top', `${y}px`)
      property(group, '--dsh-mobile-float-height', `${heights[index]}px`)
      y += heights[index] + 8
    })
  }
  function schedule() {if (active && !frame) frame = requestAnimationFrame(layout)}
  function bindGroups(surface: Surface) {
    clearGroups()
    let parent: HTMLElement | null = surface.groups[0]?.parentElement ?? document.body
    while (parent && !surface.groups.every(group => parent!.contains(group))) parent = parent.parentElement
    // The panel is ours. Put its backing in the controls' stacking context;
    // the host controls themselves keep their React-owned parents.
    if (parent && panel.parentElement !== parent) parent.append(panel)
    surface.groups.forEach((group, index) => {
      for (let parent = group.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        // Sticky ancestors always form a stacking context, even with z-index auto.
        if (style.position === 'sticky') {setAttributeIfChanged(parent, 'data-dsh-claude-mobile-float-sticky', ''); ancestors.add(parent)}
        if (style.zIndex !== 'auto') {setAttributeIfChanged(parent, 'data-dsh-claude-mobile-float-ancestor', ''); ancestors.add(parent)}
        if (style.containerType !== 'normal') {setAttributeIfChanged(parent, 'data-dsh-claude-mobile-float-container', ''); ancestors.add(parent)}
      }
      savedIds.set(group, group.id)
      if (!group.id) group.id = `dsh-claude-mobile-float-${index}`
      setAttributeIfChanged(group, FLOATING, active!)
      offs.push(observeSize(group, schedule))
    })
    panel.setAttribute('aria-owns', surface.groups.map(group => group.id).join(' '))
  }
  function register(kind: Kind, button: HTMLButtonElement, groups: (HTMLElement | null | undefined)[]) {
    const next = groups.filter((group): group is HTMLElement => !!group)
    const previous = surfaces.get(kind)
    const changed = previous?.button !== button || previous.groups.length !== next.length || next.some((group, index) => previous.groups[index] !== group)
    surfaces.set(kind, {button, groups: next}); button.setAttribute('aria-controls', panel.id)
    if (active === kind && changed) {bindGroups(surfaces.get(kind)!); schedule()}
  }
  function toggle(kind: Kind) {
    if (active === kind) {dismiss(true); return}
    dismiss()
    const surface = surfaces.get(kind)
    if (!surface) return
    active = kind
    document.body.setAttribute(OPEN[kind], '')
    surface.button.setAttribute('aria-expanded', 'true')
    title.textContent = kind === 'header' ? '会话操作' : '输入工具'
    panel.setAttribute('aria-label', title.textContent)
    panel.hidden = false; backdrop.hidden = false
    bindGroups(surface); layout(); close.focus({preventScroll: true})
  }
  function keydown(event: KeyboardEvent) {
    if (!active || event.defaultPrevented) return
    if (event.key === 'Escape') {event.preventDefault(); dismiss(true); return}
    if (event.key !== 'Tab') return
    const controls = [close, ...surfaces.get(active)!.groups.flatMap(group => Array.from(group.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]')))]
      .filter(element => !element.hasAttribute('disabled') && element.getBoundingClientRect().height > 0)
    const index = controls.indexOf(document.activeElement as HTMLElement)
    if (index < 0) return
    const next = event.shiftKey ? index - 1 : index + 1
    if (next < 0 || next >= controls.length) {event.preventDefault(); controls[(next + controls.length) % controls.length].focus({preventScroll: true})}
  }
  function outside(event: PointerEvent) {
    if (!active || !(event.target instanceof Element)) return
    if (event.target === backdrop) return
    const surface = surfaces.get(active)!
    if (panel.contains(event.target) || surface.groups.some(group => group.contains(event.target as Node))) return
    if ([...surfaces.values()].some(value => value.button.contains(event.target as Node))) return
    if (event.target.closest('[role="menu"], [role="dialog"], [data-dsh-claude-popover], [data-dsh-claude-effort-trigger]')) return
    dismiss()
  }
  backdrop.addEventListener('click', () => dismiss(true)); close.addEventListener('click', () => dismiss(true))
  document.addEventListener('keydown', keydown)
  document.addEventListener('pointerdown', outside)
  window.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('scroll', schedule)
  return {register, toggle, dismiss, stop() {
    dismiss(); cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown)
    document.removeEventListener('pointerdown', outside)
    window.removeEventListener('resize', schedule)
    window.visualViewport?.removeEventListener('resize', schedule)
    window.visualViewport?.removeEventListener('scroll', schedule)
    panel.remove(); backdrop.remove(); surfaces.clear()
  }}
}
