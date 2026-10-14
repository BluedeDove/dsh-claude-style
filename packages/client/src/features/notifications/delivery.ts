import { NOTIFICATION_WORKER_PATH, NOTIFICATION_SCOPE } from '@dsh-claude-style/contracts/routes'
import { notificationFailure, readNotificationPrefs } from './preferences'

let registration: Promise<ServiceWorkerRegistration> | undefined
let audio: AudioContext | undefined
export const systemNotificationsAvailable = () => isSecureContext && 'Notification' in window && 'serviceWorker' in navigator
export async function notificationWorker() {
  if (!systemNotificationsAvailable()) throw new Error('系统提醒需要 HTTPS 与浏览器通知支持 / System notifications require HTTPS and browser support.')
  if (!registration) registration = navigator.serviceWorker.register(NOTIFICATION_WORKER_PATH, {scope: NOTIFICATION_SCOPE, updateViaCache: 'none'}).then(async value => {
    if (value.active) return value
    const worker = value.installing ?? value.waiting
    if (!worker) throw new Error('Notification worker is unavailable')
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {worker.removeEventListener('statechange', changed); reject(new Error('Notification worker activation timed out'))}, 10000)
      const changed = () => {
        if (worker.state !== 'activated' && worker.state !== 'redundant') return
        clearTimeout(timer); worker.removeEventListener('statechange', changed)
        if (worker.state === 'activated') resolve(); else reject(new Error('Notification worker was replaced before activation'))
      }
      worker.addEventListener('statechange', changed); changed()
    })
    return value
  }).catch(error => {registration = undefined; throw error})
  return registration
}
export async function authorizeNotifications() {
  if (!systemNotificationsAvailable()) throw new Error('系统提醒需要 HTTPS 与浏览器通知支持 / System notifications require HTTPS and browser support.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('浏览器尚未允许通知 / The browser has not allowed notifications.')
  await notificationWorker()
}
export function unlockNotificationAudio() {
  if (!readNotificationPrefs().enabled || !readNotificationPrefs().sound || !('AudioContext' in window)) return
  audio ??= new AudioContext()
  audio.resume().catch(notificationFailure)
}
export function playNotificationSound() {
  if (!audio || audio.state !== 'running') return
  const oscillator = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime
  oscillator.frequency.value = 740
  gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.045, at + 0.015); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.2)
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(at); oscillator.stop(at + 0.22)
  oscillator.onended = () => {oscillator.disconnect(); gain.disconnect()}
}
export async function showSystemReminder(title: string, body: string, id?: string, canShow = () => true, reminderKey = `test:${Date.now()}`) {
  if (!canShow()) return
  const worker = await notificationWorker()
  if (!canShow() || id !== undefined && (!readNotificationPrefs().enabled || !readNotificationPrefs().system)) return
  // Chromium exposes renotify even though lib.dom omits this notification option.
  const options: NotificationOptions & {renotify: boolean} = {body, tag: `dsh-claude:${id ?? 'test'}:${encodeURIComponent(reminderKey)}`, data: {sessionId: id, reminderKey}, renotify: true, silent: !readNotificationPrefs().sound}
  await worker.showNotification(title, options)
}
export async function closeSystemReminder(id?: string, canClose: (item: Notification) => boolean = () => true) {
  if (!registration) return
  const worker = await registration
  for (const item of await worker.getNotifications()) if (canClose(item) && (id === undefined || item.data?.sessionId === id)) item.close()
}
export function disposeNotificationAudio() {
  audio?.close().catch(notificationFailure)
  audio = undefined
}

/** Claims are serialized across tabs, expire quickly, and retain at most 64 ids. */
export async function claimReminder(key: string) {
  const claim = () => {
    try {
      const name = 'dsh-claude-notification-claims-v1'
      const saved: Record<string, number> = JSON.parse(localStorage.getItem(name) ?? '{}')
      const now = Date.now(), previous = saved[key]
      if (typeof previous === 'number' && now - previous < 2000) return false
      const entries = Object.entries(saved).filter(([,time]) => typeof time === 'number' && now - time < 10000).slice(-63)
      localStorage.setItem(name, JSON.stringify(Object.fromEntries([...entries, [key, now]])))
      return true
    } catch (error) {notificationFailure(error); return true}
  }
  return navigator.locks ? navigator.locks.request('dsh-claude-reminder', claim) : claim()
}
