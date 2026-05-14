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
import { ensureSilentLogin } from '../../services/loginService'
import { getToken } from '../../utils/auth'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { isServerUnavailableError } from '../../utils/errorClassifier'

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
          await this.loginSilently()
        }
        this.restoreEntry()
      } catch (error) {
        if (isServerUnavailableError(error)) {
          this.restoreEntry()
          return
        }
        this.goLogin(error)
      }
    },
    async loginSilently() {
      this.statusText = '正在进入宝宝空间...'
      await ensureSilentLogin()
    },
    restoreEntry() {
      if (getCurrentBabyId()) {
        this.goToday()
        return
      }
      this.goBabyList()
    },
    goToday() {
      uni.switchTab({
        url: '/pages/today/index'
      })
    },
    goBabyList() {
      uni.switchTab({
        url: '/pages/baby/index'
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
  background: #fff8ee;
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
  background: #ffffff;
  box-shadow: 0 20rpx 54rpx rgba(159, 135, 72, 0.12);
}

.splash-image {
  width: 196rpx;
  height: 196rpx;
}

.splash-title {
  margin-top: 44rpx;
  color: #2f2f2f;
  font-size: 44rpx;
  font-weight: 600;
  line-height: 1.3;
}

.splash-tip {
  margin-top: 18rpx;
  color: #7a7a7a;
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
  background: #f6b84b;
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
