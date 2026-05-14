import config, { isMiniAppDevLoginEnabled } from '../config/env'
import { clearLoginState, getToken, saveLoginResult } from './auth'
import { getErrorMessage, isServerUnavailableError } from './errorClassifier'

function redirectToLogin(reason = '登录状态已失效，请重新进入') {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentRoute = currentPage && currentPage.route

  if (currentRoute === 'pages/login/index') {
    return
  }

  uni.reLaunch({
    url: `/pages/login/index?reason=${encodeURIComponent(reason)}`
  })
}

function buildUnauthorizedError(response) {
  return {
    code: 401,
    msg: '登录状态已失效，请重新进入',
    unauthorized: true,
    response
  }
}

function buildHttpError(response) {
  const data = response && response.data
  return {
    statusCode: response && response.statusCode,
    code: data && data.code ? data.code : response && response.statusCode,
    msg: data && data.msg ? data.msg : '请求失败',
    response
  }
}

function buildNetworkError(error) {
  return {
    ...(error || {}),
    networkError: true,
    msg: '网络异常'
  }
}

function redirectIfNeeded(options, error) {
  if (options.redirectOnUnauthorized !== false) {
    redirectToLogin(error.msg)
  }
}

function requestLoginToken(url, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${config.baseUrl}${url}`,
      method: 'POST',
      data,
      success(response) {
        const { statusCode, data: responseData } = response
        if (statusCode >= 200 && statusCode < 300 && responseData && (responseData.code === 200 || responseData.code === '200')) {
          resolve(responseData.data)
          return
        }
        reject(buildHttpError(response))
      },
      fail(error) {
        reject(buildNetworkError(error))
      }
    })
  })
}

function getWxLoginCode() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success(loginResult) {
        if (!loginResult.code) {
          reject(new Error('未获取到微信登录 code'))
          return
        }
        resolve(loginResult.code)
      },
      fail(error) {
        reject(error || new Error('微信登录失败'))
      }
    })
  })
}

async function silentLogin() {
  const loginData = isMiniAppDevLoginEnabled()
    ? await requestLoginToken('/api/mini/dev-login')
    : await requestLoginToken('/api/mini/login', { code: await getWxLoginCode() })
  saveLoginResult(loginData)
  return loginData
}

async function retryAfterUnauthorized(options, error) {
  clearLoginState()
  if (options.authRetryAttempted) {
    redirectIfNeeded(options, error)
    throw error
  }
  try {
    await silentLogin()
  } catch (loginError) {
    if (isServerUnavailableError(loginError)) {
      throw loginError
    }
    redirectIfNeeded(options, loginError)
    throw loginError
  }
  return request({
    ...options,
    authRetryAttempted: true
  })
}

export default function request(options = {}) {
  const {
    redirectOnUnauthorized,
    unauthorizedReason,
    authRetryAttempted,
    ...requestOptions
  } = options
  const token = getToken()
  const header = {
    ...(requestOptions.header || {})
  }

  if (token) {
    header.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      ...requestOptions,
      url: `${config.baseUrl}${requestOptions.url || ''}`,
      header,
      success(response) {
        const { statusCode, data } = response

        if (statusCode === 401) {
          const error = buildUnauthorizedError(response)
          error.msg = unauthorizedReason || error.msg
          retryAfterUnauthorized({ ...requestOptions, redirectOnUnauthorized, unauthorizedReason, authRetryAttempted }, error)
            .then(resolve)
            .catch(reject)
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          uni.showToast({
            title: statusCode >= 500 ? '服务暂时不可用' : '请求失败',
            icon: 'none'
          })
          reject(buildHttpError(response))
          return
        }

        if (data && (data.code === 401 || data.code === '401')) {
          const error = buildUnauthorizedError(data)
          error.msg = data.msg || unauthorizedReason || error.msg
          retryAfterUnauthorized({ ...requestOptions, redirectOnUnauthorized, unauthorizedReason, authRetryAttempted }, error)
            .then(resolve)
            .catch(reject)
          return
        }

        if (data && data.code && data.code !== 200 && data.code !== '200') {
          uni.showToast({
            title: data.msg || '请求失败',
            icon: 'none'
          })
          reject(data)
          return
        }

        resolve(data)
      },
      fail(error) {
        const networkError = buildNetworkError(error)
        uni.showToast({
          title: getErrorMessage(networkError, '网络异常'),
          icon: 'none'
        })
        reject(networkError)
      }
    })
  })
}
