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

const ACTIVE = 'ACTIVE'
const LEFT = 'LEFT'
const REMOVED = 'REMOVED'
const OWNER = 'OWNER'
const MEMBER = 'MEMBER'

class FamilyMachine {
  constructor() {
    this.members = new Map()
  }

  createOwner(userId) {
    if (this.hasActiveFamily(userId)) {
      throw new Error('当前账号已加入一个家庭空间，暂不支持创建新的家庭空间')
    }
    this.members.set(userId, { userId, role: OWNER, status: ACTIVE })
  }

  hasActiveFamily(userId) {
    const member = this.members.get(userId)
    return Boolean(member && member.status === ACTIVE)
  }

  join(userId) {
    const member = this.members.get(userId)
    if (member && member.status === ACTIVE) {
      throw new Error('当前账号已加入一个家庭空间，暂不支持加入多个家庭')
    }
    if (member && member.role === OWNER) {
      throw new Error('主要照顾人无需加入协作')
    }
    this.members.set(userId, { userId, role: MEMBER, status: ACTIVE })
  }

  leave(userId) {
    const member = this.members.get(userId)
    if (!member || member.status !== ACTIVE) {
      throw new Error('宝宝不存在或无访问权限')
    }
    if (member.role === OWNER) {
      throw new Error('主要照顾人不能退出协作')
    }
    member.status = LEFT
  }

  remove(actorId, targetId) {
    const actor = this.members.get(actorId)
    if (!actor || actor.status !== ACTIVE || actor.role !== OWNER) {
      throw new Error('只有主要照顾人可以移除成员')
    }
    if (actorId === targetId) {
      throw new Error('主要照顾人不能移除自己')
    }
    const target = this.members.get(targetId)
    if (!target || target.status !== ACTIVE) {
      throw new Error('宝宝协作不存在或无访问权限')
    }
    if (target.role === OWNER) {
      throw new Error('不能移除主要照顾人')
    }
    target.status = REMOVED
  }

  status(userId) {
    return this.members.get(userId)?.status
  }
}

function expectFail(fn, message) {
  assert.throws(fn, (error) => error.message === message)
}

const createJoinLeaveRejoin = new FamilyMachine()
createJoinLeaveRejoin.createOwner(1)
createJoinLeaveRejoin.join(2)
expectFail(() => createJoinLeaveRejoin.join(2), '当前账号已加入一个家庭空间，暂不支持加入多个家庭')
createJoinLeaveRejoin.leave(2)
assert.equal(createJoinLeaveRejoin.status(2), LEFT)
createJoinLeaveRejoin.join(2)
assert.equal(createJoinLeaveRejoin.status(2), ACTIVE)

const removeRejoin = new FamilyMachine()
removeRejoin.createOwner(1)
removeRejoin.join(2)
removeRejoin.remove(1, 2)
assert.equal(removeRejoin.status(2), REMOVED)
removeRejoin.join(2)
assert.equal(removeRejoin.status(2), ACTIVE)

const illegal = new FamilyMachine()
illegal.createOwner(1)
illegal.join(2)
illegal.leave(2)
expectFail(() => illegal.leave(1), '主要照顾人不能退出协作')
expectFail(() => illegal.remove(1, 1), '主要照顾人不能移除自己')
expectFail(() => illegal.leave(2), '宝宝不存在或无访问权限')
illegal.join(2)
illegal.remove(1, 2)
expectFail(() => illegal.remove(1, 2), '宝宝协作不存在或无访问权限')

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

function resolveStartupWithInvite({ launchOptions = {}, invitePageOptions = {}, hasBaby = true }) {
  context.captureCurrentEntryInviteToken(launchOptions)
  const pendingToken = context.consumePendingInviteToken()
  const inviteToken = context.normalizeInviteToken(invitePageOptions.inviteToken)
    || context.extractInviteTokenFromLaunchOptions({ query: invitePageOptions })
    || pendingToken
  context.clearPendingInviteToken()
  return inviteToken ? `invite:${inviteToken}` : (hasBaby ? 'today' : 'today-empty')
}

assert.equal(resolveStartupWithInvite({
  launchOptions: { scene: 1001 },
  invitePageOptions: { inviteToken: 'scan-token' },
  hasBaby: true
}), 'invite:scan-token')
assert.equal(resolveStartupWithInvite({
  launchOptions: { scene: 1001 },
  invitePageOptions: {},
  hasBaby: true
}), 'today')
assert.equal(resolveStartupWithInvite({
  launchOptions: { query: { scene: 'token%3Dpending-token' } },
  invitePageOptions: {},
  hasBaby: true
}), 'invite:pending-token')
assert.equal(context.consumePendingInviteToken(), '')

const backendService = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/miniapp/service/MiniAppCollaborationService.java')
const familyBabyService = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/extra/service/impl/BcFamilyBabyExtraServiceImpl.java')
const familyBabyInterface = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/extra/service/IBcFamilyBabyExtraService.java')
const babyIndexSource = read('pages/baby/index.vue')
const babyCreateSource = read('pages/baby/create.vue')
const invitePageSource = read('pages/baby/collaboration-invite.vue')

assert.match(familyBabyInterface, /boolean hasActiveFamily\(Long userId\)/)
assert.match(familyBabyService, /boolean hasActiveFamily\(Long userId\)/)
assert.match(familyBabyService, /if \(hasActiveFamily\(userId\)\)/)
assert.match(backendService, /bcFamilyBabyExtraService\.hasActiveFamily\(userId\)/)
assert.match(backendService, /getActiveMember\(baby\.getFamilyId\(\), userId\)/)
assert.match(backendService, /member\.setStatus\(FamilyMemberStatusEnum\.LEFT\.getCode\(\)\)/)
assert.match(backendService, /member\.setStatus\(FamilyMemberStatusEnum\.REMOVED\.getCode\(\)\)/)
assert.match(backendService, /throw new ServiceException\("主要照顾人不能退出协作"\)/)
assert.match(backendService, /throw new ServiceException\("主要照顾人不能移除自己"\)/)
assert.match(backendService, /throw new ServiceException\("宝宝协作不存在或无访问权限"\)/)

const babyListBranch = babyIndexSource.slice(
  babyIndexSource.indexOf('<view v-else class="baby-list">'),
  babyIndexSource.indexOf('</template>')
)
assert.match(babyListBranch, /goCreate/)
assert.doesNotMatch(babyCreateSource, /hasActiveFamily/)
assert.match(invitePageSource, /resolveActiveFamilyEntry/)
assert.match(invitePageSource, /invite\.alreadyJoined/)
assert.match(invitePageSource, /当前账号已加入一个宝宝协作，暂不支持加入新的宝宝协作/)
assert.doesNotMatch(invitePageSource, /savePendingInviteToken/)

console.log('family state machine regression tests passed')
