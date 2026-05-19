import { getTodayReminderInstances } from '../api/reminder'
import { buildCareTypeSummaries, getCareTypeMeta } from '../constants/careTypeMeta'
import { sanitizeVisibleText } from './textSanitizer'

const statusLabels = {
  PENDING: '待提醒',
  SNOOZED: '稍后提醒',
  RECORDED: '已记录',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const pendingReminderRecordStorageKey = 'BC_PENDING_REMINDER_RECORD_CONTEXT'

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
  const meta = getCareTypeMeta(raw.careType)
  return {
    reminderInstanceId: raw.reminderInstanceId,
    babyId: raw.babyId,
    planTemplateId: raw.planTemplateId,
    templateName: sanitizeVisibleText(raw.templateName || raw.title || '提醒'),
    careType: raw.careType,
    careTypeLabel: raw.careTypeLabel || meta.label,
    careTypeMeta: meta,
    recordType: raw.recordType || meta.recordType,
    quickActionText: meta.quickActionText,
    reminderTime: raw.reminderTime || '',
    scheduledTime: raw.scheduledTime || raw.dueAt || '',
    dueAt: raw.dueAt || '',
    urgency: raw.urgency || 'upcoming',
    displayTime: raw.displayTime || formatTime(raw.scheduledTime || raw.dueAt || raw.reminderTime),
    enabled: raw.enabled,
    status,
    statusLabel: raw.statusLabel || raw.todayStatusLabel || statusLabels[status] || status,
    todayStatus: raw.todayStatus || status,
    todayStatusLabel: raw.todayStatusLabel || statusLabels[raw.todayStatus] || statusLabels[status] || status,
    defaultRecordContext: raw.defaultRecordContext || '',
    remark: sanitizeVisibleText(raw.remark || raw.templateName || raw.title || '提醒')
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
  return fetchTodayReminders(babyId)
}

export async function fetchTodayReminders(babyId) {
  if (!babyId) {
    return []
  }
  const response = await getTodayReminderInstances(babyId)
  return toReminderList(response)
}

export function savePendingReminderForRecord(reminder) {
  if (!reminder || !reminder.reminderInstanceId) {
    return
  }
  uni.setStorageSync(pendingReminderRecordStorageKey, {
    reminderInstanceId: reminder.reminderInstanceId,
    babyId: reminder.babyId,
    planTemplateId: reminder.planTemplateId,
    careType: reminder.careType,
    recordType: reminder.recordType,
    title: reminder.templateName,
    defaultRecordContext: reminder.defaultRecordContext || ''
  })
}

export function consumePendingReminderForRecord() {
  const value = uni.getStorageSync(pendingReminderRecordStorageKey)
  uni.removeStorageSync(pendingReminderRecordStorageKey)
  return value || null
}

export function buildReminderTypeSummaries(reminders) {
  return buildCareTypeSummaries(reminders)
}
