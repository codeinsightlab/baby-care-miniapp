import { getTodayTimelineEvents } from '../api/timeline'
import { getRecordTypeLabel, toCareRecordTimelineItemViewModel } from './careRecordService'
import { sanitizeVisibleText } from './textSanitizer'

function formatTime(value) {
  if (!value) {
    return '--:--'
  }
  const text = String(value)
  if (text.includes(' ')) {
    return text.split(' ')[1].slice(0, 5)
  }
  return text.slice(11, 16) || text.slice(0, 5)
}

export function toTimelineEventViewModel(raw) {
  if (!raw) {
    return null
  }
  if (raw.eventType && raw.eventType !== 'RECORD') {
    return null
  }
  const extra = raw.extra || {}
  const recordType = extra.recordType || raw.recordType
  const description = sanitizeVisibleText(raw.description || '')
  return toCareRecordTimelineItemViewModel({
    id: raw.id,
    recordId: raw.relatedId || raw.id,
    recordType,
    recordTypeLabel: raw.recordTypeLabel || getRecordTypeLabel(recordType),
    recordTime: raw.eventTime || '',
    displayTime: formatTime(raw.eventTime),
    remark: description,
    description,
    eventType: raw.eventType,
    eventTime: raw.eventTime || '',
    sourceType: raw.sourceType,
    relatedId: raw.relatedId,
    status: raw.status,
    extra
  })
}

export async function fetchTodayTimelineEvents(babyId) {
  const response = await getTodayTimelineEvents(babyId)
  return (Array.isArray(response.data) ? response.data : [])
    .map(toTimelineEventViewModel)
    .filter(Boolean)
}
