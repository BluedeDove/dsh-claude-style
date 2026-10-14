import { currentSessionId } from '../../core/host'
import type { HostContext } from '../../core/host'
import type { HostSessionsService, HostUiSessionService } from '@dsh-claude-style/contracts/services'
import { NOTIFICATION_WORKER_PATH } from '@dsh-claude-style/contracts/routes'
import { statusTransitions } from './status'
import type { Reminder } from './status'
import { notificationFailure, readNotificationPrefs, subscribeNotifications, syncNotificationStorage } from './preferences'
import { claimReminder, closeSystemReminder, disposeNotificationAudio, playNotificationSound, showSystemReminder, systemNotificationsAvailable, unlockNotificationAudio } from './delivery'

export function install(ctx: HostContext) {
  let stopStatus: (() => void) | undefined, stopCurrent: (() => void) | undefined
  let observer: MutationObserver | undefined, alive = true, queued = false
  let previous: ReturnType<typeof statusTransitions>['next'] | undefined
  const reminders = new Map<string, Reminder>()
  let baseTitle = document.title
  const prefix = /^\[\d+ 项待查看 · DSH\] /u
  const fiber = ctx.inject?.(['uiSession', 'sessions', 'uiWorkspace'], scope => {
    let connected = true
    const ui = scope.get('uiSession') as HostUiSessionService | undefined
    const sessions = scope.get('sessions') as HostSessionsService | undefined
    const workspace = scope.get('uiWorkspace')
    if (!ui?.sessionStatus || !sessions || typeof workspace?.openSession !== 'function') return
    const selected = () => currentSessionId(scope, sessions)
    const viewing = (id: string) => selected() === id && document.visibilityState === 'visible' && document.hasFocus()
    function title() {
      if (!alive || !connected) return
      const currentBase = document.title.replace(prefix, '')
      if (currentBase !== baseTitle) baseTitle = currentBase
      const text = reminders.size && readNotificationPrefs().title ? `[${reminders.size} 项待查看 · DSH] ${baseTitle}` : baseTitle
      if (document.title !== text) {
        observer?.disconnect(); document.title = text
        observer?.observe(document.head, {childList: true, subtree: true, characterData: true})
      }
    }
    function acknowledge() {
      const id = selected()
      if (id && viewing(id) && reminders.delete(id)) closeSystemReminder(id, () => !reminders.has(id)).catch(notificationFailure)
      title()
    }
    async function deliver(item: Reminder) {
      const prefs = readNotificationPrefs()
      if (!alive || !connected || !prefs.enabled || viewing(item.id) || !(item.kind === 'pending' ? prefs.pending : prefs.complete)) return
      // Direct catalog lookup is performed only for a changed alert candidate.
      const row = sessions!.list.getSnapshot().byId[item.id]
      if (!row || (row.origin === 'subagent' && selected() !== item.id)) return
      const eventKey = item.kind === 'complete' ? `${item.key}:${row.updatedAt}` : item.key
      if (!await claimReminder(`${item.id}:${item.kind}:${eventKey}`) || !alive || !connected || !readNotificationPrefs().enabled || viewing(item.id)) return
      const latest = previous?.get(item.id)
      if (!latest || (item.kind === 'pending' ? latest.pending !== item.key : latest.running || !!latest.pending)) return
      item.deliveryKey = `${item.kind}:${eventKey}`
      reminders.delete(item.id); reminders.set(item.id, item)
      if (reminders.size > 64) reminders.delete(reminders.keys().next().value!)
      title()
      if (prefs.sound) playNotificationSound()
      if (prefs.system && systemNotificationsAvailable() && Notification.permission === 'granted') {
        // Each event owns its tag: asynchronously closing an older event cannot
        // close a replacement the browser has associated with the same tag.
        await closeSystemReminder(item.id, notification => notification.data?.reminderKey !== reminders.get(item.id)?.deliveryKey)
        await showSystemReminder(item.kind === 'pending' ? 'DSH · 需要确认 / Input needed' : 'DSH · 任务结束 / Task finished', row.displayTitle.slice(0, 160), item.id, () => alive && connected && !viewing(item.id) && reminders.get(item.id) === item, item.deliveryKey)
      }
    }
    function scan() {
      queued = false
      if (!alive || !connected || !readNotificationPrefs().enabled) return
      // Only the startup baseline waits for the catalog. Refreshing metadata
      // must not erase already observed running or pending transitions.
      if (!previous && sessions!.list.getSnapshot().phase !== 'ready') return
      const result = statusTransitions(ui!.sessionStatus!.getSnapshot(), previous)
      previous = result.next
      for (const [id, item] of reminders) {
        const state = previous.get(id)
        if (!state || state.running && !state.pending || item.kind === 'pending' && !state.pending) {reminders.delete(id); closeSystemReminder(id, () => !reminders.has(id)).catch(notificationFailure)}
      }
      for (const item of result.reminders) deliver(item).catch(notificationFailure)
      acknowledge()
    }
    function schedule() {
      if (queued) return
      queued = true
      queueMicrotask(scan)
    }
    function configure() {
      if (!readNotificationPrefs().system) closeSystemReminder(undefined, () => !readNotificationPrefs().system).catch(notificationFailure)
      if (readNotificationPrefs().enabled) {
        if (!stopStatus) {
          previous = undefined; scan()
          stopStatus = ui!.sessionStatus!.subscribe(schedule)
          stopCurrent = ui!.current?.subscribe?.(acknowledge)
          observer = new MutationObserver(title)
          observer.observe(document.head, {childList: true, subtree: true, characterData: true})
        }
        title()
      } else {
        stopStatus?.(); stopStatus = undefined; stopCurrent?.(); stopCurrent = undefined
        observer?.disconnect(); observer = undefined; previous = undefined; reminders.clear()
        title(); closeSystemReminder(undefined, () => !readNotificationPrefs().enabled).catch(notificationFailure)
        disposeNotificationAudio()
      }
    }
    function open(event: MessageEvent) {
      const worker = event.source as ServiceWorker | null
      if (!worker || !URL.canParse(worker.scriptURL) || new URL(worker.scriptURL).origin !== location.origin || new URL(worker.scriptURL).pathname !== NOTIFICATION_WORKER_PATH) return
      const id = event.data?.sessionId
      if (event.data?.type === 'dsh-claude-notification-open' && typeof id === 'string' && Object.hasOwn(sessions!.list.getSnapshot().byId, id)) workspace.openSession(id)
    }
    const offPrefs = subscribeNotifications(configure)
    window.addEventListener('focus', acknowledge)
    document.addEventListener('visibilitychange', acknowledge)
    navigator.serviceWorker?.addEventListener('message', open)
    configure()
    scope.effect(() => () => {
      connected = false
      stopStatus?.(); stopStatus = undefined; stopCurrent?.(); stopCurrent = undefined
      observer?.disconnect(); observer = undefined; previous = undefined; reminders.clear()
      if (document.title.match(prefix)) document.title = document.title.replace(prefix, '')
      offPrefs(); window.removeEventListener('focus', acknowledge); document.removeEventListener('visibilitychange', acknowledge)
      navigator.serviceWorker?.removeEventListener('message', open)
    }, 'dsh-claude-style: live reminders')
  })
  window.addEventListener('storage', syncNotificationStorage)
  document.addEventListener('pointerdown', unlockNotificationAudio, {passive: true})
  return () => {alive = false; fiber?.dispose(); window.removeEventListener('storage', syncNotificationStorage); document.removeEventListener('pointerdown', unlockNotificationAudio); disposeNotificationAudio()}
}
