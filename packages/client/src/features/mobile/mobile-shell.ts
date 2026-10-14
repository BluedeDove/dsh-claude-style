import { SIDEBAR_SLOT_SELECTOR, SIDEBAR_ROW_SELECTOR, SHELL_FRAME_SELECTOR, SHELL_RIGHTBAR_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createStamp, setAttributeIfChanged } from '../../shared/dom'
import { subscribeMutations } from '../../core/bus'
import type { HostContext } from '../../core/host'

export function installMobileShell(ctx: HostContext) {
  const frameStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-frame')
  const sidebarStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-sidebar')
  const rightbarStamp = createStamp<HTMLElement>('data-dsh-claude-mobile-rightbar')
  const menu = document.createElement('button'), backdrop = document.createElement('button')
  menu.type = backdrop.type = 'button'
  menu.className = 'dsh-claude-mobile-menu'; menu.textContent = '☰'; menu.setAttribute('aria-label', '打开会话侧栏')
  backdrop.className = 'dsh-claude-mobile-backdrop'; backdrop.setAttribute('aria-label', '关闭会话侧栏')
  const media = matchMedia('(max-width:720px)')
  let stopFrame: (() => void) | null = null, stopCurrent: (() => void) | null = null
  function isOpen() {return document.body.hasAttribute('data-dsh-claude-mobile-sidebar-open')}
  function close() {if (isOpen()) ctx.get('layout')?.toggleSidebar()}
  menu.onclick = () => ctx.get('layout')?.toggleSidebar()
  backdrop.onclick = close
  function update() {
    const sidebar = document.querySelector<HTMLElement>(SIDEBAR_SLOT_SELECTOR)
    const frame = sidebar?.closest<HTMLElement>(SHELL_FRAME_SELECTOR) ?? null
    const column = sidebar?.parentElement ?? null
    if (!media.matches) {
      frameStamp.release(); sidebarStamp.release(); rightbarStamp.release()
      menu.remove(); backdrop.remove(); stopFrame?.(); stopFrame = null
      document.body.removeAttribute('data-dsh-claude-mobile-sidebar-open'); return
    }
    if (frameStamp.current() !== frame) {
      stopFrame?.(); stopFrame = null
      frameStamp.mark(frame)
      if (frame) stopFrame = subscribeMutations(frame, {attributeFilter:['data-sidebar-collapsed','data-rightbar-collapsed']}, update)
    }
    sidebarStamp.mark(column)
    rightbarStamp.mark(frame?.querySelector<HTMLElement>(SHELL_RIGHTBAR_SELECTOR) ?? null)
    if (!menu.isConnected) document.body.append(menu, backdrop)
    const open = frame !== null && !frame.hasAttribute('data-sidebar-collapsed')
    if (open) setAttributeIfChanged(document.body, 'data-dsh-claude-mobile-sidebar-open', '')
    else document.body.removeAttribute('data-dsh-claude-mobile-sidebar-open')
    menu.setAttribute('aria-expanded', String(open))
  }
  const onKey = (event: KeyboardEvent) => {
    if (!media.matches || !isOpen()) return
    if (event.key === 'Escape') {event.preventDefault(); close(); menu.focus(); return}
    if (event.key !== 'Tab') return
    const controls = [...(sidebarStamp.current()?.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex="0"]') ?? [])].filter(node => node.getClientRects().length && !node.hasAttribute('disabled'))
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus()}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus()}
  }
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null
    if (!target?.closest(SIDEBAR_SLOT_SELECTOR) || target.closest('button[aria-haspopup]')) return
    if (target.closest(SIDEBAR_ROW_SELECTOR)?.getAttribute('data-row-key')?.startsWith('session:')) setTimeout(close, 0)
  }
  document.addEventListener('keydown', onKey); document.addEventListener('click', onClick)
  media.addEventListener('change', update)
  const fiber = ctx.inject?.(['uiSession'], scope => {stopCurrent = scope.get('uiSession').current.subscribe(close)})
  return {
    sync: update,
    stop() {
      stopFrame?.(); stopCurrent?.(); fiber?.dispose(); media.removeEventListener('change', update)
      document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick)
      menu.remove(); backdrop.remove(); frameStamp.release(); sidebarStamp.release(); rightbarStamp.release()
      document.body.removeAttribute('data-dsh-claude-mobile-sidebar-open')
    },
  }
}
