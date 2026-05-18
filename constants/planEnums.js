export const PLAN_CARE_TYPES = Object.freeze({
  FEEDING: 'FEEDING',
  SLEEP: 'SLEEP',
  BASIC_CARE: 'BASIC_CARE',
  INTERACTION: 'INTERACTION'
})

export const PLAN_REPEAT_TYPES = Object.freeze({
  DAILY: 'DAILY'
})

export const PLAN_ENABLED_STATUS = Object.freeze({
  DISABLED: '0',
  ENABLED: '1'
})

export const PLAN_PAGE_TYPES = Object.freeze({
  INDEX: 'plan-index',
  FEEDING: 'plan-feeding',
  SLEEP: 'plan-sleep',
  CARE: 'plan-care',
  INTERACTION: 'plan-interaction'
})

export const CARE_TYPE_META = Object.freeze({
  [PLAN_CARE_TYPES.FEEDING]: {
    careType: PLAN_CARE_TYPES.FEEDING,
    pageType: PLAN_PAGE_TYPES.FEEDING,
    label: '喂养',
    title: '喂养计划',
    description: '当前喂养方式和参考提醒节点',
    pageUrl: '/pages/plan/feeding'
  },
  [PLAN_CARE_TYPES.SLEEP]: {
    careType: PLAN_CARE_TYPES.SLEEP,
    pageType: PLAN_PAGE_TYPES.SLEEP,
    label: '睡眠',
    title: '睡眠计划',
    description: '睡眠记录模式和观察节点',
    pageUrl: '/pages/plan/sleep'
  },
  [PLAN_CARE_TYPES.BASIC_CARE]: {
    careType: PLAN_CARE_TYPES.BASIC_CARE,
    pageType: PLAN_PAGE_TYPES.CARE,
    label: '基础护理',
    title: '基础护理计划',
    description: '换尿布、补剂、体温观察',
    pageUrl: '/pages/plan/care'
  },
  [PLAN_CARE_TYPES.INTERACTION]: {
    careType: PLAN_CARE_TYPES.INTERACTION,
    pageType: PLAN_PAGE_TYPES.INTERACTION,
    label: '运动与认知',
    title: '运动与认知计划',
    description: '运动发展与认知互动参考活动',
    pageUrl: '/pages/plan/interaction'
  }
})

export const DEFAULT_CONTEXT = Object.freeze({
  [PLAN_CARE_TYPES.FEEDING]: {
    feedingType: 'MIXED',
    feedingTypeLabel: '混合喂养',
    recordMode: '按喂养时长或奶量记录'
  },
  [PLAN_CARE_TYPES.SLEEP]: {
    sleepMode: 'RECORD_ONLY',
    sleepModeLabel: '仅记录睡眠',
    sleepScene: 'NAP',
    sleepSceneLabel: '睡眠记录'
  },
  [PLAN_CARE_TYPES.BASIC_CARE]: {
    careItem: 'DIAPER',
    careItemLabel: '换尿布检查',
    remindMode: 'FOLLOW_TEMPLATE',
    remindModeLabel: '跟随推荐节点生成'
  },
  [PLAN_CARE_TYPES.INTERACTION]: {
    activityGroup: 'motor',
    activityGroupLabel: '运动发展',
    activityName: '短时趴卧',
    iconText: '趴',
    durationLabel: '1-2分钟',
    timeWindowLabel: '上午清醒时'
  }
})

export function normalizePlanEnabled(value) {
  return String(value) === PLAN_ENABLED_STATUS.DISABLED
    ? PLAN_ENABLED_STATUS.DISABLED
    : PLAN_ENABLED_STATUS.ENABLED
}

export function isPlanEnabled(value) {
  return normalizePlanEnabled(value) === PLAN_ENABLED_STATUS.ENABLED
}

export function getPlanEnabledText(value) {
  return isPlanEnabled(value) ? '开' : '关'
}
