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

    <view v-else-if="noBabies" class="empty-state">
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
        :class="{ active: baby.isCurrent }"
        @click="selectBaby(baby)"
      >
        <view class="baby-avatar">{{ baby.initial }}</view>
        <view class="baby-main">
          <view class="baby-name">{{ baby.nickname || '未命名宝宝' }}</view>
          <view class="baby-meta">{{ baby.genderText }} · {{ baby.birthday || '出生日期未设置' }}</view>
        </view>
        <view class="baby-status">{{ baby.statusText }}</view>
      </view>

      <button class="page-action primary-action" @click="goCreate">新增宝宝</button>
      <button class="page-action soft-action" @click="goCollaboration">宝宝协作</button>
    </view>
  </view>
</template>

<script>
import { fetchBabyList } from '../../services/babyService'
import { getCurrentBabyId, setCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage, isUnauthorizedError } from '../../utils/errorClassifier'

function buildBabyViewModels(babies, currentBabyId) {
  return (Array.isArray(babies) ? babies : []).map(baby => {
    const isCurrent = String(baby.babyId) === String(currentBabyId)
    return {
      ...baby,
      isCurrent,
      statusText: isCurrent ? '当前宝宝' : '选择'
    }
  })
}

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
  computed: {
    noBabies() {
      return this.babies.length === 0
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
        const babies = await fetchBabyList()
        if (!this.currentBabyId && babies.length > 0) {
          this.currentBabyId = babies[0].babyId
          setCurrentBabyId(this.currentBabyId)
        }
        this.babies = buildBabyViewModels(babies, this.currentBabyId)
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
  background: #f7f6f2;
}

.baby-header {
  margin-bottom: 30rpx;
}

.state-card,
.empty-state {
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  color: #69707a;
  font-size: 28rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.empty-title {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 600;
}

.empty-desc {
  margin-top: 12rpx;
  color: #69707a;
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
  border: 1rpx solid #e5e9ef;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.06);
  transition: transform 0.12s ease, background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
}

.baby-item.active {
  border: 2rpx solid #f28c38;
  background: #fff8f2;
  box-shadow: 0 12rpx 28rpx rgba(242, 140, 56, 0.14);
}

.baby-item:active {
  background: #fff8f2;
  transform: scale(0.99);
  box-shadow: 0 6rpx 16rpx rgba(31, 35, 41, 0.08);
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
  background: #fff5ec;
  color: #f28c38;
  font-size: 30rpx;
  font-weight: 600;
}

.baby-main {
  flex: 1;
  min-width: 0;
}

.baby-name {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 600;
}

.baby-meta {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 26rpx;
}

.baby-status {
  margin-left: 20rpx;
  padding: 8rpx 18rpx;
  border: 1rpx solid #e8bd94;
  border-radius: 999rpx;
  background: #fff1e4;
  color: #a95712;
  font-size: 25rpx;
  font-weight: 600;
  white-space: nowrap;
}

.primary-action,
.soft-action {
  box-sizing: border-box;
  min-height: 88rpx;
  padding: 0 32rpx;
  border: 2rpx solid transparent;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
  transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
}

.page-action::after {
  border: 0;
}

.primary-action {
  border-color: #df7b2d;
  background: #f28c38;
  color: #ffffff;
  box-shadow: 0 10rpx 22rpx rgba(242, 140, 56, 0.22);
}

.soft-action {
  border-color: #e8bd94;
  color: #9f5618;
  background: #fff4e9;
  box-shadow: 0 6rpx 16rpx rgba(201, 106, 22, 0.09);
}

.page-action:active {
  opacity: 0.9;
  transform: translateY(2rpx) scale(0.99);
  box-shadow: 0 4rpx 12rpx rgba(31, 35, 41, 0.08);
}

.page-action[disabled] {
  opacity: 1;
  box-shadow: none;
}

.primary-action[disabled] {
  border-color: #dfc1a8;
  background: #f3dcc8 !important;
  color: #8f7660 !important;
}

.soft-action[disabled] {
  border-color: #e6d3c3;
  background: #f8ede3 !important;
  color: #a78b74 !important;
}
</style>
