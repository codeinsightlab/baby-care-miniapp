import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')

function loadModule(file, context) {
  const source = read(file)
    .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
    .replace(/export async function (\w+)\s*\(/g, 'globalThis.$1 = async function $1(')
    .replace(/export function (\w+)\s*\(/g, 'globalThis.$1 = function $1(')
    .replace(/export \{[^}]+\}\n/g, '')
  vm.runInContext(source, context, { filename: file })
}

const plain = (value) => JSON.parse(JSON.stringify(value))

let currentBabyId = ''
let apiBabies = []
let nextFamilyId = 501
let nextBabyId = 701
const calls = []

const context = vm.createContext({
  console,
  Date,
  Number,
  String,
  Boolean,
  sanitizeVisibleText: (value) => String(value || '').trim(),
  getCurrentBabyId: () => currentBabyId,
  setCurrentBabyId: (babyId) => {
    currentBabyId = babyId
  },
  getBabyList: async () => ({ data: apiBabies }),
  getBabyDetail: async (babyId) => ({ data: apiBabies.find(baby => String(baby.babyId) === String(babyId)) }),
  createFamily: async (payload) => {
    calls.push({ name: 'createFamily', payload })
    return { familyId: nextFamilyId++ }
  },
  createBaby: async (payload) => {
    calls.push({ name: 'createBaby', payload })
    return { babyId: nextBabyId++ }
  }
})

loadModule('services/babyService.js', context)

apiBabies = []
currentBabyId = ''
calls.length = 0
nextFamilyId = 501
nextBabyId = 701
assert.deepEqual(plain(await context.createBabyInCurrentFamily({
  nickname: '大宝',
  gender: '1',
  birthday: '2026-01-01'
})), { babyId: 701, familyId: 501 })
assert.deepEqual(plain(calls), [
  { name: 'createFamily', payload: { familyName: '大宝的共同照护' } },
  { name: 'createBaby', payload: { familyId: 501, nickname: '大宝', gender: '1', birthday: '2026-01-01' } }
])

apiBabies = [
  { babyId: 701, familyId: 501, nickname: '大宝', gender: '1', birthday: '2026-01-01' }
]
currentBabyId = 701
calls.length = 0
assert.equal(await context.getCurrentFamilyId(), 501)
assert.deepEqual(plain(await context.createBabyInCurrentFamily({
  nickname: '二宝',
  gender: '2',
  birthday: '2026-05-01'
})), { babyId: 702, familyId: 501 })
assert.deepEqual(plain(calls), [
  { name: 'createBaby', payload: { familyId: 501, nickname: '二宝', gender: '2', birthday: '2026-05-01' } }
])
assert.equal(calls.some(call => call.name === 'createFamily'), false, 'second baby must not create a new family')

apiBabies = [
  { babyId: 701, familyId: 501, nickname: '大宝', gender: '1', birthday: '2026-01-01' },
  { babyId: 702, familyId: 501, nickname: '二宝', gender: '2', birthday: '2026-05-01' }
]
currentBabyId = 702
calls.length = 0
assert.deepEqual(plain(await context.createBabyInCurrentFamily({
  nickname: '三宝',
  gender: '0',
  birthday: '2026-07-01'
})), { babyId: 703, familyId: 501 })
assert.deepEqual(plain(calls), [
  { name: 'createBaby', payload: { familyId: 501, nickname: '三宝', gender: '0', birthday: '2026-07-01' } }
])

currentBabyId = ''
assert.deepEqual(plain(await context.ensureCurrentBabyId()), {
  babyId: 701,
  baby: plain(context.toBabyViewModel(apiBabies[0])),
  restored: true,
  hasBaby: true
})
assert.equal(currentBabyId, 701)

currentBabyId = 702
assert.deepEqual(plain(await context.ensureCurrentBabyId()), {
  babyId: 702,
  restored: false,
  hasBaby: true
})

function simulateSubmitSuccess(result) {
  context.setCurrentBabyId(result.babyId)
  return {
    route: '/pages/today/index',
    currentBabyId
  }
}

assert.deepEqual(simulateSubmitSuccess({ babyId: 703, familyId: 501 }), {
  route: '/pages/today/index',
  currentBabyId: 703
})

const babyServiceSource = read('services/babyService.js')
const createPageSource = read('pages/baby/create.vue')
const startupSource = read('tests/startupFlow.test.mjs')
const backendFamilyService = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/extra/service/impl/BcFamilyBabyExtraServiceImpl.java')

assert.match(babyServiceSource, /export async function getCurrentFamilyId/)
assert.match(babyServiceSource, /export async function createBabyInCurrentFamily/)
assert.match(babyServiceSource, /resolveFamilyIdForBabyCreate/)
assert.match(babyServiceSource, /createInitialFamilyForFirstBaby/)
assert.doesNotMatch(babyServiceSource, /createBabyWithDefaultFamily|createDefaultFamily/)
assert.match(createPageSource, /createBabyInCurrentFamily\(this\.form\)/)
assert.doesNotMatch(createPageSource, /createFamily/)
assert.match(startupSource, /ensureCurrentBabyId/)
assert.match(startupSource, /currentBaby/)
assert.match(backendFamilyService, /checkFamilyMember\(userId, familyId\)/)
assert.doesNotMatch(backendFamilyService, /countNormalBabyByFamilyId|只有主要照顾人可以创建宝宝/)

console.log('family create baby flow regression tests passed')
