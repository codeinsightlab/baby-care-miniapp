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
assert.equal(context.FAMILY_INVITE_STATUS.ACTIVE, 'ACTIVE')
assert.equal(context.FAMILY_INVITE_STATUS.EXPIRED, 'EXPIRED')
assert.equal(context.parseInviteTokenFromScene('abc123'), 'abc123')
assert.equal(context.parseInviteTokenFromScene('fc=abc123'), 'abc123')
assert.equal(context.parseInviteTokenFromScene('inviteToken%3Dtok'), 'tok')
assert.equal(context.parseInviteTokenFromScene('token=tok-2&from=qr'), 'tok-2')
assert.equal(context.parseInviteTokenFromScene('fc='), '')
assert.equal(context.parseInviteTokenFromScene(''), '')
assert.equal(context.extractInviteTokenFromLaunchOptions({ query: { scene: 'token%3Dscene-token' } }), 'scene-token')
assert.equal(context.extractInviteTokenFromLaunchOptions({ query: { inviteToken: ' query-token ' } }), 'query-token')
assert.equal(context.extractInviteTokenFromLaunchOptions({ scene: '1001' }), '')
assert.equal(context.extractInviteTokenFromLaunchOptions({ scene: 1001 }), '')
assert.equal(context.extractInviteTokenFromLaunchOptions({ scene: 'fc=not-a-launch-token' }), '')

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
  return hasBaby ? 'today' : 'today-empty'
}

assert.equal(simulateStartupFlow({ launchOptions: {}, hasBaby: true }), 'today')
assert.equal(simulateStartupFlow({ launchOptions: {}, hasBaby: false }), 'today-empty')
assert.equal(simulateStartupFlow({ launchOptions: { query: { scene: 'fc=scan-token' } }, hasBaby: true }), 'invite:scan-token')
assert.equal(simulateStartupFlow({ launchOptions: { scene: 1001 }, hasBaby: true }), 'today')
assert.equal(simulateStartupFlow({ launchOptions: { scene: 1001 }, hasBaby: false }), 'today-empty')
assert.equal(simulateStartupFlow({ launchOptions: {}, hasBaby: true }), 'today')
assert.equal(context.consumePendingInviteToken(), '')

function simulateInvitePageOnLoad(options = {}) {
  const inviteToken = context.normalizeInviteToken(options && options.inviteToken)
    || context.extractInviteTokenFromLaunchOptions({ query: options || {} })
    || context.consumePendingInviteToken()
  context.clearPendingInviteToken()
  return {
    inviteToken,
    hasValidEntry: Boolean(inviteToken),
    nextRoute: inviteToken ? 'invite-confirm' : 'normal-flow'
  }
}

assert.deepEqual(simulateInvitePageOnLoad({}), {
  inviteToken: '',
  hasValidEntry: false,
  nextRoute: 'normal-flow'
})
context.savePendingInviteToken('pending-once')
assert.deepEqual(simulateInvitePageOnLoad({}), {
  inviteToken: 'pending-once',
  hasValidEntry: true,
  nextRoute: 'invite-confirm'
})
assert.equal(context.consumePendingInviteToken(), '')
assert.deepEqual(simulateInvitePageOnLoad({ scene: 'token%3Dscene-confirm' }), {
  inviteToken: 'scene-confirm',
  hasValidEntry: true,
  nextRoute: 'invite-confirm'
})
assert.equal(context.getPendingInviteToken(), '')

assert.equal(context.isOwnerRole('OWNER'), true)
assert.equal(context.isOwnerRole('MEMBER'), false)
const ownerVm = context.toCollaborationViewModel({ currentUserRole: 'OWNER', collaboratorCount: 1 })
assert.equal(ownerVm.isOwner, true)
const memberVm = context.toCollaboratorViewModel({ collaboratorId: 2, collaboratorRole: 'MEMBER', nickname: '照顾人' })
assert.equal(memberVm.isOwner, false)

function canRemoveCollaborator({ isOwner, currentUserId, collaborator }) {
  const collaboratorId = collaborator && collaborator.collaboratorId
  return Boolean(
    isOwner
      && collaborator
      && !collaborator.isOwner
      && String(collaboratorId) !== String(currentUserId)
  )
}

assert.equal(canRemoveCollaborator({ isOwner: true, currentUserId: 1, collaborator: { collaboratorId: 2, isOwner: false } }), true)
assert.equal(canRemoveCollaborator({ isOwner: true, currentUserId: 1, collaborator: { collaboratorId: 1, isOwner: false } }), false)
assert.equal(canRemoveCollaborator({ isOwner: true, currentUserId: 1, collaborator: { collaboratorId: '1', isOwner: false } }), false)
assert.equal(canRemoveCollaborator({ isOwner: true, currentUserId: 1, collaborator: { collaboratorId: 3, isOwner: true } }), false)
assert.equal(canRemoveCollaborator({ isOwner: false, currentUserId: 1, collaborator: { collaboratorId: 2, isOwner: false } }), false)

