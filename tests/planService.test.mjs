import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')

function loadModule(file, context) {
  const source = read(file)
    .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
    .replace(/export const (\w+)\s*=/g, 'globalThis.$1 =')
    .replace(/export async function (\w+)\s*\(/g, 'globalThis.$1 = async function $1(')
    .replace(/export function (\w+)\s*\(/g, 'globalThis.$1 = function $1(')
    .replace(/export \{[^}]+\}\n/g, '')
  vm.runInContext(source, context, { filename: file })
}

const calls = []
const context = vm.createContext({
  console,
  createPlanTemplate: async (payload) => {
    calls.push({ name: 'createPlanTemplate', payload })
    return { data: 99 }
  },
  deletePlanTemplate: async (templateId, babyId) => {
    calls.push({ name: 'deletePlanTemplate', templateId, babyId })
  },
  getPlanTemplateList: async (params) => {
    calls.push({ name: 'getPlanTemplateList', params })
    return { data: [] }
  },
  updatePlanTemplate: async (templateId, payload) => {
    calls.push({ name: 'updatePlanTemplate', templateId, payload })
  },
  updatePlanTemplateEnabled: async (templateId, payload) => {
    calls.push({ name: 'updatePlanTemplateEnabled', templateId, payload })
  },
  sanitizeVisibleText: (value) => String(value).trim()
})

loadModule('constants/planEnums.js', context)
loadModule('services/planService.js', context)
loadModule('utils/pageRefreshState.js', context)

const plain = (value) => JSON.parse(JSON.stringify(value))

assert.equal(context.PLAN_CARE_TYPES.FEEDING, 'FEEDING')
assert.equal(context.PLAN_CARE_TYPES.SLEEP, 'SLEEP')
assert.equal(context.PLAN_CARE_TYPES.BASIC_CARE, 'BASIC_CARE')
assert.equal(context.PLAN_CARE_TYPES.INTERACTION, 'INTERACTION')
assert.equal(context.PLAN_REPEAT_TYPES.DAILY, 'DAILY')
assert.equal(context.PLAN_ENABLED_STATUS.ENABLED, '1')
assert.equal(context.PLAN_ENABLED_STATUS.DISABLED, '0')
assert.equal(context.CARE_TYPE_META.FEEDING.pageType, context.PLAN_PAGE_TYPES.FEEDING)
assert.equal(context.CARE_TYPE_META.SLEEP.pageUrl, '/pages/plan/sleep')
assert.equal(context.CARE_TYPE_META.BASIC_CARE.label, '基础护理')
assert.equal(context.CARE_TYPE_META.INTERACTION.pageType, context.PLAN_PAGE_TYPES.INTERACTION)
assert.deepEqual(plain(context.DEFAULT_CONTEXT.FEEDING), {
  feedingType: 'MIXED',
  feedingTypeLabel: '混合喂养',
  recordMode: '按喂养时长或奶量记录'
})
assert.deepEqual(plain(context.DEFAULT_CONTEXT.SLEEP), {
  sleepMode: 'RECORD_ONLY',
  sleepModeLabel: '仅记录睡眠',
  sleepScene: 'NAP',
  sleepSceneLabel: '睡眠记录'
})
assert.deepEqual(plain(context.DEFAULT_CONTEXT.BASIC_CARE), {
  careItem: 'DIAPER',
  careItemLabel: '换尿布检查',
  remindMode: 'FOLLOW_TEMPLATE',
  remindModeLabel: '跟随推荐节点生成'
})
assert.deepEqual(plain(context.DEFAULT_CONTEXT.INTERACTION), {
  activityGroup: 'motor',
  activityGroupLabel: '运动发展',
  activityName: '短时趴卧',
  iconText: '趴',
  durationLabel: '1-2分钟',
  timeWindowLabel: '上午清醒时'
})
assert.equal(context.normalizePlanEnabled('0'), context.PLAN_ENABLED_STATUS.DISABLED)
assert.equal(context.normalizePlanEnabled('1'), context.PLAN_ENABLED_STATUS.ENABLED)
assert.equal(context.normalizePlanEnabled(undefined), context.PLAN_ENABLED_STATUS.ENABLED)
assert.equal(context.getPlanEnabledText('0'), '关')
assert.equal(context.getPlanEnabledText('unexpected'), '开')

assert.deepEqual(plain(context.parsePlanContext('', { a: 1 })), { a: 1 })
assert.deepEqual(plain(context.parsePlanContext('{"b":2}', { a: 1 })), { a: 1, b: 2 })
assert.deepEqual(plain(context.parsePlanContext('{bad json', { a: 1 })), { a: 1, text: '{bad json' })
assert.deepEqual(plain(context.parsePlanContext({ b: 2 }, { a: 1 })), { a: 1, b: 2 })

const emptyContext = context.toPlanTemplateViewModel({
  templateId: 1,
  babyId: 2,
  careType: context.PLAN_CARE_TYPES.FEEDING,
  title: ' 喂养 ',
  reminderTime: '07:30:00',
  defaultRecordContext: '',
  enabled: null
})
assert.equal(emptyContext.reminderTime, '07:30')
assert.equal(emptyContext.repeatType, context.PLAN_REPEAT_TYPES.DAILY)
assert.equal(emptyContext.enabled, context.PLAN_ENABLED_STATUS.ENABLED)
assert.equal(emptyContext.enabledText, '开')
assert.equal(emptyContext.context.feedingType, 'MIXED')

const disabledContext = context.toPlanTemplateViewModel({
  careType: context.PLAN_CARE_TYPES.SLEEP,
  reminderTime: 'bad',
  defaultRecordContext: '{"sleepMode":"REMINDER"}',
  enabled: '0'
})
assert.equal(disabledContext.displayTime, '未设置')
assert.equal(disabledContext.enabled, context.PLAN_ENABLED_STATUS.DISABLED)
assert.equal(disabledContext.enabledText, '关')
assert.equal(disabledContext.context.sleepMode, 'REMINDER')

const unknownCareType = context.toPlanTemplateViewModel({
  templateId: 3,
  careType: 'UNKNOWN',
  title: '',
  defaultRecordContext: '',
  enabled: '1'
})
assert.equal(unknownCareType.careType, 'UNKNOWN')
assert.equal(unknownCareType.careTypeLabel, '计划')
assert.deepEqual(plain(unknownCareType.context), {})

const payload = context.buildPlanPayload(8, {
  careType: context.PLAN_CARE_TYPES.BASIC_CARE,
  title: '换尿布',
  reminderTime: '09:15:00',
  enabled: 'unexpected',
  context: { careItem: 'DIAPER' }
})
assert.equal(payload.babyId, 8)
assert.equal(payload.careType, context.PLAN_CARE_TYPES.BASIC_CARE)
assert.equal(payload.reminderTime, '09:15')
assert.equal(payload.repeatType, context.PLAN_REPEAT_TYPES.DAILY)
assert.equal(payload.enabled, context.PLAN_ENABLED_STATUS.ENABLED)
assert.equal(payload.defaultRecordContext, '{"careItem":"DIAPER"}')

const feedingPayload = context.buildPlanPayload(8, {
  careType: context.PLAN_CARE_TYPES.FEEDING,
  title: '喂奶',
  reminderTime: '7:00',
  defaultRecordContext: '',
  enabled: '1'
})
assert.equal(feedingPayload.reminderTime, '08:00')
assert.equal(feedingPayload.defaultRecordContext, JSON.stringify(context.DEFAULT_CONTEXT.FEEDING))

const sleepPayload = context.buildPlanPayload(8, {
  careType: context.PLAN_CARE_TYPES.SLEEP,
  title: '睡眠',
  reminderTime: '21:30',
  defaultRecordContext: '{"sleepScene":"NIGHT"}',
  enabled: '0'
})
assert.equal(sleepPayload.defaultRecordContext, '{"sleepMode":"RECORD_ONLY","sleepModeLabel":"仅记录睡眠","sleepScene":"NIGHT","sleepSceneLabel":"睡眠记录"}')
assert.equal(sleepPayload.enabled, context.PLAN_ENABLED_STATUS.DISABLED)

const interactionPayload = context.buildPlanPayload(8, {
  careType: context.PLAN_CARE_TYPES.INTERACTION,
  title: '互动',
  reminderTime: '',
  context: {
    activityGroup: 'cognitive',
    activityName: '追视'
  }
})
assert.equal(interactionPayload.reminderTime, '08:00')
assert.equal(interactionPayload.defaultRecordContext, '{"activityGroup":"cognitive","activityName":"追视"}')

assert.deepEqual(plain(context.buildPlanGroups([
  { careType: context.PLAN_CARE_TYPES.FEEDING, enabled: '1', displayTime: '07:00' },
  { careType: context.PLAN_CARE_TYPES.FEEDING, enabled: '0', displayTime: '09:00' },
  { careType: context.PLAN_CARE_TYPES.SLEEP, enabled: '1', displayTime: '21:00' }
]).map(group => ({
  careType: group.careType,
  templateCount: group.templateCount,
  enabledCount: group.enabledCount,
  displayTime: group.displayTime,
  summary: group.summary
}))), [
  { careType: context.PLAN_CARE_TYPES.FEEDING, templateCount: 2, enabledCount: 1, displayTime: '07:00', summary: '2 个节点，1 个已开启' },
  { careType: context.PLAN_CARE_TYPES.SLEEP, templateCount: 1, enabledCount: 1, displayTime: '21:00', summary: '1 个节点，1 个已开启' },
  { careType: context.PLAN_CARE_TYPES.BASIC_CARE, templateCount: 0, enabledCount: 0, displayTime: '未设置', summary: '尚未配置' },
  { careType: context.PLAN_CARE_TYPES.INTERACTION, templateCount: 0, enabledCount: 0, displayTime: '未设置', summary: '尚未配置' }
])

await context.savePlanTemplate(8, {
  careType: context.PLAN_CARE_TYPES.FEEDING,
  title: '新增喂养',
  reminderTime: '06:30',
  context: { feedingType: 'BREAST' },
  enabled: '1'
})
await context.savePlanTemplate(8, {
  templateId: 12,
  careType: context.PLAN_CARE_TYPES.SLEEP,
  title: '更新睡眠',
  reminderTime: '20:30',
  context: { sleepScene: 'NIGHT' },
  enabled: '0'
})
await context.togglePlanTemplateEnabled(8, 9, '0')
await context.togglePlanTemplateEnabled(8, 9, 'unexpected')
await context.removePlanTemplate(8, 10)
await context.fetchPlanTemplates(8, context.PLAN_CARE_TYPES.FEEDING)
const toggleCalls = calls.filter(item => item.name === 'updatePlanTemplateEnabled')
assert.deepEqual(plain(toggleCalls.at(-2)), {
  name: 'updatePlanTemplateEnabled',
  templateId: 9,
  payload: { babyId: 8, enabled: context.PLAN_ENABLED_STATUS.DISABLED }
})
assert.deepEqual(plain(toggleCalls.at(-1)), {
  name: 'updatePlanTemplateEnabled',
  templateId: 9,
  payload: { babyId: 8, enabled: context.PLAN_ENABLED_STATUS.ENABLED }
})
assert.deepEqual(plain(calls.find(item => item.name === 'createPlanTemplate')), {
  name: 'createPlanTemplate',
  payload: {
    babyId: 8,
    careType: context.PLAN_CARE_TYPES.FEEDING,
    title: '新增喂养',
    reminderTime: '06:30',
    repeatType: context.PLAN_REPEAT_TYPES.DAILY,
    repeatRule: '',
    defaultRecordContext: '{"feedingType":"BREAST"}',
    enabled: context.PLAN_ENABLED_STATUS.ENABLED,
    remark: ''
  }
})
assert.deepEqual(plain(calls.find(item => item.name === 'updatePlanTemplate')), {
  name: 'updatePlanTemplate',
  templateId: 12,
  payload: {
    babyId: 8,
    careType: context.PLAN_CARE_TYPES.SLEEP,
    title: '更新睡眠',
    reminderTime: '20:30',
    repeatType: context.PLAN_REPEAT_TYPES.DAILY,
    repeatRule: '',
    defaultRecordContext: '{"sleepScene":"NIGHT"}',
    enabled: context.PLAN_ENABLED_STATUS.DISABLED,
    remark: ''
  }
})
assert.deepEqual(plain(calls.find(item => item.name === 'deletePlanTemplate')), {
  name: 'deletePlanTemplate',
  templateId: 10,
  babyId: 8
})
assert.deepEqual(plain(calls.find(item => item.name === 'getPlanTemplateList' && item.params.babyId === 8)), {
  name: 'getPlanTemplateList',
  params: {
    babyId: 8,
    careType: context.PLAN_CARE_TYPES.FEEDING
  }
})

assert.deepEqual(plain(await context.fetchPlanTemplates('', context.PLAN_CARE_TYPES.FEEDING)), [])
const oldState = [{ templateId: 1, title: 'old' }]
const successState = {
  baby: { babyId: 8 },
  planGroups: [{ careType: context.PLAN_CARE_TYPES.FEEDING }]
}
assert.deepEqual(plain(context.applyRefreshSuccess(successState)), {
  displayState: successState,
  loadErrorText: ''
})
const failedState = context.applyRefreshFailure(oldState, { msg: '接口失败' }, '计划加载失败')
assert.equal(failedState.displayState, oldState)
assert.equal(failedState.loadErrorText, '接口失败')
assert.equal(context.keepPreviousDisplayOnFailure(oldState), oldState)
const pageSource = read('pages/plan/index.vue')
assert.match(pageSource, /const isFirstLoad = !this\.hasDisplayState/)
assert.match(pageSource, /applyRefreshSuccess/)
assert.match(pageSource, /applyRefreshFailure\(this\.displayState, error, '计划加载失败'\)/)
assert.match(pageSource, /catch \(error\) \{[\s\S]*this\.displayState = refreshResult\.displayState[\s\S]*uni\.showToast/)
assert.deepEqual(oldState, [{ templateId: 1, title: 'old' }])

console.log('plan-service frontend quality tests passed')
