const REMINDER_SUBSCRIBE_TEMPLATE_IDS = {
  reminderNotice: ''
}

const SUBSCRIBE_THROTTLE_MS = 30 * 1000
const lastRequestAtByScene = {}

function normalizeScene(scene) {
  if (typeof scene !== 'string' || !scene.trim()) {
    return 'unknown'
  }

  return scene.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
}

function isMpWeixin() {
  if (typeof wx === 'undefined' || typeof wx.getSystemInfoSync !== 'function') {
    return false
  }

  try {
    return !!wx.getSystemInfoSync()
  } catch (error) {
    return false
  }
}

function getSubscribeRequester() {
  if (typeof uni !== 'undefined' && typeof uni.requestSubscribeMessage === 'function') {
    return (options) => uni.requestSubscribeMessage(options)
  }

  if (typeof wx !== 'undefined' && typeof wx.requestSubscribeMessage === 'function') {
    return (options) => wx.requestSubscribeMessage(options)
  }

  return null
}

function getReminderTemplateIds() {
  return Object.keys(REMINDER_SUBSCRIBE_TEMPLATE_IDS)
    .map((key) => REMINDER_SUBSCRIBE_TEMPLATE_IDS[key])
    .filter((templateId) => typeof templateId === 'string' && templateId.trim())
}

function getErrorMessage(error) {
  if (!error) {
    return ''
  }

  if (typeof error.errMsg === 'string') {
    return error.errMsg
  }

  if (typeof error.message === 'string') {
    return error.message
  }

  return String(error)
}

function callSubscribeMessage(requester, tmplIds) {
  return new Promise((resolve, reject) => {
    let settled = false
    const safeResolve = (result) => {
      if (settled) {
        return
      }
      settled = true
      resolve(result)
    }
    const safeReject = (error) => {
      if (settled) {
        return
      }
      settled = true
      reject(error)
    }

    try {
      const requestResult = requester({
        tmplIds,
        success: safeResolve,
        fail: safeReject
      })

      if (requestResult && typeof requestResult.then === 'function') {
        requestResult.then(safeResolve).catch(safeReject)
      }
    } catch (error) {
      safeReject(error)
    }
  })
}

export function canRequestSubscribe() {
  if (!isMpWeixin()) {
    return {
      ok: false,
      status: 'unsupported',
      reason: 'not_mp_weixin'
    }
  }

  if (!getSubscribeRequester()) {
    return {
      ok: false,
      status: 'unsupported',
      reason: 'api_unavailable'
    }
  }

  return {
    ok: true,
    status: 'supported'
  }
}

export function normalizeSubscribeResult(result = {}) {
  const acceptedTemplateIds = []
  const rejectedTemplateIds = []

  Object.keys(result || {}).forEach((key) => {
    if (key === 'errMsg') {
      return
    }

    if (result[key] === 'accept') {
      acceptedTemplateIds.push(key)
      return
    }

    if (result[key] === 'reject' || result[key] === 'ban') {
      rejectedTemplateIds.push(key)
    }
  })

  if (acceptedTemplateIds.length > 0) {
    return {
      ok: true,
      status: 'accepted',
      acceptedTemplateIds,
      rejectedTemplateIds
    }
  }

  if (rejectedTemplateIds.length > 0) {
    return {
      ok: false,
      status: 'rejected',
      acceptedTemplateIds,
      rejectedTemplateIds
    }
  }

  return {
    ok: false,
    status: 'unknown',
    acceptedTemplateIds,
    rejectedTemplateIds
  }
}

export async function requestReminderSubscribe(scene = 'reminder') {
  const safeScene = normalizeScene(scene)
  const capability = canRequestSubscribe()

  if (!capability.ok) {
    return {
      ...capability,
      scene: safeScene
    }
  }

  const tmplIds = getReminderTemplateIds()
  if (tmplIds.length === 0) {
    return {
      ok: false,
      status: 'unconfigured',
      reason: 'template_id_empty',
      scene: safeScene
    }
  }

  const now = Date.now()
  const lastRequestAt = lastRequestAtByScene[safeScene] || 0
  if (now - lastRequestAt < SUBSCRIBE_THROTTLE_MS) {
    return {
      ok: false,
      status: 'throttled',
      reason: 'repeat_click',
      scene: safeScene
    }
  }

  lastRequestAtByScene[safeScene] = now

  try {
    const result = await callSubscribeMessage(getSubscribeRequester(), tmplIds)
    return {
      ...normalizeSubscribeResult(result),
      scene: safeScene
    }
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      reason: 'request_failed',
      scene: safeScene,
      errMsg: getErrorMessage(error)
    }
  }
}
