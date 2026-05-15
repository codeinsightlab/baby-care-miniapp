<template>
  <view class="profile-page">
    <view class="profile-header">
      <view class="avatar-placeholder">宝</view>
      <view>
        <view class="page-title">宝宝信息</view>
        <view class="page-desc">按宝宝信息页原型保留资料展示骨架。</view>
      </view>
    </view>

    <view class="form-card">
      <view class="field-row">
        <text class="field-label">宝宝昵称</text>
        <text class="field-value">待接入真实数据</text>
      </view>
      <view class="field-row">
        <text class="field-label">性别</text>
        <text class="field-value">待接入真实数据</text>
      </view>
      <view class="field-row">
        <text class="field-label">出生日期</text>
        <text class="field-value">待接入真实数据</text>
      </view>
      <view class="field-row">
        <text class="field-label">喂养方式</text>
        <text class="field-value">后续接入</text>
      </view>
    </view>

    <view class="notice-card">这里只是页面骨架，不保存资料、不提交接口。</view>
  </view>
</template>

<script>
export default {
  name: 'BabyProfilePage'
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 42rpx 28rpx 80rpx;
  background: #f7f6f2;
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  margin-right: 22rpx;
  border-radius: 50%;
  background: #ffffff;
  color: #f28c38;
  font-size: 36rpx;
  font-weight: 700;
}

.page-title {
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 24rpx;
}

.form-card,
.notice-card {
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(31, 35, 41, 0.05);
}

.field-row {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.field-row:last-child {
  border-bottom: 0;
}

.field-label {
  flex-shrink: 0;
  margin-right: 24rpx;
  color: #69707a;
  font-size: 26rpx;
}

.field-value {
  color: #1f2329;
  font-size: 26rpx;
  text-align: right;
}

.notice-card {
  margin-top: 22rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}
</style>
