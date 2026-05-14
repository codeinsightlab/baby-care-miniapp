export function getErrorCode(error) {
  if (!error) {
    return null
  }
  return error.statusCode || error.code || (error.response && error.response.statusCode) || null
}

export function isUnauthorizedError(error) {
  const code = getErrorCode(error)
  return Boolean(error && (error.unauthorized || code === 401 || code === '401'))
}

export function isForbiddenError(error) {
  const code = getErrorCode(error)
  return code === 403 || code === '403'
}

export function isNotFoundError(error) {
  const code = getErrorCode(error)
  return code === 404 || code === '404'
}

export function isNetworkError(error) {
  return Boolean(error && (error.networkError || error.errMsg))
}

export function isServerUnavailableError(error) {
  const code = Number(getErrorCode(error))
  return isNetworkError(error) || code === 0 || code === 408 || code >= 500
}

export function shouldClearCurrentBabyId(error) {
  return isForbiddenError(error) || isNotFoundError(error)
}

export function getErrorMessage(error, fallback = '服务暂时不可用，请稍后重试') {
  return (error && (error.msg || error.message || error.errMsg)) || fallback
}
