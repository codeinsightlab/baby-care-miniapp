<template>
  <view class="page baby-page">
    <view class="baby-header">
      <view class="page-title">我的宝宝</view>
      <view class="page-placeholder">选择当前宝宝后进入今日护理首页。</view>
    </view>

    <view v-if="loading" class="state-card">正在加载宝宝列表...</view>

    <view v-else-if="loadError" class="empty-state">
      <view class="empty-title">宝宝列表加载失败</view>
      <view class="empty-desc">请稍后重试。</view>
      <button class="page-action soft-action" @click="loadBabies">重新加载</button>
    </view>

    <view v-else-if="babies.length === 0" class="empty-state">
      <view class="empty-title">还没有宝宝档案</view>
      <view class="empty-desc">新增宝宝后，就可以进入今日页面。</view>
      <button class="page-action primary-action" type="primary" @click="goCreate">新增宝宝</button>
    </view>

    <view v-else class="baby-list">
      <view
        v-for="baby in babies"
        :key="baby.babyId"
        class="baby-item"
        :class="{ active: String(baby.babyId) === String(currentBabyId) }"
        @click="selectBaby(baby)"
      >
        <view class="baby-avatar">{{ baby.initial }}</view>
        <view class="baby-main">
          <view class="baby-name">{{ baby.nickname || '未命名宝宝' }}</view>
          <view class="baby-meta">{{ baby.genderText }} · {{ baby.birthday || '出生日期未设置' }}</view>
        </view>
        <view class="baby-status">{{ String(baby.babyId) === String(currentBabyId) ? '当前宝宝' : '选择' }}</view>
      </view>

      <button class="page-action soft-action" @click="goCreate">新增宝宝</button>
    </view>
  </view>
</template>

<script>
import { fetchBabyList } from '../../services/babyService'
import { getCurrentBabyId, setCurrentBabyId } from '../../utils/currentBaby'

function isUnauthorizedError(error) {
  return error && (error.unauthorized || error.statusCode === 401 || error.code === 401 || error.code === '401')
}

export default {
  name: 'BabyPage',
  data() {
    return {
      loading: false,
      loadError: false,
      babies: [],
      currentBabyId: ''
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    this.loadBabies()
  },
  methods: {
    async loadBabies() {
      this.loading = true
      this.loadError = false
      try {
        this.babies = await fetchBabyList()
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return
        }
        this.babies = []
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    selectBaby(baby) {
      if (!baby || !baby.babyId) {
        return
      }
      setCurrentBabyId(baby.babyId)
      uni.switchTab({
        url: '/pages/today/index'
      })
    },
    goCreate() {
      uni.navigateTo({
        url: '/pages/baby/create'
      })
    }
  }
}
</script>

<style scoped>
.baby-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 180rpx;
  background: #f6fbf8;
}

.baby-header {
  margin-bottom: 30rpx;
}

.state-card,
.empty-state {
  padding: 32rpx;
  border-radius: 18rpx;
  background: #ffffff;
  color: #6b7a86;
  font-size: 28rpx;
  box-shadow: 0 10rpx 28rpx rgba(96, 124, 114, 0.08);
}

.empty-title {
  color: #1f2933;
  font-size: 32rpx;
  font-weight: 600;
}

.empty-desc {
  margin-top: 12rpx;
  color: #64748b;
  font-size: 26rpx;
  line-height: 1.6;
}

.baby-list {
  margin-top: 22rpx;
}

.baby-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border: 2rpx solid transparent;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(96, 124, 114, 0.06);
}

.baby-item.active {
  border-color: #78b9a2;
  background: #fbfffd;
}

.baby-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  margin-right: 20rpx;
  border-radius: 50%;
  background: #fff1df;
  color: #d58b4d;
  font-size: 30rpx;
  font-weight: 600;
}

.baby-main {
  flex: 1;
  min-width: 0;
}

.baby-name {
  color: #1f2933;
  font-size: 32rpx;
  font-weight: 600;
}

.baby-meta {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 26rpx;
}

.baby-status {
  margin-left: 20rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #eef8f3;
  color: #1f7a6d;
  font-size: 25rpx;
  white-space: nowrap;
}

.primary-action,
.soft-action {
  border-radius: 999rpx;
}

.primary-action {
  background: #78b9a2;
}

.soft-action {
  color: #1f7a6d;
  background: #eef8f3;
}
</style>
