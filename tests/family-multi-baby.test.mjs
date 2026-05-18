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

let currentBabyId = ''
let apiBabies = []
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
    return { familyId: 101 }
  },
  createBaby: async (payload) => {
    calls.push({ name: 'createBaby', payload })
    return { babyId: calls.filter(call => call.name === 'createBaby').length + 10 }
  }
})

loadModule('services/babyService.js', context)

const plain = (value) => JSON.parse(JSON.stringify(value))

apiBabies = []
const firstCreate = await context.createBabyInCurrentFamily({
  nickname: '大宝',
  gender: '1',
  birthday: '2026-01-01'
})
assert.deepEqual(plain(firstCreate), { babyId: 11, familyId: 101 })
assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
  { name: 'createFamily', payload: { familyName: '大宝的共同照护' } },
  { name: 'createBaby', payload: { familyId: 101, nickname: '大宝', gender: '1', birthday: '2026-01-01' } }
])

calls.length = 0
apiBabies = [
  { babyId: 11, familyId: 101, nickname: '大宝', gender: '1', birthday: '2026-01-01' }
]
const secondCreate = await context.createBabyInCurrentFamily({
  nickname: '二宝',
  gender: '2',
  birthday: '2026-05-01'
})
assert.deepEqual(plain(secondCreate), { babyId: 11, familyId: 101 })
assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
  { name: 'createBaby', payload: { familyId: 101, nickname: '二宝', gender: '2', birthday: '2026-05-01' } }
])

currentBabyId = ''
apiBabies = [
  { babyId: 21, familyId: 101, nickname: '二宝', gender: '2', birthday: '2026-05-01' },
  { babyId: 11, familyId: 101, nickname: '大宝', gender: '1', birthday: '2026-01-01' }
]
assert.deepEqual(plain(await context.ensureCurrentBabyId()), {
  babyId: 21,
  baby: plain(context.toBabyViewModel(apiBabies[0])),
  restored: true,
  hasBaby: true
})
assert.equal(currentBabyId, 21)

currentBabyId = 11
assert.deepEqual(plain(await context.ensureCurrentBabyId()), {
  babyId: 11,
  restored: false,
  hasBaby: true
})

const backendFamilyService = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/extra/service/impl/BcFamilyBabyExtraServiceImpl.java')
const backendMapper = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/extra/mapper/BcFamilyBabyExtraMapper.java')
const backendMapperXml = read('../baby-care-backend/ruoyi-system/src/main/resources/mapper/babycare/extra/BcFamilyBabyExtraMapper.xml')
const backendCollaborationService = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/miniapp/service/MiniAppCollaborationService.java')
const babyIndexSource = read('pages/baby/index.vue')
const babyCreateSource = read('pages/baby/create.vue')
const babyServiceSource = read('services/babyService.js')
const startupSource = read('tests/startupFlow.test.mjs')

assert.match(backendFamilyService, /checkFamilyMember\(userId, familyId\)/)
assert.doesNotMatch(backendFamilyService, /countNormalBabyByFamilyId|checkFamilyOwner|只有主要照顾人可以创建宝宝/)
assert.doesNotMatch(backendMapper, /countNormalBabyByFamilyId/)
assert.doesNotMatch(backendMapperXml, /countNormalBabyByFamilyId/)
assert.match(backendFamilyService, /ensureNoActiveFamilyForCreate\(userId\)/)
assert.match(backendCollaborationService, /bcFamilyBabyExtraService\.hasActiveFamily\(userId\)/)

const babyListBranch = babyIndexSource.slice(
  babyIndexSource.indexOf('<view v-else class="baby-list">'),
  babyIndexSource.indexOf('</template>')
)
assert.match(babyListBranch, /goCreate/)
assert.doesNotMatch(babyCreateSource, /hasActiveFamily/)
assert.match(babyServiceSource, /export async function getCurrentFamilyId/)
assert.match(babyServiceSource, /export async function createBabyInCurrentFamily/)
assert.match(babyServiceSource, /currentFamilyId \|\| createInitialFamilyForFirstBaby\(nickname\)/)
assert.doesNotMatch(babyServiceSource, /createBabyWithDefaultFamily|createDefaultFamily/)
assert.match(startupSource, /ensureCurrentBabyId/)
assert.match(startupSource, /currentBaby/)

console.log('family multi-baby regression tests passed')
