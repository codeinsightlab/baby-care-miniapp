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
  encodeURIComponent,
  decodeURIComponent,
  Boolean,
  String,
  Number,
  sanitizeVisibleText: (value) => String(value || '').trim(),
  getCurrentCollaboration: async (babyId) => ({ data: { babyId, babyName: ' 宝宝 ', currentUserRole: 'OWNER', collaboratorCount: 2 } }),
  getCollaborationMemberList: async () => ({ data: [] }),
  createCollaborationInvite: async (payload) => {
    calls.push({ name: 'createCollaborationInvite', payload })
    return { data: { babyId: payload.babyId, inviteToken: 'token-1', miniappCodeImage: 'data:image/png;base64,abc', expiresAt: '2026-05-23 10:00:00' } }
  },
  getCollaborationInviteDetail: async (inviteToken) => ({ data: { babyId: 7, babyName: '宝宝', inviterNickname: '妈妈', alreadyJoined: false, expiresAt: '2026-05-23' } }),
  joinCollaborationByToken: async (payload) => {
    calls.push({ name: 'joinCollaborationByToken', payload })
    return { data: { babyId: 7, collaboratorRole: 'MEMBER' } }
  },
  disableCollaborationInvite: async (payload) => {
    calls.push({ name: 'disableCollaborationInvite', payload })
  },
  removeCollaborationMember: async (payload) => {
    calls.push({ name: 'removeCollaborationMember', payload })
  },
  leaveCollaboration: async (payload) => {
    calls.push({ name: 'leaveCollaboration', payload })
  },
  fetchBabyList: async () => []
})

loadModule('constants/familyEnums.js', context)
loadModule('utils/collaborationInvite.js', context)
loadModule('services/collaborationService.js', context)

assert.equal(context.FAMILY_MEMBER_ROLES.OWNER, 'OWNER')
assert.equal(context.FAMILY_MEMBER_STATUS.ACTIVE, 'ACTIVE')
assert.equal(context.FAMILY_INVITE_STATUS.DISABLED, 'DISABLED')
assert.equal(context.parseInviteTokenFromScene('abc123'), 'abc123')
assert.equal(context.parseInviteTokenFromScene('fc=abc123'), 'abc123')
assert.equal(context.parseInviteTokenFromScene('inviteToken%3Dtok'), 'tok')
assert.equal(context.extractInviteTokenFromLaunchOptions({ query: { scene: 'token%3Dscene-token' } }), 'scene-token')
assert.equal(context.extractInviteTokenFromLaunchOptions({ scene: 'fc=launch-token' }), 'launch-token')

context.savePendingInviteToken(' token-1 ')
assert.equal(context.getPendingInviteToken(), 'token-1')
assert.equal(context.captureCurrentEntryInviteToken({}), '')
assert.equal(context.getPendingInviteToken(), '')
assert.equal(context.captureCurrentEntryInviteToken({ query: { scene: 'fc=entry-token' } }), 'entry-token')
assert.equal(context.getPendingInviteToken(), 'entry-token')
assert.equal(context.captureCurrentEntryInviteToken({}), '')
assert.equal(context.getPendingInviteToken(), '')
context.savePendingInviteToken(' token-1 ')
assert.equal(context.buildInviteConfirmUrl('t 1'), '/pages/baby/collaboration-invite?inviteToken=t%201')
assert.equal(context.consumePendingInviteToken(), 'token-1')
assert.equal(context.consumePendingInviteToken(), '')
context.savePendingInviteToken(' token-3 ')
context.clearPendingInviteToken()
assert.equal(context.getPendingInviteToken(), '')
assert.equal(context.consumePendingInviteToken(), '')

function simulateStartupFlow({ launchOptions = {}, hasBaby }) {
  context.captureCurrentEntryInviteToken(launchOptions)
  const inviteToken = context.consumePendingInviteToken()
  if (inviteToken) {
    return `invite:${inviteToken}`
  }
  return hasBaby ? 'today' : 'create'
}

assert.equal(simulateStartupFlow({ launchOptions: {}, hasBaby: true }), 'today')
assert.equal(simulateStartupFlow({ launchOptions: {}, hasBaby: false }), 'create')
assert.equal(simulateStartupFlow({ launchOptions: { query: { scene: 'fc=scan-token' } }, hasBaby: true }), 'invite:scan-token')
assert.equal(simulateStartupFlow({ launchOptions: {}, hasBaby: true }), 'today')

