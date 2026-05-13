<template>
  <view class="page today-page">
    <view class="page-title">今日</view>
    <view class="page-placeholder">一起照护宝宝，先确认当前宝宝。</view>
    <view v-if="loading" class="state-card">正在同步宝宝数据...</view>

    <view v-else-if="currentBaby" class="today-card">
      <view class="today-card-header">
        <view class="baby-avatar">{{ babyInitial }}</view>
        <view class="baby-main">
          <view class="baby-label-current">当前宝宝</view>
          <view class="baby-name">{{ currentBaby.nickname || '未命名宝宝' }}</view>
        </view>
      </view>
      <view class="baby-row">
        <text class="baby-label">性别</text>
        <text class="baby-value">{{ genderText }}</text>
      </view>
      <view class="baby-row">
        <text class="baby-label">出生日期</text>
        <text class="baby-value">{{ currentBaby.birthday || '-' }}</text>
      </view>
      <button class="page-action today-action" @click="goBabyList">切换宝宝</button>
    </view>
  </view>
</template>

<script>
import { getBabyDetail } from '../../api/baby'
import { getToken } from '../../utils/auth'
import { clearCurrentBabyId, getCurrentBabyId } from '../../utils/currentBaby'

function isUnauthorizedError(error) {
  return error && (error.unauthorized || error.statusCode === 401 || error.code === 401 || error.code === '401')
}

export default {
  name: 'TodayPage',
  data() {
    return {
      loading: false,
      currentBaby: null
    }
  },
  computed: {
    babyInitial() {
      const name = this.currentBaby && this.currentBaby.nickname ? this.currentBaby.nickname : ''
      return name ? name.slice(0, 1) : '宝'
    },
    genderText() {
      const genderMap = {
        0: '性别未设置',
        1: '男宝',
        2: '女宝',
        UNKNOWN: '性别未设置',
        MALE: '男宝',
        FEMALE: '女宝'
      }
      return genderMap[this.currentBaby && this.currentBaby.gender] || '性别未设置'
    }
  },
  onShow() {
    this.loadCurrentBaby()
  },
  methods: {
    async loadCurrentBaby() {
      if (!getToken()) {
        this.currentBaby = null
        clearCurrentBabyId()
        uni.reLaunch({
          url: '/pages/splash/index'
        })
        return
      }

      this.loading = true
      try {
        const babyId = getCurrentBabyId()
        if (!babyId) {
          this.goBabyList()
          return
        }

        const response = await getBabyDetail(babyId)
        const baby = response && response.data ? response.data : null
        if (!baby || !baby.babyId) {
          throw new Error('当前宝宝不存在')
        }

        this.currentBaby = baby
      } catch (error) {
        this.currentBaby = null
        if (isUnauthorizedError(error)) {
          return
        }
        clearCurrentBabyId()
        this.goBabyList()
      } finally {
        this.loading = false
      }
    },
    goBabyList() {
      uni.switchTab({
        url: '/pages/baby/index'
      })
    }
  }
}
</script>

<style scoped>
.today-page {
  background: #f7fbf8;
}

.state-card {
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  color: #6b7a86;
  font-size: 28rpx;
  box-shadow: 0 10rpx 32rpx rgba(96, 124, 114, 0.08);
}

.today-card {
  margin-top: 32rpx;
  padding: 34rpx 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 32rpx rgba(96, 124, 114, 0.08);
}

.today-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}

.baby-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  margin-right: 24rpx;
  border-radius: 50%;
  background: #fff1df;
  color: #d58b4d;
  font-size: 38rpx;
  font-weight: 600;
}

.baby-main {
  min-width: 0;
}

.baby-label-current {
  margin-bottom: 8rpx;
  color: #78a391;
  font-size: 24rpx;
}

.baby-name {
  color: #1f2933;
  font-size: 38rpx;
  font-weight: 600;
  line-height: 1.35;
}

.baby-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-top: 1rpx solid #edf2f7;
}

.baby-label {
  color: #64748b;
  font-size: 28rpx;
}

.baby-value {
  color: #1f2933;
  font-size: 28rpx;
}

.today-action {
  border-radius: 999rpx;
  color: #1f7a6d;
  background: #eef8f3;
}
</style>
