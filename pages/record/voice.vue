<template>
  <view class="voice-page">
    <view class="voice-header">
      <view class="page-title">语音记录</view>
      <view class="page-desc">按原型保留语音录入骨架，录音和识别能力待接入。</view>
    </view>

    <view class="recording-card">
      <view class="recording-title">正在聆听，请说话</view>
      <view class="wave">
        <view class="bar short"></view>
        <view class="bar"></view>
        <view class="bar tall"></view>
        <view class="bar"></view>
        <view class="bar short"></view>
      </view>
      <view class="recognized-card">
        <view class="recognized-label">识别结果占位</view>
        <view class="recognized-text">这里会展示宝宝护理记录的语音识别文本。</view>
      </view>
      <view class="stop-button">待接入</view>
    </view>

    <view class="footer-actions">
      <button class="soft-action" @click="goBack">返回</button>
      <button class="primary-action" @click="goConfirm">查看确认页</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'RecordVoicePage',
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goConfirm() {
      uni.navigateTo({
        url: '/pages/record/confirm'
      })
    }
  }
}
</script>

<style scoped>
.voice-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 80rpx;
  background: #fff7dc;
}

.voice-header {
  margin-bottom: 30rpx;
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

.recording-card {
  min-height: 720rpx;
  padding: 56rpx 32rpx;
  border-radius: 22rpx;
  background: #fff3a7;
  text-align: center;
}

.recording-title {
  color: #1f2933;
  font-size: 32rpx;
  font-weight: 700;
}

.wave {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180rpx;
}

.bar {
  width: 10rpx;
  height: 72rpx;
  margin: 0 8rpx;
  border-radius: 999rpx;
  background: #3f3f46;
}

.bar.short {
  height: 42rpx;
}

.bar.tall {
  height: 104rpx;
}

.recognized-card {
  margin-top: 20rpx;
  padding: 26rpx;
  border-radius: 16rpx;
  background: #ffffff;
  text-align: left;
}

.recognized-label {
  color: #d89c00;
  font-size: 24rpx;
  font-weight: 700;
}

.recognized-text {
  margin-top: 10rpx;
  color: #64748b;
  font-size: 25rpx;
  line-height: 1.6;
}

.stop-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  margin: 54rpx auto 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  color: #9aa5b1;
  font-size: 24rpx;
  font-weight: 700;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 30rpx;
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
