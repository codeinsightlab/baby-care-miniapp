const TOKEN_KEY = 'BC_MINIAPP_TOKEN'
const USER_KEY = 'BC_MINIAPP_USER'
const CURRENT_BABY_ID_KEY = 'BC_CURRENT_BABY_ID'

export const storageKeys = {
  token: TOKEN_KEY,
  user: USER_KEY,
  currentBabyId: CURRENT_BABY_ID_KEY
}

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY)
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

export function getUser() {
  return uni.getStorageSync(USER_KEY)
}

export function setUser(user) {
  uni.setStorageSync(USER_KEY, user)
}

export function saveLoginResult(data) {
  if (!data || !data.token || !data.user) {
    throw new Error('登录返回数据不完整')
  }
  setToken(data.token)
  setUser(data.user)
}

export function clearUser() {
  uni.removeStorageSync(USER_KEY)
}

export function clearLoginState() {
  clearToken()
  clearUser()
}

export function clearCurrentBabyId() {
  uni.removeStorageSync(CURRENT_BABY_ID_KEY)
}

export function clearAuth() {
  clearLoginState()
  clearCurrentBabyId()
}
