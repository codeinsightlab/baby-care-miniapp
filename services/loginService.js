import { devLogin, loginForCurrentEnv } from '../api/login'
import { saveLoginResult } from '../utils/auth'

function extractLoginData(response) {
  return response && response.data ? response.data : null
}

export async function loginForCurrentEnvResult() {
  return extractLoginData(await loginForCurrentEnv())
}

export async function silentLoginResult() {
  return loginForCurrentEnvResult()
}

export async function ensureSilentLogin() {
  const loginData = await silentLoginResult()
  saveLoginResult(loginData)
  return loginData
}

export async function devLoginResult() {
  return extractLoginData(await devLogin())
}
