export interface NotificationPrefs {
  enabled: boolean
  complete: boolean
  pending: boolean
  title: boolean
  sound: boolean
  system: boolean
}
export const NOTIFICATION_PREFS_KEY = 'dsh-claude-notifications-v1'
const defaults: NotificationPrefs = {enabled: true, complete: true, pending: true, title: true, sound: false, system: false}
const listeners = new Set<() => void>()
let prefs: NotificationPrefs | undefined
export let notificationError = ''

export function readNotificationPrefs(): NotificationPrefs {
  if (prefs) return prefs
  prefs = {...defaults}
  // Browser storage is optional; a denied or malformed store is reported (D1000).
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) ?? '{}')
    for (const key of Object.keys(defaults) as (keyof NotificationPrefs)[]) {
      if (typeof value?.[key] === 'boolean') prefs[key] = value[key]
    }
  } catch (error) {notificationFailure(error)}
  return prefs
}
export function notificationFailure(error: unknown) {
  notificationError = error instanceof Error ? error.message : String(error)
  console.warn('[dsh-claude-style] notification:', notificationError)
  for (const listener of listeners) listener()
}
export function writeNotificationPrefs(patch: Partial<NotificationPrefs>) {
  prefs = {...readNotificationPrefs(), ...patch}
  notificationError = ''
  try {localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))}
  catch (error) {notificationFailure(error)}
  for (const listener of listeners) listener()
}
export function subscribeNotifications(listener: () => void) {
  listeners.add(listener)
  return () => {listeners.delete(listener)}
}
export function syncNotificationStorage(event: StorageEvent) {
  if (event.key !== NOTIFICATION_PREFS_KEY) return
  prefs = undefined
  readNotificationPrefs()
  for (const listener of listeners) listener()
}
