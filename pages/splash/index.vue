<template>
  <view class="splash-page">
    <view class="splash-main">
      <view class="splash-visual">
        <image class="splash-image" src="/static/images/splash-baby-care.png" mode="aspectFit" />
      </view>
      <view class="splash-title">宝宝护理</view>
      <view class="splash-tip">{{ statusText }}</view>
      <view class="loading-dots" aria-label="正在加载">
        <view class="dot"></view>
        <view class="dot"></view>
        <view class="dot"></view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchBabyDetail, fetchBabyList } from '../../services/babyService'
import { loginForCurrentEnvResult } from '../../services/loginService'
import { getToken, saveLoginResult } from '../../utils/auth'
import { clearCurrentBabyId, getCurrentBabyId, setCurrentBabyId } from '../../utils/currentBaby'

export default {
  name: 'SplashPage',
  data() {
    return {
      statusText: '正在进入宝宝空间...'
    }
  },
  onShow() {
    this.bootstrap()
  },
  methods: {
    async bootstrap() {
      try {
        if (!getToken()) {
          await this.loginWithWechat()
        }

        try {
          await this.restoreCurrentBaby()
        } catch (error) {
          if (!error || !error.unauthorized) {
            throw error
          }
          await this.loginWithWechat()
          await this.restoreCurrentBaby()
        }
      } catch (error) {
        this.goLogin(error)
      }
    },
    async loginWithWechat() {
      this.statusText = '正在进入宝宝空间...'
      saveLoginResult(await loginForCurrentEnvResult())
    },
    async restoreCurrentBaby() {
      const requestOptions = {
        redirectOnUnauthorized: false
      }
      let babyId = getCurrentBabyId()

      if (babyId) {
        this.statusText = '正在同步宝宝数据...'
        try {
          await this.loadBabyDetail(babyId, requestOptions)
          this.goToday()
          return
        } catch (error) {
          if (error && error.unauthorized) {
            throw error
          }
          clearCurrentBabyId()
        }
      }

      this.statusText = '正在准备宝宝空间...'
      const babies = await fetchBabyList(requestOptions)
      const firstBaby = babies[0]
      if (!firstBaby || !firstBaby.babyId) {
        this.goCreate()
        return
      }

      babyId = firstBaby.babyId
      await this.loadBabyDetail(babyId, requestOptions)
      setCurrentBabyId(babyId)
      this.goToday()
    },
    async loadBabyDetail(babyId, requestOptions) {
      return fetchBabyDetail(babyId, requestOptions)
    },
    goToday() {
      uni.switchTab({
        url: '/pages/today/index'
      })
    },
    goCreate() {
      uni.navigateTo({
        url: '/pages/baby/create'
      })
    },
    goLogin(error) {
      const message = error && (error.msg || error.message) ? error.msg || error.message : '进入失败，请重新确认'
      uni.reLaunch({
        url: `/pages/login/index?reason=${encodeURIComponent(message)}`
      })
    }
  }
}
</script>

<style scoped>
.splash-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 72rpx 48rpx;
  background: linear-gradient(180deg, #fff8f1 0%, #f6fbf8 100%);
}

.splash-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 72rpx;
}

.splash-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 20rpx 54rpx rgba(96, 124, 114, 0.12);
}

.splash-image {
  width: 196rpx;
  height: 196rpx;
}

.splash-title {
  margin-top: 44rpx;
  color: #22313f;
  font-size: 44rpx;
  font-weight: 600;
  line-height: 1.3;
}

.splash-tip {
  margin-top: 18rpx;
  color: #6b7a86;
  font-size: 28rpx;
  line-height: 1.6;
}

.loading-dots {
  display: flex;
  gap: 12rpx;
  margin-top: 36rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #78b9a2;
  animation: dotPulse 1.2s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes dotPulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: scale(0.9);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
