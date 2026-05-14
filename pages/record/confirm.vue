<template>
  <view class="confirm-page">
    <view class="page-title">记录确认</view>
    <view class="page-desc">识别结果确认页骨架。真实识别和提交能力后续接入。</view>

    <view class="confirm-card">
      <view class="status-line">记录好了，看看对不对</view>
      <view class="result-list">
        <view class="result-row">
          <text class="row-label">护理类型</text>
          <text class="row-value">待识别</text>
        </view>
        <view class="result-row">
          <text class="row-label">时间</text>
          <text class="row-value">待接入真实数据</text>
        </view>
        <view class="result-row">
          <text class="row-label">内容</text>
          <text class="row-value">暂无记录内容</text>
        </view>
        <view class="result-row">
          <text class="row-label">备注</text>
          <text class="row-value">暂无备注</text>
        </view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="soft-action" @click="goVoice">重说一次</button>
      <button class="primary-action" disabled>确认记录</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'RecordConfirmPage',
  methods: {
    goVoice() {
      uni.navigateTo({
        url: '/pages/record/voice'
      })
    }
  }
}
</script>

<style scoped>
.confirm-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 80rpx;
  background: #fff7dc;
}

.page-title {
  color: #1f2933;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin-top: 10rpx;
  color: #7a6a45;
  font-size: 25rpx;
  line-height: 1.6;
}

.confirm-card {
  margin-top: 32rpx;
  padding: 34rpx 28rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.status-line {
  color: #1f2933;
  font-size: 31rpx;
  font-weight: 700;
  text-align: center;
}

.result-list {
  margin-top: 30rpx;
}

.result-row {
  display: flex;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #edf1f3;
}

.result-row:last-child {
  border-bottom: 0;
}

.row-label {
  flex-shrink: 0;
  margin-right: 24rpx;
  color: #7b8794;
  font-size: 25rpx;
}

.row-value {
  color: #2f3a43;
  font-size: 25rpx;
  text-align: right;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 36rpx;
}

.soft-action,
.primary-action {
  height: 86rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  line-height: 86rpx;
}

.soft-action {
  background: #ffffff;
  color: #64748b;
}

.primary-action {
  background: #f5c84c;
  color: #ffffff;
}
</style>