assert.equal(context.isOwnerRole('OWNER'), true)
assert.equal(context.isOwnerRole('MEMBER'), false)
const ownerVm = context.toCollaborationViewModel({ currentUserRole: 'OWNER', collaboratorCount: 1 })
assert.equal(ownerVm.isOwner, true)
const memberVm = context.toCollaboratorViewModel({ collaboratorId: 2, collaboratorRole: 'MEMBER', nickname: '照顾人' })
assert.equal(memberVm.isOwner, false)

await context.createInviteForBaby(8)
await context.joinBabyCollaboration('token-2')
await context.disableInvite('token-1')
await context.removeCollaborator(8, 2)
await context.leaveBabyCollaboration(8)
const plainCalls = JSON.parse(JSON.stringify(calls))
assert.deepEqual(plainCalls, [
  { name: 'createCollaborationInvite', payload: { babyId: 8 } },
  { name: 'joinCollaborationByToken', payload: { inviteToken: 'token-2' } },
  { name: 'disableCollaborationInvite', payload: { inviteToken: 'token-1' } },
  { name: 'removeCollaborationMember', payload: { babyId: 8, collaboratorId: 2 } },
  { name: 'leaveCollaboration', payload: { babyId: 8 } }
])

const appSource = read('App.vue')
const splashSource = read('pages/splash/index.vue')
const pageSource = read('pages/baby/collaboration.vue')
const invitePageSource = read('pages/baby/collaboration-invite.vue')
const inviteUtilSource = read('utils/collaborationInvite.js')
assert.match(appSource, /captureCurrentEntryInviteToken/)
assert.match(appSource, /onShow\(options\)/)
assert.doesNotMatch(appSource, /savePendingInviteToken/)
assert.match(splashSource, /redirectCurrentEntryInviteIfNeeded/)
assert.match(splashSource, /consumePendingInviteToken/)
assert.match(splashSource, /await this\.restoreCurrentBaby\(\)/)
assert.ok(splashSource.indexOf('redirectCurrentEntryInviteIfNeeded') < splashSource.indexOf('restoreCurrentBaby'), 'Splash should check current-entry invite before baby restore only after login')
assert.doesNotMatch(splashSource, /getPendingInviteToken/)
assert.doesNotMatch(inviteUtilSource, /StorageSync|BC_PENDING/)
assert.doesNotMatch(inviteUtilSource, /setStorageSync|getStorageSync|removeStorageSync/)
assert.match(pageSource, /collaboration\.isOwner/)
assert.match(pageSource, /handleRemoveCollaborator/)
assert.match(pageSource, /handleLeave/)
assert.match(pageSource, /createInviteForBaby\(this\.currentBabyId\)/)
assert.doesNotMatch(pageSource, /collaboration-invite/)
assert.doesNotMatch(pageSource, /buildInviteConfirmUrl|FAMILY_INVITE_PAGE|redirectTo/)
assert.match(invitePageSource, /ensureSilentLogin/)
assert.match(invitePageSource, /handleConfirmJoin/)
assert.match(invitePageSource, /rejectInvalidEntry/)
assert.match(invitePageSource, /clearPendingInviteToken/)
assert.doesNotMatch(invitePageSource, /savePendingInviteToken/)
assert.match(invitePageSource, /v-if="hasValidEntry"/)
assert.match(invitePageSource, /options && options\.inviteToken/)
assert.match(invitePageSource, /extractInviteTokenFromLaunchOptions\(\{ query: options \|\| \{\} \}\)/)
assert.match(invitePageSource, /consumePendingInviteToken\(\)/)
assert.match(invitePageSource, /returnToNormalFlow/)
assert.match(invitePageSource, /uni\.reLaunch\(\{ url: '\/pages\/splash\/index' \}\)/)
const joinMethodStart = invitePageSource.indexOf('async handleConfirmJoin()')
const joinMethodSource = invitePageSource.slice(joinMethodStart, invitePageSource.indexOf('rejectInvalidEntry()', joinMethodStart))
assert.ok(joinMethodSource.indexOf('await refreshAccessibleBabiesAfterJoin()') < joinMethodSource.indexOf('this.returnToNormalFlow()'), 'Join success should refresh baby context before returning to normal startup flow')
assert.doesNotMatch(invitePageSource, /invite list|邀请列表|邀请详情管理|管理页/)
assert.doesNotMatch(appSource, /StorageSync|BC_PENDING/)

console.log('family-collaboration frontend quality tests passed')
