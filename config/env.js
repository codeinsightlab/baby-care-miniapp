// 当前 ENV 用于区分本地开发、测试和生产地址，页面和 request.js 不直接写死后端地址。
export const ENV = 'dev'

const CONFIG = {
  dev: {
    baseUrl: 'http://192.168.4.11:8080',
    miniappDevLoginEnabled: false,
    mockVoiceEnabled: false
  },
  test: {
    baseUrl: 'http://192.168.4.11:8080',
    miniappDevLoginEnabled: false,
    mockVoiceEnabled: false
  },
  prod: {
    baseUrl: 'https://springboot-vj9l-240203-4-1384307923.sh.run.tcloudbase.com',
    miniappDevLoginEnabled: false,
    mockVoiceEnabled: false
  }
}

export function isMiniAppDevLoginEnabled() {
  return CONFIG[ENV].miniappDevLoginEnabled === true && ENV !== 'prod'
}

export function isMockVoiceEnabled() {
  return CONFIG[ENV].mockVoiceEnabled === true && ENV !== 'prod'
}

export default CONFIG[ENV]
