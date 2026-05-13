import config from '../config/env'
import { clearAuth, getToken } from './auth'

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

function handleUnauthorized(options, error) {
  clearAuth()
  if (options.redirectOnUnauthorized !== false) {
    redirectToLogin(error.msg)
  }
}

export default function request(options = {}) {
  const {
    redirectOnUnauthorized,
    unauthorizedReason,
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
          handleUnauthorized({ redirectOnUnauthorized }, error)
          reject(error)
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          uni.showToast({
            title: '请求失败',
            icon: 'none'
          })
          reject(response)
          return
        }

        if (data && (data.code === 401 || data.code === '401')) {
          const error = buildUnauthorizedError(data)
          error.msg = data.msg || unauthorizedReason || error.msg
          handleUnauthorized({ redirectOnUnauthorized }, error)
          reject(error)
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
        uni.showToast({
          title: '网络异常',
          icon: 'none'
        })
        reject(error)
      }
    })
  })
}
