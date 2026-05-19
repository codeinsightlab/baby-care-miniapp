import { createCareRecord, getCareRecordList, getTodayCareSummary } from '../api/careRecord'
import { sanitizeVisibleText } from './textSanitizer'

export const CARE_RECORD_TYPES = [
  { recordType: 'FEEDING', label: '喂奶', quickLabel: '记录喂奶', defaultRemark: '记录喂奶' },
  { recordType: 'SLEEP', label: '睡眠', quickLabel: '记录睡眠', defaultRemark: '记录睡眠' },
  { recordType: 'DIAPER', label: '换尿布', quickLabel: '记录换尿布', defaultRemark: '记录换尿布' },
  { recordType: 'BASIC_CARE', label: '护理', quickLabel: '记录护理', defaultRemark: '记录护理' },
  { recordType: 'INTERACTION', label: '互动', quickLabel: '记录互动', defaultRemark: '记录互动' }
]

const recordTypeLabels = CARE_RECORD_TYPES.reduce((result, item) => {
  result[item.recordType] = item.label
  return result
}, {
  INTERACTION: '互动'
})

function pad(number) {
  return number < 10 ? `0${number}` : `${number}`
}

export function getTodayDateString() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function getRecordTypeLabel(recordType) {
  return recordTypeLabels[recordType] || '护理记录'
}

function formatTime(value) {
  if (!value) {
    return '--:--'
  }
  const parts = String(value).split(' ')
  return parts[1] ? parts[1].slice(0, 5) : String(value).slice(11, 16)
}

export function toCareRecordViewModel(raw) {
  if (!raw) {
    return null
  }
  return {
    recordId: raw.recordId,
    familyId: raw.familyId,
    babyId: raw.babyId,
    userId: raw.userId,
    recordType: raw.recordType,
    recordTypeLabel: raw.recordTypeLabel || getRecordTypeLabel(raw.recordType),
    recordTime: raw.recordTime || '',
    displayTime: formatTime(raw.recordTime),
    remark: sanitizeVisibleText(raw.remark || ''),
    displayRemark: sanitizeVisibleText(raw.remark || '快速记录'),
    voiceRecordId: raw.voiceRecordId
  }
}

function toTypeCountMap(typeCounts) {
  return (Array.isArray(typeCounts) ? typeCounts : []).reduce((result, item) => {
    result[item.recordType] = Number(item.recordCount) || 0
    return result
  }, {})
}

export function toTodaySummaryViewModel(raw) {
  const summary = raw || {}
  return {
    babyId: summary.babyId,
    date: summary.date || getTodayDateString(),
    typeCounts: Array.isArray(summary.typeCounts) ? summary.typeCounts : [],
    typeCountMap: toTypeCountMap(summary.typeCounts),
    recentRecords: (Array.isArray(summary.recentRecords) ? summary.recentRecords : [])
      .map(toCareRecordViewModel)
      .filter(Boolean)
  }
}

export function getRecordTypeCountText(typeCountMap, recordType) {
  const count = Number(typeCountMap && typeCountMap[recordType]) || 0
  return count > 0 ? `${count}条` : '暂无记录'
}

export function getRecordListTypeCountText(records, recordType) {
  const count = (Array.isArray(records) ? records : []).filter((record) => record.recordType === recordType).length
  return count > 0 ? `${count}条` : '暂无记录'
}

export async function fetchTodaySummary(babyId) {
  const response = await getTodayCareSummary(babyId)
  return toTodaySummaryViewModel(response && response.data ? response.data : null)
}

export async function fetchCareRecordList(params) {
  const response = await getCareRecordList(params)
  return (Array.isArray(response.data) ? response.data : [])
    .map(toCareRecordViewModel)
    .filter(Boolean)
}

export function createQuickCareRecord(babyId, recordType, options = {}) {
  const payload = {
    babyId,
    recordType,
    recordTime: formatDateTime(new Date()),
    remark: Object.prototype.hasOwnProperty.call(options, 'remark')
      ? sanitizeVisibleText(options.remark || '')
      : getRecordTypeLabel(recordType)
  }
  if (options.reminderInstanceId) {
    payload.reminderInstanceId = options.reminderInstanceId
  }
  if (options.voiceRecordId) {
    payload.voiceRecordId = options.voiceRecordId
  }
  return createCareRecord(payload)
}
