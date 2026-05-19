export const CARE_TYPE_META = Object.freeze({
  FEEDING: {
    careType: 'FEEDING',
    label: '喂养',
    iconText: '奶',
    badgeText: '喂养',
    typeClass: 'feeding',
    quickActionText: '记录喂养',
    recordType: 'FEEDING'
  },
  SLEEP: {
    careType: 'SLEEP',
    label: '睡眠',
    iconText: '眠',
    badgeText: '睡眠',
    typeClass: 'sleep',
    quickActionText: '记录睡眠',
    recordType: 'SLEEP'
  },
  CARE: {
    careType: 'CARE',
    label: '护理',
    iconText: '护',
    badgeText: '护理',
    typeClass: 'care',
    quickActionText: '记录护理',
    recordType: 'BASIC_CARE'
  },
  BASIC_CARE: {
    careType: 'BASIC_CARE',
    label: '基础护理',
    iconText: '护',
    badgeText: '护理',
    typeClass: 'care',
    quickActionText: '记录护理',
    recordType: 'BASIC_CARE'
  },
  PLAY: {
    careType: 'PLAY',
    label: '互动',
    iconText: '玩',
    badgeText: '互动',
    typeClass: 'play',
    quickActionText: '记录互动',
    recordType: 'INTERACTION'
  },
  INTERACTION: {
    careType: 'INTERACTION',
    label: '运动与认知',
    iconText: '玩',
    badgeText: '互动',
    typeClass: 'play',
    quickActionText: '记录互动',
    recordType: 'INTERACTION'
  },
  MEDICINE: {
    careType: 'MEDICINE',
    label: '用药',
    iconText: '药',
    badgeText: '用药',
    typeClass: 'medicine',
    quickActionText: '记录用药',
    recordType: 'BASIC_CARE'
  },
  TEMPERATURE: {
    careType: 'TEMPERATURE',
    label: '体温',
    iconText: '温',
    badgeText: '体温',
    typeClass: 'temperature',
    quickActionText: '记录体温',
    recordType: 'BASIC_CARE'
  }
})

export function getCareTypeMeta(careType) {
  const key = String(careType || '').toUpperCase()
  if (CARE_TYPE_META[key]) {
    return CARE_TYPE_META[key]
  }
  return {
    careType: key || 'UNKNOWN',
    label: key || '提醒',
    iconText: '记',
    badgeText: '提醒',
    typeClass: 'other',
    quickActionText: '去记录',
    recordType: key || 'BASIC_CARE'
  }
}

export function buildCareTypeSummaries(reminders) {
  const source = Array.isArray(reminders) ? reminders : []
  const knownTypes = Object.keys(CARE_TYPE_META)
  const dynamicTypes = source
    .map((item) => item && item.careType)
    .filter((careType) => careType && !knownTypes.includes(careType))
  const careTypes = [...new Set([...knownTypes, ...dynamicTypes])]

  return careTypes.map((careType) => {
    const meta = getCareTypeMeta(careType)
    const items = source.filter((item) => item.careType === careType)
    return {
      careType,
      label: meta.label,
      iconText: meta.iconText,
      typeClass: meta.typeClass,
      countText: items.length ? `${items.length}个提醒` : '暂无提醒'
    }
  })
}
