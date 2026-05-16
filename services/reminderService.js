import { sanitizeVisibleText } from './textSanitizer'

const statusLabels = {
  PENDING: '待提醒',
  SENT: '已发送',
  DONE: '已完成',
  SNOOZED: '稍后提醒',
  FAILED: '发送失败',
  CANCELED: '已取消'
}

const careTypeLabels = {
  FEEDING: '喂养',
  SLEEP: '睡眠',
  BASIC_CARE: '基础护理',
  INTERACTION: '运动与认知'
}

function formatTime(value) {
  if (!value) {
    return '--:--'
  }
  const text = String(value)
  if (text.includes(' ')) {
    return text.split(' ')[1].slice(0, 5)
  }
  return text.slice(0, 5)
}

export function toReminderViewModel(raw) {
  if (!raw) {
    return null
  }
  const status = raw.status || raw.todayStatus || 'PENDING'
  return {
    reminderInstanceId: raw.reminderInstanceId,
    babyId: raw.babyId,
    planTemplateId: raw.planTemplateId,
    templateName: sanitizeVisibleText(raw.templateName || '提醒'),
    careType: raw.careType,
    careTypeLabel: raw.careTypeLabel || careTypeLabels[raw.careType] || '提醒',
    reminderTime: raw.reminderTime || '',
    scheduledTime: raw.scheduledTime || '',
    displayTime: formatTime(raw.scheduledTime || raw.reminderTime),
    enabled: raw.enabled,
    status,
    statusLabel: raw.statusLabel || raw.todayStatusLabel || statusLabels[status] || status,
    todayStatus: raw.todayStatus || status,
    todayStatusLabel: raw.todayStatusLabel || statusLabels[raw.todayStatus] || statusLabels[status] || status,
    remark: sanitizeVisibleText(raw.remark || raw.templateName || '提醒')
  }
}

function toReminderList(response) {
  return (Array.isArray(response.data) ? response.data : [])
    .map(toReminderViewModel)
    .filter(Boolean)
}

export async function fetchReminderList(babyId) {
  if (!babyId) {
    return []
  }
  return []
}

export async function fetchTodayReminders(babyId) {
  if (!babyId) {
    return []
  }
  return []
}

export function buildReminderTypeSummaries(reminders) {
  return Object.keys(careTypeLabels).map((careType) => {
    const items = (Array.isArray(reminders) ? reminders : []).filter((item) => item.careType === careType)
    return {
      careType,
      label: careTypeLabels[careType],
      countText: items.length ? `${items.length}个提醒` : '暂无提醒'
    }
  })
}
