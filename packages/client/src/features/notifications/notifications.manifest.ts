import type { FeatureManifest } from '../../core/feature'
export default {
  id: 'notifications', order: 17,
  ungated: 'Device notification preferences own the live-status subscription and can stop it completely.',
  contracts: [], stylesheets: [], cases: ['settings'],
  description: {
    zh: {title: '轻量提醒', text: '任务结束和等待确认时可通过标题、声音与系统通知提醒；当前可见对话保持安静，后台子代理不会重复提醒。通知按设备设置，点击系统通知返回对应对话，停用后解除状态订阅。'},
    en: {title: 'Lightweight reminders', text: 'Task completion and requests for input can notify through the title, sound and system notifications. Visible conversations stay quiet and background subagents do not repeat alerts. Preferences belong to each device; clicking a system notification opens its conversation. Disabling reminders removes live-status subscriptions.'},
  },
} satisfies FeatureManifest
