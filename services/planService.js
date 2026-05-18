import {
  createPlanTemplate,
  deletePlanTemplate,
  getPlanTemplateList,
  updatePlanTemplate,
  updatePlanTemplateEnabled
} from '../api/plan'
import {
  CARE_TYPE_META,
  DEFAULT_CONTEXT,
  PLAN_ENABLED_STATUS,
  PLAN_REPEAT_TYPES,
  getPlanEnabledText,
  normalizePlanEnabled
} from '../constants/planEnums'
import { sanitizeVisibleText } from './textSanitizer'

export { CARE_TYPE_META, DEFAULT_CONTEXT }

function formatTime(value) {
  if (!value) {
    return ''
  }
  return String(value).slice(0, 5)
}

function normalizeTime(value, fallback = '08:00') {
  const text = formatTime(value)
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback
}

export function parsePlanContext(value, fallback = {}) {
  if (!value) {
    return { ...fallback }
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value }
  }
  try {
    return { ...fallback, ...JSON.parse(value) }
  } catch (error) {
    return { ...fallback, text: String(value) }
  }
}

export function stringifyPlanContext(context) {
  return JSON.stringify(context || {})
}

export function toPlanTemplateViewModel(raw) {
  if (!raw) {
    return null
  }
  const meta = CARE_TYPE_META[raw.careType] || {}
  const title = sanitizeVisibleText(raw.title || meta.title || '计划')
  const defaultContext = parsePlanContext(raw.defaultRecordContext, DEFAULT_CONTEXT[raw.careType])
  return {
    templateId: raw.templateId,
    babyId: raw.babyId,
    careType: raw.careType,
    careTypeLabel: raw.careTypeLabel || meta.label || '计划',
    title,
    reminderTime: normalizeTime(raw.reminderTime),
    displayTime: normalizeTime(raw.reminderTime, '未设置'),
    repeatType: raw.repeatType || PLAN_REPEAT_TYPES.DAILY,
    repeatRule: raw.repeatRule || '',
    defaultRecordContext: raw.defaultRecordContext || stringifyPlanContext(defaultContext),
    context: defaultContext,
    enabled: normalizePlanEnabled(raw.enabled),
    enabledText: getPlanEnabledText(raw.enabled),
    remark: sanitizeVisibleText(raw.remark || ''),
    templateVersion: raw.templateVersion || 1,
    pageUrl: meta.pageUrl || '',
    meta
  }
}

export async function fetchPlanTemplates(babyId, careType) {
  if (!babyId) {
    return []
  }
  const response = await getPlanTemplateList({
    babyId,
    careType
  })
  return (Array.isArray(response.data) ? response.data : [])
    .map(toPlanTemplateViewModel)
    .filter(Boolean)
}

export function fetchPlanTemplatesByCareType(babyId, careType) {
  return fetchPlanTemplates(babyId, careType)
}

export function buildPlanGroups(templates) {
  return Object.keys(CARE_TYPE_META).map((careType) => {
    const meta = CARE_TYPE_META[careType]
    const items = (Array.isArray(templates) ? templates : []).filter((template) => template.careType === careType)
    const enabledItems = items.filter((item) => item.enabled !== PLAN_ENABLED_STATUS.DISABLED)
    const first = items[0]
    return {
      ...meta,
      templates: items,
      templateCount: items.length,
      enabledCount: enabledItems.length,
      displayTime: first ? first.displayTime : '未设置',
      summary: items.length ? `${items.length} 个节点，${enabledItems.length} 个已开启` : '尚未配置',
      disabled: false
    }
  })
}

export function buildPlanPayload(babyId, plan) {
  return {
    babyId,
    careType: plan.careType,
    title: plan.title,
    reminderTime: normalizeTime(plan.reminderTime),
    repeatType: plan.repeatType || PLAN_REPEAT_TYPES.DAILY,
    repeatRule: plan.repeatRule || '',
    defaultRecordContext: stringifyPlanContext(plan.context || parsePlanContext(plan.defaultRecordContext, DEFAULT_CONTEXT[plan.careType])),
    enabled: normalizePlanEnabled(plan.enabled),
    remark: plan.remark || ''
  }
}

export async function savePlanTemplate(babyId, plan) {
  const payload = buildPlanPayload(babyId, plan)
  if (plan.templateId) {
    await updatePlanTemplate(plan.templateId, payload)
    return plan.templateId
  }
  const response = await createPlanTemplate(payload)
  return response.data
}

export function togglePlanTemplateEnabled(babyId, templateId, enabled) {
  return updatePlanTemplateEnabled(templateId, {
    babyId,
    enabled: normalizePlanEnabled(enabled)
  })
}

export function removePlanTemplate(babyId, templateId) {
  return deletePlanTemplate(templateId, babyId)
}
