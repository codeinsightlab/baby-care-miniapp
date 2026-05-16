import { getTodayTimelineEvents } from '../api/timeline'
import { sanitizeVisibleText } from './textSanitizer'

const eventTypeUi = {
  RECORD: {
    iconText: '记',
    typeClass: 'record-event',
    itemClass: 'timeline-item-record',
    visualPriority: 'P0',
    showDescription: true,
    fallbackTitle: '照护记录'
  },
  SYSTEM_EVENT: {
    iconText: '',
    typeClass: 'system-event',
    itemClass: 'timeline-item-system',
    visualPriority: 'P3',
    showDescription: false,
    fallbackTitle: '今日照护提醒'
  }
}

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
  const ui = eventTypeUi[raw.eventType] || eventTypeUi.SYSTEM_EVENT
  const description = sanitizeVisibleText(raw.description || '')
  return {
    id: raw.id,
    eventType: raw.eventType,
    eventTime: raw.eventTime || '',
    displayTime: formatTime(raw.eventTime),
    title: sanitizeVisibleText(raw.title || ui.fallbackTitle),
    description,
    sourceType: raw.sourceType,
    relatedId: raw.relatedId,
    status: raw.status,
    extra: raw.extra || {},
    iconText: ui.iconText,
    typeClass: ui.typeClass,
    itemClass: ui.itemClass,
    visualPriority: ui.visualPriority,
    showDescription: ui.showDescription && Boolean(description)
  }
}

export async function fetchTodayTimelineEvents(babyId) {
  const response = await getTodayTimelineEvents(babyId)
  return (Array.isArray(response.data) ? response.data : [])
    .map(toTimelineEventViewModel)
    .filter(Boolean)
}
