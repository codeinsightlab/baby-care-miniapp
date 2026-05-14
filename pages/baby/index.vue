<template>
  <view class="page baby-page">
    <view class="baby-header">
      <view class="page-title">我的宝宝</view>
      <view class="page-placeholder">选择当前宝宝后进入今日护理首页。</view>
    </view>

    <view v-if="loading" class="state-card">正在加载宝宝列表...</view>

    <view v-else-if="loadError" class="empty-state">
      <view class="empty-title">宝宝列表加载失败</view>
      <view class="empty-desc">{{ loadErrorText }}</view>
      <button class="page-action soft-action" @click="loadBabies">重新加载</button>
    </view>

    <view v-else-if="babies.length === 0" class="empty-state">
      <view class="empty-title">还没有宝宝档案</view>
      <view class="empty-desc">新增宝宝后，就可以进入今日页面。</view>
      <button class="page-action primary-action" type="primary" @click="goCreate">新增宝宝</button>
      <button class="page-action soft-action" @click="goCollaboration">邀请照顾人</button>
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
      <button class="page-action soft-action" @click="goCollaboration">宝宝协作</button>
    </view>
  </view>
</template>

<script>
import { fetchBabyList } from '../../services/babyService'
import { getCurrentBabyId, setCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage, isUnauthorizedError } from '../../utils/errorClassifier'

export default {
  name: 'BabyPage',
  data() {
    return {
      loading: false,
      loadError: false,
      loadErrorText: '',
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
        this.loadErrorText = getErrorMessage(error)
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
    },
    goCollaboration() {
      uni.navigateTo({
        url: '/pages/baby/collaboration'
      })
    }
  }
}
</script>

<style scoped>
.baby-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 180rpx;
  background: #fff8ee;
}

.baby-header {
  margin-bottom: 30rpx;
}

.state-card,
.empty-state {
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  color: #7a7a7a;
  font-size: 28rpx;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.empty-title {
  color: #2f2f2f;
  font-size: 32rpx;
  font-weight: 600;
}

.empty-desc {
  margin-top: 12rpx;
  color: #7a7a7a;
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
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(159, 135, 72, 0.07);
}

.baby-item.active {
  border-color: #ffd166;
  background: #fffdf8;
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
  color: #f6b84b;
  font-size: 30rpx;
  font-weight: 600;
}

.baby-main {
  flex: 1;
  min-width: 0;
}

.baby-name {
  color: #2f2f2f;
  font-size: 32rpx;
  font-weight: 600;
}

.baby-meta {
  margin-top: 8rpx;
  color: #7a7a7a;
  font-size: 26rpx;
}

.baby-status {
  margin-left: 20rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #fff3ce;
  color: #d58b4d;
  font-size: 25rpx;
  white-space: nowrap;
}

.primary-action,
.soft-action {
  border-radius: 999rpx;
}

.primary-action {
  background: #f6b84b;
}

.soft-action {
  color: #d58b4d;
  background: #fff3ce;
}
</style>
