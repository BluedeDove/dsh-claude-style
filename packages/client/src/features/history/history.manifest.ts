import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'history', order: 15,
  ungated: 'Bounded history pages and reversible sidebar filtering keep the catalog usable.',
  contracts: ['sidebar.root', 'sidebar.row', 'sidebar.label', 'chat.flow-block', 'chat.streaming', 'chat.running'],
  stylesheets: [{file: 'history.css', rank: 995}],
  cases: [],
  description: {
    zh: {title: '历史加载与侧栏范围', text: '历史按小批次加载，跳转到指定轮次保留完整目标窗口。侧栏支持最近 7、30、90 天及全部会话，当前、固定、运行中和待处理会话始终可见。'},
    en: {title: 'History pages and sidebar range', text: 'History loads in bounded pages while explicit turn jumps keep their target window. The sidebar offers 7, 30, 90 days or all conversations, preserving current, pinned, running and pending sessions.'},
  },
} satisfies FeatureManifest
