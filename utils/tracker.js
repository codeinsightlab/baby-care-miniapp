const EVENT_CODE_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/

const SENSITIVE_KEYS = [
  'token',
  'openid',
  'open_id',
  'unionid',
  'union_id',
  'phone',
  'mobile',
  'tel',
  'name',
  'nick',
  'nickname',
  'remark',
  'note',
  'content',
  'text',
  'voice',
  'transcript',
  'address',
  'idcard',
  'id_card',
  'identity',
  'cookie',
  'session',
  'header',
  'authorization',
  'code',
  'secret',
  'appsecret',
  'app_secret'
]

function isDevelopment() {
  return typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production'
}

function warn(message, detail) {
  if (!isDevelopment() || typeof console === 'undefined' || typeof console.warn !== 'function') {
    return
  }

  console.warn('[track]', message, detail || '')
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function isSensitiveKey(key) {
  const normalizedKey = String(key || '').replace(/[-\s]/g, '_').toLowerCase()
  return SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))
}

export function isValidEventCode(eventCode) {
  return typeof eventCode === 'string' && EVENT_CODE_PATTERN.test(eventCode)
}

export function sanitizePayload(payload = {}, seen = []) {
  if (!isPlainObject(payload)) {
    return {}
  }

  if (seen.indexOf(payload) !== -1) {
    return {}
  }

  const nextSeen = seen.concat(payload)

  return Object.keys(payload).reduce((result, key) => {
    if (isSensitiveKey(key)) {
      return result
    }

    const value = payload[key]

    if (Array.isArray(value)) {
      result[key] = value.map((item) => (isPlainObject(item) ? sanitizePayload(item, nextSeen) : item))
      return result
    }

    if (isPlainObject(value)) {
      result[key] = sanitizePayload(value, nextSeen)
      return result
    }

    result[key] = value
    return result
  }, {})
}

export function track(eventCode, payload = {}) {
  try {
    if (typeof eventCode !== 'string' || !eventCode.trim()) {
      warn('eventCode must be a non-empty string', eventCode)
      return
    }

    if (!isValidEventCode(eventCode)) {
      warn('eventCode should use snake_case', eventCode)
    }

    const safePayload = sanitizePayload(payload)

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log('[track]', eventCode, safePayload)
    }
  } catch (error) {
    warn('track failed without blocking business flow', error && error.message)
  }
}

export function readTrackDataset(event) {
  const dataset = event && event.currentTarget && event.currentTarget.dataset
  const eventCode = dataset && dataset.track

  if (!eventCode) {
    return null
  }

  const payload = { ...dataset }
  delete payload.track

  return {
    eventCode,
    payload: sanitizePayload(payload)
  }
}

export function trackClickFromDataset(event) {
  const trackData = readTrackDataset(event)

  if (!trackData) {
    return
  }

  track(trackData.eventCode, trackData.payload)
}
