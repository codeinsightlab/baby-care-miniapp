import { getPlanTemplateList } from '../api/plan'
import { createReminderNode } from '../api/reminder'
import { sanitizeVisibleText } from './textSanitizer'

export const CARE_TYPE_META = {
  FEEDING: {
    careType: 'FEEDING',
    label: '喂养',
    title: '喂养计划',
    description: '喂养方式、参考节点、记录方式',
    pageUrl: '/pages/plan/feeding'
  },
  SLEEP: {
    careType: 'SLEEP',
    label: '睡眠',
    title: '睡眠计划',
    description: '睡眠模式、观察节点',
    pageUrl: '/pages/plan/sleep'
  },
  BASIC_CARE: {
    careType: 'BASIC_CARE',
    label: '基础护理',
    title: '基础护理计划',
    description: '换尿布、补剂、体温提醒',
    pageUrl: '/pages/plan/care'
  },
  INTERACTION: {
    careType: 'INTERACTION',
    label: '运动与认知',
    title: '运动与认知计划',
    description: '亲子互动、活动陪伴',
    pageUrl: ''
  }
}

function formatTime(value) {
  if (!value) {
    return '未设置'
  }
  return String(value).slice(0, 5)
}

export function toPlanTemplateViewModel(raw) {
  if (!raw) {
    return null
  }
  const meta = CARE_TYPE_META[raw.careType] || {}
  const templateName = sanitizeVisibleText(raw.templateName || meta.title || '计划模板')
  const description = sanitizeVisibleText(raw.description || '')
  return {
    templateId: raw.templateId,
    templateName,
    careType: raw.careType,
    careTypeLabel: raw.careTypeLabel || meta.label || '计划',
    babyAgeMinDays: raw.babyAgeMinDays,
    babyAgeMaxDays: raw.babyAgeMaxDays,
    suggestTime: raw.suggestTime || '',
    displayTime: formatTime(raw.suggestTime),
    description,
    enabled: raw.enabled,
    title: sanitizeVisibleText(meta.title || raw.templateName || '计划模板'),
    pageUrl: meta.pageUrl || ''
  }
}

export async function fetchPlanTemplates() {
  const response = await getPlanTemplateList()
  return (Array.isArray(response.data) ? response.data : [])
    .map(toPlanTemplateViewModel)
    .filter(Boolean)
}

export async function fetchPlanTemplatesByCareType(careType) {
  const templates = await fetchPlanTemplates()
  return templates.filter((template) => template.careType === careType)
}

export function buildPlanGroups(templates) {
  return Object.keys(CARE_TYPE_META).map((careType) => {
    const meta = CARE_TYPE_META[careType]
    const items = (Array.isArray(templates) ? templates : []).filter((template) => template.careType === careType)
    const first = items[0]
    return {
      ...meta,
      templateCount: items.length,
      displayTime: first ? first.displayTime : '未设置',
      description: first && first.description ? first.description : meta.description,
      disabled: !meta.pageUrl || items.length === 0
    }
  })
}

export async function createReminderFromTemplate(babyId, template) {
  if (!template || !template.templateId) {
    throw new Error('计划模板不存在')
  }
  const response = await createReminderNode({
    babyId,
    templateId: template.templateId,
    careType: template.careType,
    reminderTime: template.suggestTime,
    remark: template.templateName
  })
  return response && response.reminderNodeId
}