function canLeave({ currentBabyId, isOwner }) {
  return Boolean(currentBabyId && !isOwner)
}

assert.equal(canLeave({ currentBabyId: 8, isOwner: false }), true)
assert.equal(canLeave({ currentBabyId: 8, isOwner: true }), false)
assert.equal(canLeave({ currentBabyId: '', isOwner: false }), false)

function simulateCreateBabyFailure(error) {
  const actions = []
  const isUnauthorized = error && (error.unauthorized || error.statusCode === 401 || error.code === 401 || error.code === '401')
  if (isUnauthorized) {
    return actions
  }
  actions.push({ type: 'toast', title: error.msg || error.message || '创建失败' })
  return actions
}

assert.deepEqual(simulateCreateBabyFailure({ msg: '当前账号已加入一个家庭空间，暂不支持创建新的家庭空间' }), [
  { type: 'toast', title: '当前账号已加入一个家庭空间，暂不支持创建新的家庭空间' }
])

await context.createInviteForBaby(8)
await context.joinBabyCollaboration('token-2')
await context.removeCollaborator(8, 2)
await context.leaveBabyCollaboration(8)
const plainCalls = JSON.parse(JSON.stringify(calls))
assert.deepEqual(plainCalls, [
  { name: 'createCollaborationInvite', payload: { babyId: 8 } },
  { name: 'joinCollaborationByToken', payload: { inviteToken: 'token-2' } },
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
assert.doesNotMatch(inviteUtilSource, /parseInviteTokenFromScene\(options\.scene\)/)
assert.doesNotMatch(inviteUtilSource, /options\.scene/)
assert.match(splashSource, /redirectCurrentEntryInviteIfNeeded/)
assert.match(splashSource, /consumePendingInviteToken/)
assert.match(splashSource, /await this\.restoreCurrentBaby\(\)/)
assert.ok(splashSource.indexOf('redirectCurrentEntryInviteIfNeeded') < splashSource.indexOf('restoreCurrentBaby'), 'Splash should check current-entry invite before baby restore only after login')
assert.doesNotMatch(splashSource, /getPendingInviteToken/)
assert.doesNotMatch(splashSource, /goCreate|pages\/baby\/create/)
assert.doesNotMatch(inviteUtilSource, /StorageSync|BC_PENDING/)
assert.doesNotMatch(inviteUtilSource, /setStorageSync|getStorageSync|removeStorageSync/)
assert.doesNotMatch(appSource, /1001/)
assert.doesNotMatch(splashSource, /1001/)
assert.match(pageSource, /collaboration\.isOwner/)
assert.match(pageSource, /v-if="collaboration\.isOwner"/)
assert.doesNotMatch(pageSource, /handleDisableInvite|disablingInvite|使本次邀请失效|邀请已失效/)
assert.doesNotMatch(inviteUtilSource, /USED|CONSUMED/)
assert.doesNotMatch(read('api/collaboration.js'), /invite\/disable|disableCollaborationInvite/)
assert.doesNotMatch(read('services/collaborationService.js'), /disableInvite|disableCollaborationInvite/)
assert.doesNotMatch(read('constants/familyEnums.js'), /DISABLED/)
assert.match(pageSource, /v-if="canLeave"/)
assert.match(pageSource, /return Boolean\(\s*this\.currentBabyId && !this\.collaboration\.isOwner\s*\)/)
assert.match(pageSource, /handleRemoveCollaborator/)
assert.match(pageSource, /handleLeave/)
assert.match(pageSource, /String\(collaboratorId\) !== String\(this\.currentUserId\)/)
assert.match(pageSource, /removeCollaborator\(this\.currentBabyId, item\.collaboratorId\)/)
assert.match(pageSource, /leaveBabyCollaboration\(this\.currentBabyId\)/)
assert.match(pageSource, /error\.msg \|\| error\.message \|\| '移除失败'/)
assert.match(pageSource, /error\.msg \|\| error\.message \|\| '退出失败'/)
assert.match(pageSource, /createInviteForBaby\(this\.currentBabyId\)/)
assert.doesNotMatch(pageSource, /collaboration-invite/)
assert.doesNotMatch(pageSource, /buildInviteConfirmUrl|FAMILY_INVITE_PAGE|redirectTo/)
assert.doesNotMatch(pageSource, /OWNER|MEMBER|ACTIVE|REMOVED|LEFT/)

const collaborationServiceSource = read('services/collaborationService.js')
assert.match(collaborationServiceSource, /FAMILY_MEMBER_ROLES, FAMILY_ROLE_LABELS/)
assert.match(collaborationServiceSource, /role === FAMILY_MEMBER_ROLES\.OWNER/)
assert.match(collaborationServiceSource, /removeCollaborationMember\(\{ babyId, collaboratorId \}\)/)
assert.match(collaborationServiceSource, /leaveCollaboration\(\{ babyId \}\)/)
const familyEnumSource = read('constants/familyEnums.js')
assert.match(familyEnumSource, /FAMILY_MEMBER_ROLES = Object\.freeze/)
assert.match(familyEnumSource, /FAMILY_MEMBER_STATUS = Object\.freeze/)
assert.match(familyEnumSource, /ACTIVE: 'ACTIVE'/)
assert.match(familyEnumSource, /REMOVED: 'REMOVED'/)
assert.match(familyEnumSource, /LEFT: 'LEFT'/)

const createPageSource = read('pages/baby/create.vue')
assert.match(createPageSource, /createBabyInCurrentFamily\(this\.form\)/)
assert.doesNotMatch(createPageSource, /hasActiveFamily/)
assert.doesNotMatch(createPageSource, /当前账号已加入一个宝宝协作，暂不支持创建新的宝宝档案/)
assert.match(createPageSource, /error\.msg \|\| error\.message \|\| '创建失败'/)
const handleSubmitSource = createPageSource.slice(createPageSource.indexOf('async handleSubmit()'), createPageSource.indexOf('goBack()'))
assert.ok(handleSubmitSource.indexOf('uni.switchTab') < handleSubmitSource.indexOf('catch (error)'), 'create page should only navigate after successful create')
assert.doesNotMatch(handleSubmitSource.slice(handleSubmitSource.indexOf('catch (error)')), /setCurrentBabyId|switchTab\(\{[\s\S]*\/pages\/today\/index/)
assert.match(invitePageSource, /ensureSilentLogin/)
assert.match(invitePageSource, /handleConfirmJoin/)
assert.match(invitePageSource, /resolveActiveFamilyEntry/)
assert.match(invitePageSource, /invite\.alreadyJoined/)
assert.match(invitePageSource, /当前账号已加入一个宝宝协作，暂不支持加入新的宝宝协作/)
assert.match(invitePageSource, /refreshAccessibleBabiesAfterJoin\(\)/)
assert.match(invitePageSource, /rejectInvalidEntry/)
assert.match(invitePageSource, /clearPendingInviteToken/)
assert.doesNotMatch(invitePageSource, /savePendingInviteToken/)
assert.match(invitePageSource, /v-if="hasValidEntry"/)
assert.match(invitePageSource, /options && options\.inviteToken/)
assert.match(invitePageSource, /extractInviteTokenFromLaunchOptions\(\{ query: options \|\| \{\} \}\)/)
assert.match(invitePageSource, /consumePendingInviteToken\(\)/)
assert.match(invitePageSource, /returnToNormalFlow/)
assert.match(invitePageSource, /uni\.reLaunch\(\{ url: '\/pages\/splash\/index' \}\)/)
assert.match(invitePageSource, /catch \(error\) \{[\s\S]*clearPendingInviteToken\(\)[\s\S]*this\.returnToNormalFlow\(\)/)
assert.match(invitePageSource, /rejectInvalidEntry\(\) \{[\s\S]*clearPendingInviteToken\(\)[\s\S]*this\.returnToNormalFlow\(\)/)
assert.match(invitePageSource, /goBabyList\(\) \{[\s\S]*clearPendingInviteToken\(\)[\s\S]*this\.returnToNormalFlow\(\)/)
const joinMethodStart = invitePageSource.indexOf('async handleConfirmJoin()')
const joinMethodSource = invitePageSource.slice(joinMethodStart, invitePageSource.indexOf('rejectInvalidEntry()', joinMethodStart))
assert.ok(joinMethodSource.indexOf('await refreshAccessibleBabiesAfterJoin()') < joinMethodSource.indexOf('this.returnToNormalFlow()'), 'Join success should refresh baby context before returning to normal startup flow')
assert.ok(joinMethodSource.includes('clearPendingInviteToken()'), 'Join success should clear pending invite token before returning to normal flow')
assert.doesNotMatch(invitePageSource, /invite list|邀请列表|邀请详情管理|管理页/)
assert.doesNotMatch(appSource, /StorageSync|BC_PENDING/)

const loginSource = read('pages/login/index.vue')
assert.match(loginSource, /ensureSilentLogin/)
assert.match(loginSource, /uni\.reLaunch\(\{[\s\S]*url: '\/pages\/splash\/index'/)
assert.doesNotMatch(loginSource, /switchTab\(\{[\s\S]*\/pages\/today\/index/)

console.log('family-collaboration frontend quality tests passed')
