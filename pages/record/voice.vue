<template>
  <view class="voice-page">
    <view class="voice-header">
      <view class="page-title">语音备注</view>
      <view class="page-desc">{{ pageDesc }}</view>
    </view>

    <view class="recording-card">
      <view class="recording-title">{{ statusTitle }}</view>
      <view class="wave" :class="{ active: recognizing }">
        <view class="bar short"></view>
        <view class="bar"></view>
        <view class="bar tall"></view>
        <view class="bar"></view>
        <view class="bar short"></view>
      </view>

      <view class="recognized-card">
        <view class="recognized-label">{{ resultLabel }}</view>
        <view class="recognized-text">{{ resultText }}</view>
      </view>

      <view v-if="mockVoiceEnabled" class="mock-actions">
        <button class="soft-action" :disabled="recognizing" @click="handleMockFail">手动填写</button>
        <button class="primary-action" :disabled="recognizing || !currentBabyId" @click="handleMockSuccess">
          {{ recognizeButtonText }}
        </button>
      </view>
      <view v-else class="unavailable-actions">
        <button class="primary-action" disabled>暂未开放</button>
      </view>
    </view>

    <view class="footer-actions">
      <button class="soft-action" @click="goBack">返回</button>
      <button class="primary-action" :disabled="!canConfirm" @click="goConfirm">去确认</button>
    </view>
  </view>
</template>

<script>
import { isMockVoiceEnabled } from '../../config/env'
import { mockRecognizeVoice } from '../../services/speechService'
import { getCurrentBabyId } from '../../utils/currentBaby'

export default {
  name: 'RecordVoicePage',
  data() {
    return {
      currentBabyId: '',
      recognizing: false,
      voiceRecord: null,
      mockVoiceEnabled: isMockVoiceEnabled()
    }
  },
  computed: {
    pageDesc() {
      return this.mockVoiceEnabled ? '说一句照护备注，识别文字会作为备注草稿。' : '语音输入暂未开放，可先使用普通记录填写备注。'
    },
    canConfirm() {
      return !!(this.voiceRecord && this.voiceRecord.voiceRecordId)
    },
    recognizeButtonText() {
      return this.recognizing ? '识别中' : '开始识别'
    },
    statusTitle() {
      if (!this.currentBabyId) {
        return '请先选择宝宝'
      }
      if (this.recognizing) {
        return '正在识别'
      }
      if (!this.voiceRecord) {
        return this.mockVoiceEnabled ? '点击开始识别' : '语音输入暂未开放'
      }
      return this.voiceRecord.status === 'FAILED' ? '识别失败，可手动输入' : '识别完成'
    },
    resultLabel() {
      return this.voiceRecord ? this.voiceRecord.statusLabel : '备注草稿'
    },
    resultText() {
      if (!this.voiceRecord) {
        return this.mockVoiceEnabled ? '这里会展示识别后的备注文字。' : '请先使用普通记录填写备注。'
      }
      return this.voiceRecord.finalText || this.voiceRecord.failReason || '可以在确认页手动输入备注。'
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
  },
  methods: {
    async handleMockSuccess() {
      await this.recognize(false)
    },
    async handleMockFail() {
      await this.recognize(true)
    },
    async recognize(mockFail) {
      if (!this.mockVoiceEnabled) {
        uni.showToast({
          title: '语音输入暂未开放',
          icon: 'none'
        })
        return
      }
      if (!this.currentBabyId) {
        uni.showToast({
          title: '请先选择宝宝',
          icon: 'none'
        })
        return
      }
      this.recognizing = true
      try {
        this.voiceRecord = await mockRecognizeVoice({
          babyId: this.currentBabyId,
          mockText: '宝宝刚刚完成护理，状态很好。',
          mockFail
        })
        if (this.voiceRecord.status === 'FAILED') {
          uni.showToast({
            title: '可手动输入备注',
            icon: 'none'
          })
        }
      } catch (error) {
        uni.showToast({
          title: error.msg || '识别失败',
          icon: 'none'
        })
      } finally {
        this.recognizing = false
      }
    },
    goBack() {
      uni.navigateBack()
    },
    goConfirm() {
      if (!this.canConfirm) {
        return
      }
      const query = [
        `voiceRecordId=${encodeURIComponent(this.voiceRecord.voiceRecordId)}`,
        `recognizeText=${encodeURIComponent(this.voiceRecord.finalText || '')}`,
        `status=${encodeURIComponent(this.voiceRecord.status || '')}`
      ]
      uni.navigateTo({
        url: `/pages/record/confirm?${query.join('&')}`
      })
    }
  }
}
</script>

<style scoped>
.voice-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 42rpx 28rpx 80rpx;
  background: #f7f6f2;
}

.voice-header {
  margin-bottom: 30rpx;
}

.page-title {
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin-top: 10rpx;
  color: #69707a;
  font-size: 25rpx;
  line-height: 1.6;
}

.recording-card {
  min-height: 720rpx;
  padding: 56rpx 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(31, 35, 41, 0.05);
  text-align: center;
}

.recording-title {
  color: #1f2329;
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
  background: #eceff3;
}

.bar.short {
  height: 42rpx;
}

.bar.tall {
  height: 104rpx;
}

.wave.active .bar {
  background: #f28c38;
}

.recognized-card {
  margin-top: 20rpx;
  padding: 26rpx;
  border-radius: 16rpx;
  background: #ffffff;
  text-align: left;
}

.recognized-label {
  color: #c96a16;
  font-size: 24rpx;
  font-weight: 700;
}

.recognized-text {
  min-height: 88rpx;
  margin-top: 10rpx;
  color: #69707a;
  font-size: 25rpx;
  line-height: 1.6;
}

.mock-actions,
.unavailable-actions,
.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 30rpx;
}

.unavailable-actions {
  grid-template-columns: 1fr;
}

.soft-action,
.primary-action {
  box-sizing: border-box;
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  height: 86rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  line-height: 86rpx;
}

.soft-action {
  background: #fff5ec;
  color: #c96a16;
}

.primary-action {
  background: #f28c38;
  color: #ffffff;
}

button[disabled] {
  opacity: 0.55;
}
</style>
