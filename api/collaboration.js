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

export function createCollaborationInviteCode(data) {
  return request({
    url: '/api/mini/collaboration/invite-code/create',
    method: 'POST',
    data
  })
}

export function joinCollaborationByCode(data) {
  return request({
    url: '/api/mini/collaboration/join-by-code',
    method: 'POST',
    data
  })
}
