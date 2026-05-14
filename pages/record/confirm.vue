<template>
  <view class="confirm-page">
    <view class="page-title">备注确认</view>
    <view class="page-desc">确认或编辑备注后，再选择护理类型保存。</view>

    <view class="confirm-card">
      <view class="status-line">{{ statusText }}</view>

      <view class="field-block">
        <view class="field-label">护理类型</view>
        <view class="type-grid">
          <view
            v-for="item in recordTypes"
            :key="item.recordType"
            class="type-chip"
            :class="{ active: selectedRecordType === item.recordType }"
            @click="selectType(item.recordType)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <view class="field-block">
        <view class="field-label">备注</view>
        <textarea
          class="remark-input"
          v-model="remark"
          maxlength="500"
          placeholder="可以手动输入或编辑备注"
        />
      </view>
    </view>

    <view class="footer-actions">
      <button class="soft-action" @click="goVoice">重说一次</button>
      <button class="primary-action" :disabled="submitting || !canSubmit" @click="saveRecord">
        {{ submitting ? '保存中' : '保存记录' }}
      </button>
    </view>
  </view>
</template>

<script>
import { CARE_RECORD_TYPES } from '../../services/careRecordService'
import {
  confirmVoiceText,
  createCareRecordFromRemark,
  fetchVoiceRecordDetail
} from '../../services/speechService'
import { getCurrentBabyId } from '../../utils/currentBaby'

export default {
  name: 'RecordConfirmPage',
  data() {
    return {
      currentBabyId: '',
      voiceRecordId: '',
      voiceStatus: '',
      remark: '',
      selectedRecordType: '',
      submitting: false,
      recordTypes: [
        ...CARE_RECORD_TYPES
      ]
    }
  },
  computed: {
    canSubmit() {
      return !!(this.currentBabyId && this.selectedRecordType && this.remark.trim())
    },
    statusText() {
      if (!this.voiceRecordId) {
        return '手动输入备注'
      }
      if (this.voiceStatus === 'FAILED') {
        return '识别失败，已切换为手动备注'
      }
      return '识别文字已填入备注'
    }
  },
  async onLoad(options) {
    this.currentBabyId = getCurrentBabyId()
    this.voiceRecordId = options && options.voiceRecordId ? Number(options.voiceRecordId) : ''
    this.voiceStatus = options && options.status ? decodeURIComponent(options.status) : ''
    this.remark = options && options.recognizeText ? decodeURIComponent(options.recognizeText) : ''
    if (this.voiceRecordId) {
      await this.loadVoiceRecord()
    }
  },
  methods: {
    async loadVoiceRecord() {
      try {
        const detail = await fetchVoiceRecordDetail(this.voiceRecordId)
        this.voiceStatus = detail.status
        this.remark = detail.finalText || this.remark
      } catch (error) {
        uni.showToast({
          title: '可手动保存备注',
          icon: 'none'
        })
      }
    },
    selectType(recordType) {
      this.selectedRecordType = recordType
    },
    async saveRecord() {
      if (!this.canSubmit || this.submitting) {
        return
      }
      this.submitting = true
      const finalRemark = this.remark.trim()
      try {
        if (this.voiceRecordId) {
          try {
            await confirmVoiceText({
              voiceRecordId: this.voiceRecordId,
              confirmText: finalRemark
            })
          } catch (error) {
            uni.showToast({
              title: '继续保存备注',
              icon: 'none'
            })
          }
        }
        await createCareRecordFromRemark({
          babyId: this.currentBabyId,
          recordType: this.selectedRecordType,
          remark: finalRemark,
          voiceRecordId: this.voiceRecordId
        })
        uni.showToast({
          title: '已保存',
          icon: 'success'
        })
        uni.switchTab({
          url: '/pages/record/index'
        })
      } catch (error) {
        uni.showToast({
          title: error.msg || '保存失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    },
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
  box-sizing: border-box;
  padding: 42rpx 28rpx 80rpx;
  background: #fff8ee;
}

.page-title {
  color: #2f2f2f;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin-top: 10rpx;
  color: #7a7a7a;
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
  color: #2f2f2f;
  font-size: 31rpx;
  font-weight: 700;
  text-align: center;
}

.field-block {
  margin-top: 32rpx;
}

.field-label {
  color: #7a7a7a;
  font-size: 25rpx;
  font-weight: 700;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 18rpx;
}

.type-chip {
  height: 76rpx;
  border-radius: 18rpx;
  background: #fffaf2;
  color: #2f2f2f;
  font-size: 26rpx;
  line-height: 76rpx;
  text-align: center;
}

.type-chip.active {
  background: #f6b84b;
  color: #ffffff;
  font-weight: 700;
}

.remark-input {
  width: 100%;
  min-height: 220rpx;
  box-sizing: border-box;
  margin-top: 18rpx;
  padding: 22rpx;
  border-radius: 16rpx;
  background: #fffaf2;
  color: #2f2f2f;
  font-size: 27rpx;
  line-height: 1.6;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 36rpx;
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
  background: #fff3ce;
  color: #d58b4d;
}

.primary-action {
  background: #f6b84b;
  color: #ffffff;
}

button[disabled] {
  opacity: 0.55;
}
</style>
