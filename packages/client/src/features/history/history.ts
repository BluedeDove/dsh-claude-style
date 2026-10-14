import { SIDEBAR_SLOT_SELECTOR, SIDEBAR_LABEL_SELECTOR, SIDEBAR_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostContext, HostValue } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './history.manifest'

interface PageRequest {
  maxMessages?: number
  turnWindow?: {minMessages?: number, minTurns?: number}
  [key: string]: unknown
}

/** Explicit jumps preserve the larger window the host requests around their target. */
function bounded(request: PageRequest) {
  return {...request, maxMessages: Math.min(request.maxMessages ?? 120, 120),
    turnWindow: {minMessages: Math.min(request.turnWindow?.minMessages ?? 12, 12),
      minTurns: Math.min(request.turnWindow?.minTurns ?? 2, 2)}}
}

export function install(ctx: HostContext, _ui: FeatureUi<typeof manifest>) {
  const fiber = ctx.inject?.(['remote.session', 'sessions', 'workspaces', 'uiSession'], scope => {
    scope.effect(() => {
      const remote = scope.get('remote.session')
      const sessions = scope.get('sessions'), workspaces = scope.get('workspaces'), uiSession = scope.get('uiSession')
      if (!remote || typeof remote.follow !== 'function' || typeof remote.page !== 'function'
        || !sessions?.list || !workspaces?.list || !uiSession?.sessionStatus) return () => {}
      const followDescriptor = Object.getOwnPropertyDescriptor(remote, 'follow')
      const pageDescriptor = Object.getOwnPropertyDescriptor(remote, 'page')
      const follow = remote.follow, page = remote.page
      const lazyFollow = (request: PageRequest, signal?: AbortSignal) => follow.call(remote, bounded(request), signal)
      const lazyPage = (request: PageRequest, signal?: AbortSignal) => page.call(remote,
        (request.turnWindow?.minMessages ?? 0) > 50 ? request : bounded(request), signal)
      Object.defineProperty(remote, 'follow', {configurable: true, enumerable: true, value: lazyFollow})
      Object.defineProperty(remote, 'page', {configurable: true, enumerable: true, value: lazyPage})
      document.body.setAttribute('data-dsh-claude-lazy', 'true')
      let bar: HTMLElement | null = null, sidebar: HTMLElement | null = null
      let timer: ReturnType<typeof setTimeout> | null = null
      let disposed = false, dataDirty = true
      let hidden = new Set<string>(), hiddenGroups = new Set<string>()
      let days = Number(localStorage.getItem('dsh-claude-style.history-days') ?? 30)
      if (![0, 7, 30, 90].includes(days)) days = 30

      function rebuild() {
        const list = sessions.list.getSnapshot(), ws = workspaces.list.getSnapshot()
        if (list.phase !== 'ready') return
        dataDirty = false
        const pinned = new Set<string>(ws.pinnedSessionIds ?? [])
        const current = uiSession.current?.value?.key
        const cut = Date.now() - days * 86400000
        const status = uiSession.sessionStatus.getSnapshot()
        for (const id of list.ids) {
          let row = list.byId[id]
          if (!row?.running) continue
          const seen = new Set<string>()
          while (row?.parentId && !seen.has(row.parentId)) {
            seen.add(row.parentId); pinned.add(row.parentId); row = list.byId[row.parentId]
          }
        }
        hidden = new Set()
        const groups = new Map<string, {total: number, hidden: number}>()
        for (const id of list.ids) {
          const row = list.byId[id], state = status.get(id)
          if (!row) continue
          if (days > 0 && !row.blank && !row.running && !pinned.has(id) && id !== current
            && !state?.completionUnread && !state?.pendingInteraction && row.updatedAt < cut) hidden.add(id)
          if (row.cwd && row.origin !== 'subagent') {
            const group = groups.get(row.cwd) ?? {total: 0, hidden: 0}
            group.total++; if (hidden.has(id)) group.hidden++
            groups.set(row.cwd, group)
          }
        }
        hiddenGroups = new Set((ws.items ?? []).filter((item: HostValue) => {
          const group = groups.get(item.path)
          return group && group.total > 0 && group.total === group.hidden
        }).map((item: HostValue) => `workspace:${item.workspaceId ?? item.id}`))
      }

      const observer = new MutationObserver(records => {
        if (records.some(record => !bar?.contains(record.target))) schedule()
      })
      function sync() {
        timer = null
        if (disposed || document.hidden) return
        const next = document.querySelector<HTMLElement>(SIDEBAR_SLOT_SELECTOR)
        if (next !== sidebar || !sidebar?.isConnected) {
          observer.disconnect(); sidebar = next; bar?.remove(); bar = null
          if (sidebar) observer.observe(sidebar, {childList: true, subtree: true})
        }
        if (!sidebar) return
        if (dataDirty) rebuild()
        const label = sidebar.querySelector(SIDEBAR_LABEL_SELECTOR)
        if (label?.parentElement && !bar?.isConnected) {
          bar = document.createElement('div'); bar.className = 'dsh-claude-history-filter'
          const select = document.createElement('select')
          select.setAttribute('aria-label', '侧栏会话时间范围')
          for (const [value, text] of [[7, '最近 7 天'], [30, '最近 30 天'], [90, '最近 90 天'], [0, '全部会话']] as const) {
            const option = document.createElement('option'); option.value = String(value); option.textContent = text; select.append(option)
          }
          select.value = String(days)
          select.onchange = () => {days = Number(select.value); localStorage.setItem('dsh-claude-style.history-days', String(days)); invalidate()}
          bar.append(select, document.createElement('span'))
          label.parentElement.insertAdjacentElement('afterend', bar)
        }
        const count = bar?.querySelector('span'), text = hidden.size ? `已隐藏 ${hidden.size}` : '全部可见'
        if (count && count.textContent !== text) count.textContent = text
        for (const row of sidebar.querySelectorAll(SIDEBAR_ROW_SELECTOR)) {
          const key = row.getAttribute('data-row-key') ?? ''
          const hide = key.startsWith('session:') ? hidden.has(key.slice(8)) : hiddenGroups.has(key)
          if (row.hasAttribute('data-dsh-claude-old') === hide) continue
          if (hide) row.setAttribute('data-dsh-claude-old', 'true')
          else row.removeAttribute('data-dsh-claude-old')
        }
      }
      function schedule() {
        if (!disposed && timer === null && !document.hidden) timer = setTimeout(sync, 80)
      }
      function invalidate() {dataDirty = true; schedule()}
      const rootObserver = new MutationObserver(() => {if (!sidebar?.isConnected) schedule()})
      rootObserver.observe(document.body, {childList: true, subtree: true})
      const stops = [sessions.list.subscribe(invalidate), workspaces.list.subscribe(invalidate),
        uiSession.sessionStatus.subscribe(invalidate), uiSession.current.subscribe?.(invalidate)].filter(Boolean) as (() => void)[]
      document.addEventListener('visibilitychange', invalidate)
      const ageTimer = setInterval(invalidate, 60000)
      schedule()
      return () => {
        disposed = true
        if (timer !== null) clearTimeout(timer)
        clearInterval(ageTimer); rootObserver.disconnect(); observer.disconnect()
        stops.forEach(stop => stop()); document.removeEventListener('visibilitychange', invalidate)
        bar?.remove(); document.body.removeAttribute('data-dsh-claude-lazy')
        document.querySelectorAll('[data-dsh-claude-old]').forEach(row => row.removeAttribute('data-dsh-claude-old'))
        if (remote.follow === lazyFollow) {
          if (followDescriptor) Object.defineProperty(remote, 'follow', followDescriptor)
          else delete remote.follow
        }
        if (remote.page === lazyPage) {
          if (pageDescriptor) Object.defineProperty(remote, 'page', pageDescriptor)
          else delete remote.page
        }
      }
    }, 'history: bounded pages and cached sidebar range')
  })
  return () => fiber?.dispose()
}
