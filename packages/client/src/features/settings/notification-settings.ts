import React from 'react'
import { notificationError, notificationFailure, readNotificationPrefs, subscribeNotifications, writeNotificationPrefs } from '../notifications/preferences'
import type { NotificationPrefs } from '../notifications/preferences'
import { authorizeNotifications, playNotificationSound, showSystemReminder, systemNotificationsAvailable, unlockNotificationAudio } from '../notifications/delivery'

export function NotificationSettings() {
  const [prefs, setPrefs] = React.useState(readNotificationPrefs), [error, setError] = React.useState(notificationError), [busy, setBusy] = React.useState(false)
  React.useEffect(() => subscribeNotifications(() => {setPrefs({...readNotificationPrefs()}); setError(notificationError)}), [])
  const rows: [keyof NotificationPrefs, string][] = [
    ['enabled', '启用提醒 / Enable reminders'], ['complete', '任务结束 / Task finished'], ['pending', '等待确认 / Input needed'],
    ['title', '浏览器标题 / Browser title'], ['sound', '提示声音 / Sound'], ['system', '系统通知 / System notifications'],
  ]
  async function authorize() {
    setBusy(true)
    try {await authorizeNotifications(); writeNotificationPrefs({enabled: true, system: true})}
    catch (failure) {notificationFailure(failure)}
    finally {setBusy(false)}
  }
  async function test() {
    setBusy(true); unlockNotificationAudio(); playNotificationSound()
    try {
      if (prefs.system) await showSystemReminder('DSH · 提醒测试 / Reminder test', '提醒已就绪 / Reminders are ready')
      setError('测试已触发 / Test triggered')
    } catch (failure) {notificationFailure(failure)}
    finally {setBusy(false)}
  }
  return React.createElement('section', {className: 'dsh-claude-settings-notifications', 'aria-label': '提醒 / Reminders'},
    React.createElement('h3', null, '提醒 / Reminders'),
    React.createElement('p', null, '仅在当前浏览器保存；正在观看的对话与后台子代理保持安静。/ Saved on this device; visible conversations and background subagents stay quiet.'),
    rows.map(([key, label]) => React.createElement('label', {key, className: 'dsh-claude-settings-device-row'},
      React.createElement('span', null, label), React.createElement('input', {type: 'checkbox', checked: prefs[key], disabled: key === 'system',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {writeNotificationPrefs({[key]: event.target.checked}); if (key === 'sound') unlockNotificationAudio()}}))),
    React.createElement('button', {type: 'button', disabled: busy || !systemNotificationsAvailable(), onClick: authorize}, '允许系统通知 / Allow system notifications'),
    React.createElement('button', {type: 'button', disabled: busy, onClick: test}, '测试提醒 / Test reminder'),
    prefs.system ? React.createElement('button', {type: 'button', onClick: () => writeNotificationPrefs({system: false})}, '关闭系统通知 / Disable system notifications') : null,
    !systemNotificationsAvailable() ? React.createElement('p', null, '此地址不支持系统通知，标题与声音仍可使用；系统通知需要 HTTPS。/ System notifications require HTTPS; title and sound remain available.') : null,
    error ? React.createElement('p', {role: 'status'}, error) : null)
}
