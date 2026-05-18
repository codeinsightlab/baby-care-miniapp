import { FAMILY_INVITE_PAGE } from '../constants/familyEnums'

let pendingInviteToken = ''

export function normalizeInviteToken(value) {
  return String(value || '').trim()
}

export function parseInviteTokenFromScene(scene) {
  const decoded = normalizeInviteToken(decodeURIComponent(String(scene || '')))
  if (!decoded) {
    return ''
  }
  if (decoded.indexOf('=') === -1) {
    return decoded
  }
  const params = decoded.split('&').reduce((result, item) => {
    const [key, value = ''] = item.split('=')
    result[key] = value
    return result
  }, {})
  return normalizeInviteToken(params.inviteToken || params.token || params.fc)
}

export function extractInviteTokenFromLaunchOptions(options = {}) {
  const query = options.query || {}
  return normalizeInviteToken(query.inviteToken)
    || parseInviteTokenFromScene(query.scene)
}

export function captureCurrentEntryInviteToken(options = {}) {
  const token = extractInviteTokenFromLaunchOptions(options)
  if (token) {
    savePendingInviteToken(token)
    return token
  }
  clearPendingInviteToken()
  return ''
}

export function savePendingInviteToken(inviteToken) {
  const token = normalizeInviteToken(inviteToken)
  if (token) {
    pendingInviteToken = token
  }
}

export function getPendingInviteToken() {
  return pendingInviteToken
}

export function clearPendingInviteToken() {
  pendingInviteToken = ''
}

export function consumePendingInviteToken() {
  const token = getPendingInviteToken()
  clearPendingInviteToken()
  return token
}

export function buildInviteConfirmUrl(inviteToken) {
  return `${FAMILY_INVITE_PAGE}?inviteToken=${encodeURIComponent(normalizeInviteToken(inviteToken))}`
}
