export const FAMILY_MEMBER_ROLES = Object.freeze({
  OWNER: 'OWNER',
  MEMBER: 'MEMBER'
})

export const FAMILY_MEMBER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED',
  LEFT: 'LEFT'
})

export const FAMILY_INVITE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  DISABLED: 'DISABLED'
})

export const FAMILY_ROLE_LABELS = Object.freeze({
  [FAMILY_MEMBER_ROLES.OWNER]: '主要照顾人',
  [FAMILY_MEMBER_ROLES.MEMBER]: '照顾人'
})

export const FAMILY_INVITE_PAGE = '/pages/baby/collaboration-invite'
