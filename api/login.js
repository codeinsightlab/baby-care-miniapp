import request from '../utils/request'
import { isMiniAppDevLoginEnabled } from '../config/env'

export function getWxLoginCode() {
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

export function miniLogin(code) {
  return request({
    url: '/api/mini/login',
    method: 'POST',
    data: {
      code
    }
  })
}

export function devLogin() {
  return request({
    url: '/api/mini/dev-login',
    method: 'POST'
  })
}

export async function miniLoginWithWechat() {
  const code = await getWxLoginCode()
  return miniLogin(code)
}

export function loginForCurrentEnv() {
  if (isMiniAppDevLoginEnabled()) {
    return devLogin()
  }
  return miniLoginWithWechat()
}
