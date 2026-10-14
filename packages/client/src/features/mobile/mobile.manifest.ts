import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'mobile', order: 1000,
  load: 'deferred',
  ungated: 'The phone layout follows viewport width and restores the desktop automatically.',
  contracts: ['composer.card', 'composer.tools', 'composer.trailing', 'composer.dock', 'composer.modes', 'composer.stats', 'composer.scroll',
    'composer.input', 'composer.seat', 'composer.mobile-stats', 'header.row', 'header.title', 'header.utilities', 'header.corner', 'header.cluster', 'header.actions', 'sidebar.root', 'sidebar.row', 'shell.frame', 'shell.rightbar'],
  stylesheets: [{file: 'mobile.css', rank: 1000}],
  cases: ['composer'],
  description: {
    zh: {title: '手机界面', text: '窄屏使用紧凑顶栏、大触控按钮和独立统计栏，权限与输入法等工具按需展开。输入框保持完整空间，键盘弹出后适应可视视口，桌面自动恢复原有布局。'},
    en: {title: 'Phone interface', text: 'Narrow viewports get a compact header, larger touch targets, separate statistics and expandable tools. The composer keeps its own space and follows the visual viewport when the keyboard opens. Wide viewports restore the desktop layout.'},
  },
} satisfies FeatureManifest
