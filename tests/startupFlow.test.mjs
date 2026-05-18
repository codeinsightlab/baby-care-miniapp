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
    .replace(/export function (\w+)\s*\(/g, 'globalThis.$1 = function $1(')
    .replace(/export \{[^}]+\}\n/g, '')
  vm.runInContext(source, context, { filename: file })
}

const context = vm.createContext({
  console,
  encodeURIComponent,
  decodeURIComponent,
  Boolean,
  String,
  Number
})

loadModule('constants/familyEnums.js', context)
loadModule('utils/collaborationInvite.js', context)
loadModule('utils/todayNoBabyState.js', context)

const plain = (value) => JSON.parse(JSON.stringify(value))

function resolveStartupFlow({ launchOptions = {}, loginSucceeded = true, hasBaby = true }) {
  context.captureCurrentEntryInviteToken(launchOptions)
  if (!loginSucceeded) {
    context.clearPendingInviteToken()
    return 'login'
  }
  const inviteToken = context.consumePendingInviteToken()
  if (inviteToken) {
    return `invite:${inviteToken}`
  }
  return hasBaby ? 'today' : 'today-empty'
}

function simulateTodayRefreshWithoutBaby() {
  const dependentCalls = []
  const result = {
    hasBaby: false,
    babyId: ''
  }
  if (!result.hasBaby) {
    return {
      route: 'today-empty',
      displayState: {
        currentBaby: null,
        todaySummary: null,
        recentRecords: [],
        todayReminders: [],
        timelineEvents: []
      },
      dependentCalls
    }
  }
  if (context.shouldLoadTodayBabyData(result.babyId)) {
    dependentCalls.push('fetchBabyDetail', 'fetchTodaySummary', 'fetchTodayReminders', 'fetchTodayTimelineEvents')
  }
  return {
    route: 'today',
    dependentCalls
  }
}

assert.equal(resolveStartupFlow({ launchOptions: {}, hasBaby: true }), 'today')
assert.equal(resolveStartupFlow({ launchOptions: {}, hasBaby: false }), 'today-empty')
assert.equal(resolveStartupFlow({ launchOptions: { scene: 1001 }, hasBaby: false }), 'today-empty')
assert.equal(resolveStartupFlow({ launchOptions: { scene: 1001 }, hasBaby: true }), 'today')
assert.equal(resolveStartupFlow({ launchOptions: { query: { scene: 'token%3Dscan-token' } }, hasBaby: false }), 'invite:scan-token')
assert.equal(resolveStartupFlow({ launchOptions: { query: { inviteToken: 'query-token' } }, hasBaby: true }), 'invite:query-token')
assert.equal(resolveStartupFlow({ launchOptions: {}, loginSucceeded: false, hasBaby: false }), 'login')
assert.equal(context.consumePendingInviteToken(), '')

assert.equal(context.shouldLoadTodayBabyData(''), false)
assert.equal(context.shouldLoadTodayBabyData(null), false)
assert.equal(context.shouldLoadTodayBabyData(0), false)
assert.equal(context.shouldLoadTodayBabyData(8), true)
assert.deepEqual(plain(context.buildNoBabyEmptyState()), {
  title: '暂无宝宝',
  description: '添加宝宝后开始记录护理。',
  actionText: '去添加宝宝',
  actionUrl: '/pages/baby/index'
})
assert.deepEqual(simulateTodayRefreshWithoutBaby(), {
  route: 'today-empty',
  displayState: {
    currentBaby: null,
    todaySummary: null,
    recentRecords: [],
    todayReminders: [],
    timelineEvents: []
  },
  dependentCalls: []
})

const splashSource = read('pages/splash/index.vue')
const todaySource = read('pages/today/index.vue')
const babyIndexSource = read('pages/baby/index.vue')
const loginSource = read('pages/login/index.vue')

assert.match(splashSource, /await ensureSilentLogin\(\)/)
assert.match(splashSource, /const result = await ensureCurrentBabyId\(\)/)
assert.match(splashSource, /if \(result\.hasBaby\) \{[\s\S]*this\.goToday\(\)[\s\S]*return[\s\S]*\}[\s\S]*this\.goToday\(\)/)
assert.doesNotMatch(splashSource, /goCreate|pages\/baby\/create/)
assert.doesNotMatch(splashSource, /pages\/login\/index[\s\S]*hasBaby/)

assert.match(todaySource, /v-else-if="showNoBabyState"/)
assert.match(todaySource, /buildNoBabyEmptyState/)
assert.match(todaySource, /shouldLoadTodayBabyData/)
assert.match(todaySource, /if \(!result\.hasBaby\) \{[\s\S]*clearCurrentBabyId\(\)[\s\S]*this\.displayState = createTodayDisplayState\(\)[\s\S]*return/)
assert.match(todaySource, /if \(!shouldLoadTodayBabyData\(babyId\)\) \{[\s\S]*return/)
assert.match(todaySource, /@click="goBabyList"/)
assert.doesNotMatch(todaySource, /this\.goCreate\(\)|goCreate\(\)|pages\/baby\/create/)

const noBabyBranchStart = todaySource.indexOf('if (!result.hasBaby)')
const noBabyBranchEnd = todaySource.indexOf('babyId = result.babyId', noBabyBranchStart)
const noBabyBranch = todaySource.slice(noBabyBranchStart, noBabyBranchEnd)
assert.doesNotMatch(noBabyBranch, /fetchTodaySummary|fetchTodayReminders|fetchTodayTimelineEvents|refreshTodaySummary|refreshTodayReminders|refreshTodayTimeline/)

assert.match(babyIndexSource, /v-else-if="noBabies"/)
assert.match(babyIndexSource, /@click="goCreate"/)
assert.match(babyIndexSource, /url: '\/pages\/baby\/create'/)
assert.match(loginSource, /ensureSilentLogin/)
assert.match(loginSource, /uni\.reLaunch\(\{[\s\S]*url: '\/pages\/splash\/index'/)
assert.doesNotMatch(loginSource, /pages\/baby\/create/)

console.log('startup-flow frontend regression tests passed')
