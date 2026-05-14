import {
  createCollaborationInviteCode,
  getCollaborationMemberList,
  getCurrentCollaboration,
  joinCollaborationByCode
} from '../api/collaboration'
import { fetchBabyList } from './babyService'
import { sanitizeVisibleText } from './textSanitizer'

const roleLabels = {
  OWNER: '主要照顾人',
  MEMBER: '照顾人'
}

function normalizeRoleLabel(role, label) {
  return roleLabels[role] || sanitizeVisibleText(label) || '照顾人'
}

export function toCollaborationViewModel(raw) {
  const data = raw || {}
  return {
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    currentUserRole: data.currentUserRole || '',
    currentUserRoleText: normalizeRoleLabel(data.currentUserRole, data.currentUserRoleLabel),
    collaboratorCount: Number(data.collaboratorCount || 0)
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
    joinedAt: data.joinedAt || ''
  }
}

export function toInviteCodeViewModel(raw) {
  const data = raw || {}
  return {
    babyId: data.babyId,
    babyName: sanitizeVisibleText(data.babyName || '宝宝'),
    inviteCode: data.inviteCode || '',
    expiresAt: data.expiresAt || ''
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

export async function createInviteCodeForBaby(babyId) {
  const response = await createCollaborationInviteCode({ babyId })
  return toInviteCodeViewModel(response && response.data ? response.data : null)
}

export async function joinBabyCollaboration(inviteCode) {
  const response = await joinCollaborationByCode({ inviteCode })
  return toJoinResultViewModel(response && response.data ? response.data : null)
}

export async function refreshAccessibleBabiesAfterJoin() {
  return fetchBabyList()
}
