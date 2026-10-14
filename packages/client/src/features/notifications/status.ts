import type { HostSessionStatusSnapshot } from '@dsh-claude-style/contracts/services'

interface Status {running: boolean, pending: string, unread: boolean}
export interface Reminder {id: string, kind: 'pending' | 'complete', key: string, deliveryKey?: string}
/** Only small live-status facts are retained; no chat projection is opened. */
export function statusTransitions(snapshot: HostSessionStatusSnapshot, previous: Map<string, Status> | undefined) {
  const next = new Map<string, Status>(), reminders: Reminder[] = []
  for (const [id, value] of snapshot) {
    const interaction = value.pendingInteraction as {key?: string, kind?: string} | string | undefined
    const pending = typeof interaction === 'string' ? interaction : interaction?.key ?? interaction?.kind ?? ''
    const state = {running: value.running === true, pending, unread: value.completionUnread === true}
    next.set(id, state)
    const before = previous?.get(id)
    if (!previous) continue
    if (pending && before?.pending !== pending) reminders.push({id, kind: 'pending', key: pending})
    else if (before && !pending && !state.running && (before.running || (state.unread && !before.unread))) {
      reminders.push({id, kind: 'complete', key: 'complete'})
    }
  }
  return {next, reminders}
}
