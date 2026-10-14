import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'mobile', order: 1000,
  load: 'deferred',
  ungated: 'The phone layout follows viewport width and restores the desktop automatically.',
  contracts: ['composer.card', 'composer.tools', 'composer.trailing', 'composer.standard', 'composer.goal', 'composer.dock', 'composer.modes', 'composer.stats', 'composer.scroll', 'header.view-tabs', 'header.leading',
    'composer.input', 'composer.seat', 'composer.mobile-stats', 'header.row', 'header.title', 'header.utilities', 'header.corner', 'header.cluster', 'header.actions', 'sidebar.root', 'sidebar.row', 'shell.frame', 'shell.rightbar', 'shell.phase'],
  stylesheets: [{file: 'mobile.css', rank: 1000}],
  cases: ['composer'],
  description: {
    zh: {title: '手机界面', text: '窄屏保留一行顶栏和一条紧凑输入栏，模型、权限、输入法、统计与目标操作收入「工具」浮窗，会话操作收入「更多」浮窗。点外侧或关闭按钮收起，浮窗限制在可视屏幕内。阅读时为聊天内容保留空间，键盘弹出后适应可视视口，桌面自动恢复原有布局。'},
    en: {title: 'Phone interface', text: 'Phones keep a one-row header and a compact input bar. Model, permission, input, statistics and goal controls open in Tools; conversation actions open in More. Dismiss outside or with the close button. Windows stay within the visual viewport, preserving space for chat and following keyboard changes. Wide viewports restore the desktop layout.'},
  },
} satisfies FeatureManifest
