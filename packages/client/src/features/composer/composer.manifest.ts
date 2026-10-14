import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'composer',
  order: 20,
  contracts: ['chat.scroller', 'composer.dialog-trigger', 'composer.input', 'composer.mobile-stats', 'composer.placeholder', 'composer.seat', 'composer.stack', 'composer.variant', 'shell.phase', 'composer.tools', 'composer.trailing', 'composer.standard', 'composer.dock'],
  pref: 'composerScope',
  stylesheets: [
    { file: 'card.css', rank: 80, gate: true },
    { file: 'inline.css', rank: 90, gate: true },
    { file: 'inline-bar.css', rank: 100, gate: true },
    { file: 'comfortable.css', rank: 105, gate: true },
  ],
  cases: ['composer', 'sync-fault'],
  description: {
    zh: {
      title: '输入区',
      text: '新会话页与对话页使用输入卡片：桌面输入区留出多行空间，设置栏按宽度换行，上下文统计在独立区域。附件排成缩略图，点卡片空白处可以输入，卡片变高时停在底部的对话跟着上移。设置页「输入区」可以选只改新会话页、只改对话页、两处都改或关闭。',
    },
    en: {
      title: 'Composer',
      text: 'Desktop input cards provide multiline space, a wrapping settings toolbar and a separate context statistics area. Attachments appear as thumbnails, pressing the blank card focuses the editor, and conversations resting at the bottom follow card growth. The Composer tab chooses the home page alone, the conversation alone, both, or neither.',
    },
  },
} satisfies FeatureManifest
