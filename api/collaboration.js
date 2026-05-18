import request from '../utils/request'

export function getCurrentCollaboration(babyId) {
  return request({
    url: `/api/mini/collaboration/current?babyId=${encodeURIComponent(babyId)}`,
    method: 'GET'
  })
}

export function getCollaborationMemberList(babyId) {
  return request({
    url: `/api/mini/collaboration/member/list?babyId=${encodeURIComponent(babyId)}`,
    method: 'GET'
  })
}

export function createCollaborationInvite(data) {
  return request({
    url: '/api/mini/collaboration/invite/create',
    method: 'POST',
    data
  })
}

export function getCollaborationInviteDetail(inviteToken) {
  return request({
    url: `/api/mini/collaboration/invite/detail?inviteToken=${encodeURIComponent(inviteToken)}`,
    method: 'GET'
  })
}

export function joinCollaborationByToken(data) {
  return request({
    url: '/api/mini/collaboration/invite/join',
    method: 'POST',
    data
  })
}

export function disableCollaborationInvite(data) {
  return request({
    url: '/api/mini/collaboration/invite/disable',
    method: 'POST',
    data
  })
}

export function removeCollaborationMember(data) {
  return request({
    url: '/api/mini/collaboration/member/remove',
    method: 'POST',
    data
  })
}

export function leaveCollaboration(data) {
  return request({
    url: '/api/mini/collaboration/member/leave',
    method: 'POST',
    data
  })
}
