export const TODAY_NO_BABY_ENTRY_URL = '/pages/baby/index'

export function shouldLoadTodayBabyData(babyId) {
  return Boolean(babyId)
}

export function buildNoBabyEmptyState() {
  return {
    title: '暂无宝宝',
    description: '添加宝宝后开始记录护理。',
    actionText: '去添加宝宝',
    actionUrl: TODAY_NO_BABY_ENTRY_URL
  }
}
