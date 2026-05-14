import { devLogin, loginForCurrentEnv } from '../api/login'

function extractLoginData(response) {
  return response && response.data ? response.data : null
}

export async function loginForCurrentEnvResult() {
  return extractLoginData(await loginForCurrentEnv())
}

export async function devLoginResult() {
  return extractLoginData(await devLogin())
}
