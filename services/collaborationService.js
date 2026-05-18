import {
  createCollaborationInvite,
  disableCollaborationInvite,
  getCollaborationInviteDetail,
  getCollaborationMemberList,
  getCurrentCollaboration,
  joinCollaborationByToken,
  leaveCollaboration,
  removeCollaborationMember
} from '../api/collaboration'
import { FAMILY_MEMBER_ROLES, FAMILY_ROLE_LABELS } from '../constants/familyEnums'
import { fetchBabyList } from './babyService'
import { sanitizeVisibleText } from './textSanitizer'

function normalizeRoleLabel(role, label) {
  return FAMILY_ROLE_LABELS[role] || sanitizeVisibleText(label) || '照顾人'
}

export function isOwnerRole(role) {
  return role === FAMILY_MEMBER_ROLES.OWNER
}

export function toCollaborationViewModel(raw) {
  const data = raw || {}
  return {
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    currentUserRole: data.currentUserRole || '',
    currentUserRoleText: normalizeRoleLabel(data.currentUserRole, data.currentUserRoleLabel),
    collaboratorCount: Number(data.collaboratorCount || 0),
    isOwner: isOwnerRole(data.currentUserRole)
  }
}

export function toCollaboratorViewModel(raw) {
  const data = raw || {}
  const roleText = normalizeRoleLabel(data.collaboratorRole, data.collaboratorRoleLabel)
  return {
    collaboratorId: data.collaboratorId,
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    collaboratorName: sanitizeVisibleText(data.nickname || roleText),
    collaboratorAvatarUrl: data.avatarUrl || '',
    collaboratorRole: data.collaboratorRole || '',
    collaboratorRoleText: roleText,
    isOwner: isOwnerRole(data.collaboratorRole),
    joinedAt: data.joinedAt || ''
  }
}

export function toInviteViewModel(raw) {
  const data = raw || {}
  return {
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    inviteToken: data.inviteToken || '',
    miniappCodeImage: data.miniappCodeImage || '',
    expiresAt: data.expiresAt || ''
  }
}

export function toInviteDetailViewModel(raw) {
  const data = raw || {}
  return {
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    inviterNickname: sanitizeVisibleText(data.inviterNickname || '主要照顾人'),
    expiresAt: data.expiresAt || '',
    alreadyJoined: Boolean(data.alreadyJoined)
  }
}

export function toJoinResultViewModel(raw) {
  const data = raw || {}
  return {
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    collaboratorRole: data.collaboratorRole || '',
    collaboratorRoleText: normalizeRoleLabel(data.collaboratorRole, data.collaboratorRoleLabel)
  }
}

export async function fetchCurrentCollaboration(babyId) {
  const response = await getCurrentCollaboration(babyId)
  return toCollaborationViewModel(response && response.data ? response.data : null)
}

export async function fetchCollaboratorList(babyId) {
  const response = await getCollaborationMemberList(babyId)
  return (Array.isArray(response.data) ? response.data : [])
    .map(toCollaboratorViewModel)
}

export async function createInviteForBaby(babyId) {
  const response = await createCollaborationInvite({ babyId })
  return toInviteViewModel(response && response.data ? response.data : null)
}

export async function fetchInviteDetail(inviteToken) {
  const response = await getCollaborationInviteDetail(inviteToken)
  return toInviteDetailViewModel(response && response.data ? response.data : null)
}

export async function joinBabyCollaboration(inviteToken) {
  const response = await joinCollaborationByToken({ inviteToken })
  return toJoinResultViewModel(response && response.data ? response.data : null)
}

export async function disableInvite(inviteToken) {
  return disableCollaborationInvite({ inviteToken })
}

export async function removeCollaborator(babyId, collaboratorId) {
  return removeCollaborationMember({ babyId, collaboratorId })
}

export async function leaveBabyCollaboration(babyId) {
  return leaveCollaboration({ babyId })
}

export async function refreshAccessibleBabiesAfterJoin() {
  return fetchBabyList()
}
