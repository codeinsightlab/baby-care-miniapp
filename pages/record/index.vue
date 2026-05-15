<template>
  <view class="record-page">
    <view class="record-hero">
      <view class="baby-pill">{{ babyPillText }}</view>
      <view class="record-title">记录</view>
      <view class="record-desc">按当前宝宝记录今日照护，保存后会同步到今日汇总。</view>
    </view>

    <view class="summary-card">
      <view class="section-title">今日记录情况</view>
      <view class="summary-grid">
        <view class="summary-item feeding">
          <view class="summary-icon">奶</view>
          <view class="summary-label">喂奶</view>
          <view class="summary-value">{{ getTypeCount('FEEDING') }}</view>
        </view>
        <view class="summary-item sleep">
          <view class="summary-icon">眠</view>
          <view class="summary-label">睡眠</view>
          <view class="summary-value">{{ getTypeCount('SLEEP') }}</view>
        </view>
        <view class="summary-item care">
          <view class="summary-icon">护</view>
          <view class="summary-label">护理</view>
          <view class="summary-value">{{ getTypeCount('DIAPER') }}</view>
        </view>
        <view class="summary-item note">
          <view class="summary-icon">记</view>
          <view class="summary-label">互动</view>
          <view class="summary-value">{{ getTypeCount('BASIC_CARE') }}</view>
        </view>
      </view>
    </view>

    <view class="voice-card" @click="goVoice">
      <view class="voice-mark">声</view>
      <view class="voice-copy">
        <view class="voice-title">语音备注</view>
        <view class="voice-desc">{{ voiceEntryDesc }}</view>
      </view>
      <view class="voice-action">去输入</view>
    </view>

    <view class="section-card">
      <view class="section-header">
        <view class="section-title">今日时间轴</view>
        <view class="section-more">{{ timelineCountText }}</view>
      </view>
      <view v-if="loading" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">正在加载记录</view>
          <view class="empty-desc">请稍候。</view>
        </view>
      </view>
      <view v-else-if="loadError" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">记录加载失败</view>
          <view class="empty-desc">{{ loadErrorText }}</view>
          <button class="soft-action retry-action" @click="loadRecords">重新加载</button>
        </view>
      </view>
      <view v-else-if="noRecords" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">暂无护理记录</view>
          <view class="empty-desc">点击下方快速记录后，会按时间展示宝宝今日照护。</view>
        </view>
      </view>
      <view v-else class="record-list">
        <view v-for="record in records" :key="record.recordId" class="record-row">
          <view class="record-node"></view>
          <view class="record-content">
            <view class="record-time">{{ record.displayTime }}</view>
            <view class="record-main">
              <view class="record-name">{{ record.recordTypeLabel }}</view>
              <view class="record-remark">{{ record.displayRemark }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">快速记录</view>
      <view class="quick-grid">
        <view
          v-for="item in quickTypes"
          :key="item.recordType"
          class="quick-item"
          :class="{ disabled: submitting }"
          @click="handleQuickRecord(item)"
        >
          {{ item.quickLabel }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { isMockVoiceEnabled } from '../../config/env'
import {
  CARE_RECORD_TYPES,
  createQuickCareRecord,
  fetchCareRecordList,
  getRecordListTypeCountText,
  getTodayDateString
} from '../../services/careRecordService'
import { ensureCurrentBabyId } from '../../services/babyService'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage } from '../../utils/errorClassifier'

export default {
  name: 'RecordPage',
  data() {
    return {
      currentBabyId: '',
      records: [],
      loading: false,
      loadError: false,
      loadErrorText: '',
      submitting: false,
      mockVoiceEnabled: isMockVoiceEnabled(),
      quickTypes: [
        ...CARE_RECORD_TYPES
      ]
    }
  },
  computed: {
    voiceEntryDesc() {
      return this.mockVoiceEnabled ? '说一句照护备注，确认后保存到记录。' : '语音输入暂未开放，可先手动记录。'
    },
    babyPillText() {
      return this.currentBabyId ? '当前宝宝已选择' : '未选择宝宝'
    },
    timelineCountText() {
      return this.records.length ? `${this.records.length}条` : '暂无记录'
    },
    noRecords() {
      return this.records.length === 0
    }
  },
  async onShow() {
    this.currentBabyId = getCurrentBabyId()
    if (!this.currentBabyId) {
      this.records = []
      try {
        const result = await ensureCurrentBabyId()
        if (!result.hasBaby) {
          this.goCreate()
          return
        }
        this.currentBabyId = result.babyId
      } catch (error) {
        this.loadErrorText = getErrorMessage(error)
        this.loadError = true
        return
      }
    }
    this.loadRecords()
  },
  methods: {
    async loadRecords() {
      this.loading = true
      this.loadError = false
      try {
        this.records = await fetchCareRecordList({
          babyId: this.currentBabyId,
          date: getTodayDateString()
        })
      } catch (error) {
        this.records = []
        this.loadErrorText = getErrorMessage(error)
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    async handleQuickRecord(item) {
      if (this.submitting || !this.currentBabyId) {
        return
      }
      this.submitting = true
      try {
        await createQuickCareRecord(this.currentBabyId, item.recordType)
        uni.showToast({
          title: '已记录',
          icon: 'success'
        })
        await this.loadRecords()
      } catch (error) {
        uni.showToast({
          title: error.msg || '记录失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    },
    getTypeCount(recordType) {
      return getRecordListTypeCountText(this.records, recordType)
    },
    goVoice() {
      if (!this.mockVoiceEnabled) {
        uni.showToast({
          title: '语音输入暂未开放',
          icon: 'none'
        })
        return
      }
      uni.navigateTo({
        url: '/pages/record/voice'
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
.record-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 34rpx 28rpx 180rpx;
  background: #f7f6f2;
}

.record-hero {
  padding: 16rpx 6rpx 28rpx;
}

.baby-pill {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid #f3d8bf;
  background: #fff5ec;
  color: #c96a16;
  font-size: 22rpx;
}

.record-title {
  margin-top: 18rpx;
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.record-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}

.summary-card,
.section-card,
.voice-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.section-title {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
}

.summary-grid,
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 22rpx;
}

.summary-item {
  min-height: 132rpx;
  padding: 18rpx 10rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
  text-align: center;
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto 10rpx;
  border-radius: 50%;
  font-size: 22rpx;
  font-weight: 700;
}

.feeding .summary-icon {
  background: #fff5ec;
  color: #c96a16;
}

.sleep .summary-icon {
  background: #f2e7ff;
  color: #8d6bd1;
}

.care .summary-icon {
  background: #e8f7ec;
  color: #62a66d;
}

.note .summary-icon {
  background: #edf3ff;
  color: #6a8ccf;
}

.summary-label {
  color: #1f2329;
  font-size: 25rpx;
  font-weight: 700;
}

.summary-value {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 22rpx;
}

.voice-card {
  display: flex;
  align-items: center;
  border: 1rpx solid #eceff3;
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.voice-card:active {
  background: #fff8f2;
  transform: scale(0.99);
}

.voice-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 76rpx;
  height: 76rpx;
  margin-right: 18rpx;
  border-radius: 50%;
  background: #fff5ec;
  color: #f28c38;
  font-size: 26rpx;
  font-weight: 700;
}

.voice-copy {
  flex: 1;
  min-width: 0;
}

.voice-title,
.empty-title {
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 700;
}

.voice-desc,
.empty-desc,
.section-more {
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}

.voice-action {
  color: #c96a16;
  font-size: 24rpx;
  white-space: nowrap;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timeline-empty {
  display: flex;
  align-items: flex-start;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
}

.record-list {
  position: relative;
  margin-top: 18rpx;
  padding-left: 14rpx;
}

.record-list::before {
  position: absolute;
  top: 24rpx;
  bottom: 24rpx;
  left: 8rpx;
  width: 2rpx;
  border-radius: 999rpx;
  background: #eceff3;
  content: '';
}

.record-row {
  position: relative;
  display: flex;
  padding: 18rpx 0 18rpx 18rpx;
}

.record-node {
  position: absolute;
  top: 28rpx;
  left: -11rpx;
  width: 12rpx;
  height: 12rpx;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  background: #f28c38;
}

.record-content {
  display: flex;
  flex: 1;
  min-width: 0;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eceff3;
}

.record-row:last-child .record-content {
  border-bottom: 0;
}

.record-time {
  flex-shrink: 0;
  width: 90rpx;
  color: #9aa1aa;
  font-size: 22rpx;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-name {
  color: #1f2329;
  font-size: 26rpx;
  font-weight: 700;
}

.record-remark {
  margin-top: 6rpx;
  color: #69707a;
  font-size: 23rpx;
  line-height: 1.5;
}

.empty-dot {
  flex-shrink: 0;
  width: 18rpx;
  height: 18rpx;
  margin: 10rpx 18rpx 0 0;
  border-radius: 50%;
  background: #f28c38;
}

.quick-item {
  padding: 24rpx 12rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #ffffff;
  color: #1f2329;
  font-size: 25rpx;
  text-align: center;
  box-shadow: 0 6rpx 16rpx rgba(31, 35, 41, 0.04);
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.quick-item:active {
  border-color: #f3d8bf;
  background: #fff8f2;
  transform: scale(0.98);
}

.quick-item.disabled {
  opacity: 0.58;
}

.retry-action {
  margin-top: 16rpx;
  color: #c96a16;
  background: #fff5ec;
  border-radius: 999rpx;
}
</style>
