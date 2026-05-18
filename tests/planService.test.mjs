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

const plain = (value) => JSON.parse(JSON.stringify(value))

assert.equal(context.PLAN_CARE_TYPES.FEEDING, 'FEEDING')
assert.equal(context.PLAN_CARE_TYPES.SLEEP, 'SLEEP')
assert.equal(context.PLAN_CARE_TYPES.BASIC_CARE, 'BASIC_CARE')
assert.equal(context.PLAN_CARE_TYPES.INTERACTION, 'INTERACTION')
assert.equal(context.PLAN_REPEAT_TYPES.DAILY, 'DAILY')
assert.equal(context.PLAN_ENABLED_STATUS.ENABLED, '1')
assert.equal(context.PLAN_ENABLED_STATUS.DISABLED, '0')
assert.equal(context.CARE_TYPE_META.FEEDING.pageType, context.PLAN_PAGE_TYPES.FEEDING)

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

await context.togglePlanTemplateEnabled(8, 9, '0')
await context.togglePlanTemplateEnabled(8, 9, 'unexpected')
assert.deepEqual(plain(calls.at(-2)), {
  name: 'updatePlanTemplateEnabled',
  templateId: 9,
  payload: { babyId: 8, enabled: context.PLAN_ENABLED_STATUS.DISABLED }
})
assert.deepEqual(plain(calls.at(-1)), {
  name: 'updatePlanTemplateEnabled',
  templateId: 9,
  payload: { babyId: 8, enabled: context.PLAN_ENABLED_STATUS.ENABLED }
})

assert.deepEqual(plain(await context.fetchPlanTemplates('', context.PLAN_CARE_TYPES.FEEDING)), [])
const oldState = [{ templateId: 1, title: 'old' }]
const pageSource = read('pages/plan/index.vue')
assert.match(pageSource, /const isFirstLoad = !this\.hasDisplayState/)
assert.match(pageSource, /catch \(error\) \{[\s\S]*uni\.showToast/)
assert.deepEqual(oldState, [{ templateId: 1, title: 'old' }])

console.log('plan-service frontend quality tests passed')
