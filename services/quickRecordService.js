import { sanitizeVisibleText } from './textSanitizer'

const contextValueLabels = {
  MIXED: '混合喂养',
  FORMULA: '奶粉',
  BREAST_MILK: '母乳',
  RECORD_ONLY: '仅记录',
  NAP: '午睡',
  DIAPER: '换尿布',
  TEMPERATURE: '体温观察'
}

function parseContext(value) {
  if (!value) {
    return null
  }
  if (typeof value === 'object') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch (error) {
    return sanitizeVisibleText(value)
  }
}

function labelOf(value) {
  const text = sanitizeVisibleText(value)
  return contextValueLabels[text] || text
}

function appendText(parts, value) {
  const text = sanitizeVisibleText(value)
  if (text && !parts.includes(text)) {
    parts.push(text)
  }
}

function appendAmount(parts, context) {
  const amount = context.amountMl || context.milkAmountMl || context.volumeMl
  if (amount) {
    parts.push(`${amount}ml`)
  }
}

export function formatDefaultRecordContext(value, fallback = '') {
  const context = parseContext(value)
  if (!context) {
    return sanitizeVisibleText(fallback)
  }
  if (typeof context === 'string') {
    return sanitizeVisibleText(context || fallback)
  }

  const parts = []
  appendText(parts, context.feedingTypeLabel || labelOf(context.feedingType))
  appendAmount(parts, context)
  appendText(parts, context.sleepSceneLabel || context.sleepModeLabel || labelOf(context.sleepScene || context.sleepMode))
  appendText(parts, context.careItemLabel || labelOf(context.careItem))
  appendText(parts, context.activityName || context.activityGroupLabel)
  appendText(parts, context.durationLabel)
  appendText(parts, context.timeWindowLabel)
  appendText(parts, context.text)

  return sanitizeVisibleText(parts.join(' ') || fallback)
}

export function buildQuickRecordDraftFromReminder(reminder, currentBabyId) {
  if (!reminder || !reminder.reminderInstanceId) {
    return null
  }
  if (!currentBabyId || String(reminder.babyId) !== String(currentBabyId)) {
    return null
  }
  return {
    source: 'reminder',
    babyId: reminder.babyId,
    recordType: reminder.recordType,
    reminderInstanceId: reminder.reminderInstanceId,
    title: sanitizeVisibleText(reminder.templateName || reminder.title || reminder.careTypeLabel || '护理记录'),
    defaultContextText: formatDefaultRecordContext(
      reminder.defaultRecordContext,
      reminder.remark || reminder.careTypeLabel || '按当前提醒记录'
    )
  }
}

export function buildManualQuickRecordDraft(babyId, quickType) {
  if (!babyId || !quickType || !quickType.recordType) {
    return null
  }
  return {
    source: 'manual',
    babyId,
    recordType: quickType.recordType,
    reminderInstanceId: null,
    title: sanitizeVisibleText(quickType.label || quickType.quickLabel || '护理记录'),
    defaultContextText: sanitizeVisibleText(quickType.defaultContext || quickType.defaultRemark || '快速记录')
  }
}

export function buildQuickRecordCareOptions(draft, result = {}) {
  const options = {
    remark: sanitizeVisibleText(result.remark || '')
  }
  if (draft && draft.reminderInstanceId) {
    options.reminderInstanceId = draft.reminderInstanceId
  }
  if (result.voiceRecordId) {
    options.voiceRecordId = result.voiceRecordId
  }
  return options
}

export function resolveQuickRecordVoiceRemark(voiceRecord) {
  if (!voiceRecord) {
    return ''
  }
  return sanitizeVisibleText(voiceRecord.finalText || voiceRecord.confirmText || voiceRecord.recognizeText || '')
}
