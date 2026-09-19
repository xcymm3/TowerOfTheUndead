const zhCN = {
  'brand.title': '亡灵之塔',
  'brand.subtitle': '亡者经营录',
  'resource.souls': '游魂',
  'resource.production': '每秒产出',
  'resource.seals': '魂印',
  'resource.floors': '筑塔次数',
  'action.settings': '存档与设置',
  'panel.management': '高塔经营',
  'panel.army': '当前拥有的亡灵军团',
  'scene.title': '墓园前线',
  'scene.domain': '墓域 {count}',
  'scene.empty': '墓土之下，亡者静候召唤',
  'scene.emptyHint': '在军团面板召唤第一位骷髅兵',
  'scene.gathered': '{count} 个族群已集结',
  'scene.queue': '按数量显示代表队列',
  'roster.title': '军团名册',
  'roster.close': '关闭名册',
  'control.pause': 'Ⅱ 暂停动画',
  'control.resume': '▶ 继续动画',
  'control.roster': '♟ 军团展示',
  'loading.title': '唤醒高塔',
  'loading.initial': '正在载入高塔…',
  'loading.restore': '正在恢复军团与离线进度…',
  'loading.slow': '载入时间较长，请检查网络后重试。',
  'loading.retry': '重新载入',
  'error.runtime': '高塔暂时无法运行',
  'status.saved': '进度已保存',
  'status.local': '本地存档 · 自动保存',
  'status.waking': '正在唤醒',
  'action.save': '保存',
  'action.help': '玩法指南',
  'action.expand': '展开经营',
  'action.showArmy': '显示军团',
  'footer.motto': '白骨无言，高塔永存'
} as const

type MessageKey = keyof typeof zhCN

export function t(key: MessageKey, values: Record<string, string | number> = {}) {
  return zhCN[key].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
}
