export function isQueryValuePresent(value) {
  return value !== undefined && value !== null && value !== ''
}

export function buildQueryParams(params = {}) {
  return Object.keys(params).reduce((result, key) => {
    const value = params[key]
    if (isQueryValuePresent(value)) {
      result[key] = value
    }
    return result
  }, {})
}

export function buildQueryString(params = {}) {
  const normalizedParams = buildQueryParams(params)
  return Object.keys(normalizedParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(normalizedParams[key])}`)
    .join('&')
}

export function appendQueryString(url, params = {}) {
  const queryString = buildQueryString(params)
  return queryString ? `${url}?${queryString}` : url
}
