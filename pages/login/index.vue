<template>
  <view class="page login-page">
    <view class="login-card">
      <view class="login-icon">!</view>
      <view class="page-title">需要重新确认</view>
      <view class="page-placeholder">{{ reasonText }}</view>
      <view class="login-note">请重新进入，我们会继续同步宝宝数据。</view>
      <button class="page-action login-action" type="primary" :loading="loading" :disabled="loading" @click="handleRetry">
        重新进入
      </button>
      <button
        v-if="showDevLogin"
        class="dev-login-action"
        :loading="devLoginLoading"
        :disabled="loading || devLoginLoading"
        @click="handleDevLogin"
      >
        开发调试登录
      </button>
    </view>
  </view>
</template>

<script>
import { isMiniAppDevLoginEnabled } from '../../config/env'
import { devLoginResult, loginForCurrentEnvResult } from '../../services/loginService'
import { clearAuth, saveLoginResult } from '../../utils/auth'

export default {
  name: 'LoginPage',
  data() {
    return {
      loading: false,
      devLoginLoading: false,
      reasonText: '进入宝宝空间失败，请重新确认后再试。'
    }
  },
  computed: {
    showDevLogin() {
      return isMiniAppDevLoginEnabled()
    }
  },
  onLoad(options) {
    if (options && options.reason) {
      this.reasonText = decodeURIComponent(options.reason)
    }
  },
  methods: {
    async handleRetry() {
      if (this.loading) {
        return
      }
      this.loading = true
      clearAuth()
      try {
        saveLoginResult(await loginForCurrentEnvResult())
        uni.switchTab({
          url: '/pages/today/index'
        })
      } catch (error) {
        this.reasonText = error.msg || error.message || '进入失败，请重新确认后再试。'
        uni.showToast({
          title: this.reasonText,
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    async handleDevLogin() {
      if (this.loading || this.devLoginLoading) {
        return
      }
      this.devLoginLoading = true
      clearAuth()
      try {
        saveLoginResult(await devLoginResult())
        uni.switchTab({
          url: '/pages/today/index'
        })
      } catch (error) {
        this.reasonText = error.msg || error.message || '调试登录失败，请检查后端开发配置。'
        uni.showToast({
          title: this.reasonText,
          icon: 'none'
        })
      } finally {
        this.devLoginLoading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  justify-content: center;
  background: #fff8f1;
}

.login-card {
  box-sizing: border-box;
  width: 100%;
  padding: 44rpx 36rpx 40rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 18rpx 46rpx rgba(96, 124, 114, 0.1);
}

.login-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  margin-bottom: 28rpx;
  border-radius: 50%;
  background: #fff1df;
  color: #d58b4d;
  font-size: 38rpx;
  font-weight: 600;
}

.page-title {
  color: #22313f;
}

.login-note {
  margin-top: 18rpx;
  color: #8a6f5a;
  font-size: 26rpx;
  line-height: 1.6;
}

.login-action {
  width: 100%;
  border-radius: 999rpx;
  background: #78b9a2;
}

.dev-login-action {
  width: 100%;
  margin-top: 20rpx;
  border-radius: 999rpx;
  color: #4f7f70;
  background: #edf8f3;
  font-size: 28rpx;
}
</style>
