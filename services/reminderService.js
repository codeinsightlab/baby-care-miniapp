import { getTodayReminderInstances } from '../api/reminder'
import { buildCareTypeSummaries, getCareTypeMeta } from '../constants/careTypeMeta'
import { sanitizeVisibleText } from './textSanitizer'

export const REMINDER_QUERY_WINDOWS = {
  TODAY_PENDING_OVERDUE_WINDOW_MINUTES: 60
}

export const DEFAULT_REMINDER_STATUSES = ['PENDING', 'SNOOZED']

const statusLabels = {
  PENDING: '待提醒',
  SNOOZED: '稍后提醒',
  RECORDED: '已记录',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const pendingReminderRecordStorageKey = 'BC_PENDING_REMINDER_RECORD_CONTEXT'

function toTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function normalizeDateTime(value) {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  const text = String(value).trim()
  if (!text) {
    return null
  }

  const withSecond = text.includes(' ') ? `${text.replace(' ', 'T')}` : text.includes('T') ? text : `${text}:00`
  const dateTime = new Date(withSecond)
  if (!Number.isNaN(dateTime.getTime())) {
    return dateTime
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
    const [hour, minute, second] = text.split(':')
    const base = new Date()
    base.setHours(Number(hour), Number(minute), Number(second || 0), 0)
    return base
  }

  return null
}

function formatDateTime(value) {
  const date = normalizeDateTime(value)
  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = toTwoDigits(date.getMonth() + 1)
  const day = toTwoDigits(date.getDate())
  const hour = toTwoDigits(date.getHours())
  const minute = toTwoDigits(date.getMinutes())
  const second = toTwoDigits(date.getSeconds())
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function startOfToday(date = new Date()) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfToday(date = new Date()) {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function addMinutes(value, minutes) {
  const result = new Date(value)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

function toArray(value) {
  if (!value) {
    return null
  }
  return Array.isArray(value) ? value : [value]
}

function hasMatchStatus(item, statusFilter) {
  const allowed = toArray(statusFilter)
  if (!allowed || allowed.length === 0) {
    return true
  }
  return allowed.includes(item && item.status)
}

function toQueryWindow(startTime, endTime, status = DEFAULT_REMINDER_STATUSES, sort = 'dueAt_asc', limit) {
  return {
    startTime,
    endTime,
    status,
    sort,
    limit: limit || null
  }
}

function getReminderDueTime(item) {
  const date = normalizeDateTime(item && item.dueAt) || normalizeDateTime(item && item.scheduledTime)
  return date
}

function inWindow(item, query) {
  const dueAt = getReminderDueTime(item)
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return true
  }

  if (query.startTime) {
    const start = normalizeDateTime(query.startTime)
    if (start && dueAt.getTime() < start.getTime()) {
      return false
    }
  }

  if (query.endTime) {
    const end = normalizeDateTime(query.endTime)
    if (end && dueAt.getTime() > end.getTime()) {
      return false
    }
  }

  return hasMatchStatus(item, query.status)
}

function sortByQuery(list, query) {
  const sortMode = String(query.sort || '').toLowerCase()
  if (sortMode === 'dueat_desc') {
    return list.sort((left, right) => {
      const leftTime = getReminderDueTime(left)
      const rightTime = getReminderDueTime(right)
      const leftValue = leftTime ? leftTime.getTime() : 0
      const rightValue = rightTime ? rightTime.getTime() : 0
      return rightValue - leftValue
    })
  }
  return list.sort((left, right) => {
    const leftTime = getReminderDueTime(left)
    const rightTime = getReminderDueTime(right)
    const leftValue = leftTime ? leftTime.getTime() : 0
    const rightValue = rightTime ? rightTime.getTime() : 0
    return leftValue - rightValue
  })
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

function applyQuery(viewModels, query = {}) {
  let list = [...viewModels]
  list = list.filter((item) => inWindow(item, query))
  list = sortByQuery(list, query)
  if (query.limit && query.limit > 0) {
    list = list.slice(0, query.limit)
  }
  return list
}

function normalizeQuery(query = {}) {
  const status = toArray(query.status) || DEFAULT_REMINDER_STATUSES
  return {
    startTime: query.startTime || null,
    endTime: query.endTime || null,
    status,
    sort: query.sort || 'dueAt_asc',
    limit: query.limit || null
  }
}

export function buildTodayPendingWindow(now = new Date()) {
  const nowTime = normalizeDateTime(now) || new Date()
  const start = addMinutes(nowTime, -REMINDER_QUERY_WINDOWS.TODAY_PENDING_OVERDUE_WINDOW_MINUTES)
  const end = endOfToday(nowTime)
  return {
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    status: [...DEFAULT_REMINDER_STATUSES],
    sort: 'dueAt_asc'
  }
}

export function buildReminderQueueWindow(now = new Date()) {
  const nowTime = normalizeDateTime(now) || new Date()
  return {
    startTime: formatDateTime(startOfToday(nowTime)),
    endTime: formatDateTime(nowTime),
    status: [...DEFAULT_REMINDER_STATUSES],
    sort: 'dueAt_asc'
  }
}

export async function queryReminderInstances(babyId, query = {}) {
  if (!babyId) {
    return []
  }
  const normalizedQuery = normalizeQuery(query)
  const response = await getTodayReminderInstances(babyId, normalizedQuery)
  return applyQuery(toReminderList(response), normalizedQuery)
}

export async function fetchReminderList(babyId) {
  if (!babyId) {
    return []
  }
  const query = buildReminderQueueWindow()
  return queryReminderInstances(babyId, query)
}

export async function fetchTodayReminders(babyId) {
  const query = buildTodayPendingWindow()
  return queryReminderInstances(babyId, query)
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
