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

const requests = []
const serviceCalls = []
const context = vm.createContext({
  console,
  encodeURIComponent,
  request: async (options) => {
    requests.push(options)
    return { data: [] }
  },
  getPlanTemplateList: async (params) => {
    serviceCalls.push({ name: 'getPlanTemplateList', params })
    return { data: [] }
  },
  createPlanTemplate: async () => ({ data: 1 }),
  deletePlanTemplate: async () => {},
  updatePlanTemplate: async () => {},
  updatePlanTemplateEnabled: async () => {},
  sanitizeVisibleText: (value) => String(value || '').trim()
})

loadModule('utils/requestQuery.js', context)
loadModule('constants/planEnums.js', context)
loadModule('api/plan.js', context)
loadModule('api/careRecord.js', context)
loadModule('api/timeline.js', context)
loadModule('services/planService.js', context)

const plain = (value) => JSON.parse(JSON.stringify(value))

assert.deepEqual(plain(context.buildQueryParams({
  babyId: 6,
  careType: undefined,
  repeatType: null,
  status: '',
  enabled: '0'
})), {
  babyId: 6,
  enabled: '0'
})
assert.equal(context.buildQueryString({ babyId: 6, careType: undefined }), 'babyId=6')
assert.equal(context.appendQueryString('/api/mini/plan-template/list', { babyId: 6, careType: null }), '/api/mini/plan-template/list?babyId=6')
assert.equal(context.appendQueryString('/api/mini/plan-template/list', { careType: undefined }), '/api/mini/plan-template/list')
assert.doesNotMatch(context.appendQueryString('/api/test', { babyId: 6, careType: undefined, status: null }), /undefined|null/)

await context.getPlanTemplateList({ babyId: 6, careType: undefined })
await context.getPlanTemplateList({ babyId: 6, careType: null, repeatType: undefined, status: undefined })
await context.getPlanTemplateList({ babyId: 6, careType: context.PLAN_CARE_TYPES.FEEDING })
await context.deletePlanTemplate(9, undefined)
await context.getTodayCareSummary(undefined)
await context.getCareRecordList({ babyId: 6, date: null })
await context.getTodayTimelineEvents(null)

assert.deepEqual(plain(requests.map(item => item.url)), [
  '/api/mini/plan-template/list?babyId=6',
  '/api/mini/plan-template/list?babyId=6',
  '/api/mini/plan-template/list?babyId=6&careType=FEEDING',
  '/api/mini/plan-template/9',
  '/api/mini/care-record/today-summary',
  '/api/mini/care-record/list?babyId=6',
  '/api/mini/timeline/today'
])
for (const item of requests) {
  assert.doesNotMatch(item.url, /undefined|null|careType=$|repeatType=|status=/)
  assert.equal(Object.prototype.hasOwnProperty.call(item, 'data'), false)
}

const serviceContext = vm.createContext({
  console,
  getPlanTemplateList: async (params) => {
    serviceCalls.push({ name: 'getPlanTemplateList', params })
    return { data: [] }
  },
  createPlanTemplate: async () => ({ data: 1 }),
  deletePlanTemplate: async () => {},
  updatePlanTemplate: async () => {},
  updatePlanTemplateEnabled: async () => {},
  sanitizeVisibleText: (value) => String(value || '').trim()
})
loadModule('constants/planEnums.js', serviceContext)
loadModule('services/planService.js', serviceContext)

await serviceContext.fetchPlanTemplates(6)
await serviceContext.fetchPlanTemplatesByCareType(6, serviceContext.PLAN_CARE_TYPES.SLEEP)
await serviceContext.fetchPlanTemplates('', serviceContext.PLAN_CARE_TYPES.FEEDING)

assert.deepEqual(plain(serviceCalls), [
  { name: 'getPlanTemplateList', params: { babyId: 6 } },
  { name: 'getPlanTemplateList', params: { babyId: 6, careType: serviceContext.PLAN_CARE_TYPES.SLEEP } }
])

const planIndexSource = read('pages/plan/index.vue')
assert.match(planIndexSource, /fetchPlanTemplates\(this\.currentBabyId\)/)
assert.doesNotMatch(planIndexSource, /careType:\s*undefined|PLAN_CARE_TYPES\./)

console.log('plan query regression tests passed')
