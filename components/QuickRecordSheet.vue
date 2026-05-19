<template>
  <view v-if="visible" class="quick-record-layer">
    <view class="quick-record-mask" @click="handleClose"></view>
    <view class="quick-record-sheet">
      <view class="sheet-grip"></view>
      <view class="sheet-title">{{ titleText }}</view>
      <view class="context-line">{{ contextText }}</view>
      <textarea
        class="remark-input"
        v-model="localRemark"
        maxlength="500"
        auto-height
        placeholder="补充记录（可选）"
      />
      <button class="voice-action" :disabled="recognizing || submitting" @click="handleVoiceInput">
        {{ voiceButtonText }}
      </button>
      <button class="confirm-action" :disabled="submitting" @click="handleConfirm">
        {{ confirmButtonText }}
      </button>
    </view>
  </view>
</template>

<script>
import { mockRecognizeVoice } from '../services/speechService'
import { resolveQuickRecordVoiceRemark } from '../services/quickRecordService'

export default {
  name: 'QuickRecordSheet',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    draft: {
      type: Object,
      default: null
    },
    submitting: {
      type: Boolean,
      default: false
    },
    mockVoiceEnabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      localRemark: '',
      recognizing: false,
      voiceRecordId: null
    }
  },
  computed: {
    titleText() {
      return this.draft && this.draft.title ? this.draft.title : '护理记录'
    },
    contextText() {
      return this.draft && this.draft.defaultContextText ? this.draft.defaultContextText : '按当前提醒记录'
    },
    voiceButtonText() {
      if (!this.mockVoiceEnabled) {
        return '语音输入暂未开放'
      }
      return this.recognizing ? '识别中' : '开始语音输入'
    },
    confirmButtonText() {
      return this.submitting ? '保存中' : '确认记录'
    }
  },
  watch: {
    visible(value) {
      if (value) {
        this.resetInput()
      }
    },
    draft() {
      if (this.visible) {
        this.resetInput()
      }
    }
  },
  methods: {
    resetInput() {
      this.localRemark = ''
      this.voiceRecordId = null
      this.recognizing = false
    },
    handleClose() {
      if (this.submitting || this.recognizing) {
        return
      }
      this.$emit('close')
    },
    async handleVoiceInput() {
      if (!this.mockVoiceEnabled) {
        uni.showToast({
          title: '语音输入暂未开放',
          icon: 'none'
        })
        return
      }
      if (!this.draft || !this.draft.babyId) {
        uni.showToast({
          title: '请先选择宝宝',
          icon: 'none'
        })
        return
      }
      this.recognizing = true
      try {
        const voiceRecord = await mockRecognizeVoice({
          babyId: this.draft.babyId,
          mockText: '宝宝护理已完成，状态平稳。'
        })
        const remark = resolveQuickRecordVoiceRemark(voiceRecord)
        if (remark) {
          this.localRemark = remark
          this.voiceRecordId = voiceRecord.voiceRecordId || null
        }
      } catch (error) {
        uni.showToast({
          title: error.msg || '识别失败，可手动输入',
          icon: 'none'
        })
      } finally {
        this.recognizing = false
      }
    },
    handleConfirm() {
      if (this.submitting || !this.draft) {
        return
      }
      this.$emit('confirm', {
        remark: this.localRemark,
        voiceRecordId: this.voiceRecordId
      })
    }
  }
}
</script>

<style scoped>
.quick-record-layer {
  position: fixed;
  z-index: 90;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.quick-record-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(31, 35, 41, 0.36);
}

.quick-record-sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  padding: 18rpx 28rpx 54rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #ffffff;
  box-shadow: 0 -14rpx 32rpx rgba(31, 35, 41, 0.12);
}

.sheet-grip {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 26rpx;
  border-radius: 999rpx;
  background: #d8dde5;
}

.sheet-title {
  color: #1f2329;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.35;
}

.context-line {
  margin-top: 12rpx;
  color: #69707a;
  font-size: 25rpx;
  line-height: 1.5;
  word-break: break-all;
}

.remark-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 156rpx;
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
  color: #1f2329;
  font-size: 26rpx;
  line-height: 1.5;
}

.voice-action,
.confirm-action {
  box-sizing: border-box;
  width: 100%;
  height: 76rpx;
  margin: 18rpx 0 0;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 76rpx;
}

.voice-action::after,
.confirm-action::after {
  border: 0;
}

.voice-action {
  border: 1rpx solid #f3d8bf;
  background: #fff8f2;
  color: #c96a16;
}

.confirm-action {
  background: #f28c38;
  color: #ffffff;
}
</style>
