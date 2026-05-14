<template>
  <view class="record-page">
    <view class="record-hero">
      <view class="baby-pill">{{ currentBabyId ? '当前宝宝已选择' : '未选择宝宝' }}</view>
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
        <view class="voice-title">语音记录</view>
        <view class="voice-desc">待接入录音和识别能力。</view>
      </view>
      <view class="voice-action">去看看</view>
    </view>

    <view class="section-card">
      <view class="section-header">
        <view class="section-title">今日时间轴</view>
        <view class="section-more">{{ records.length ? `${records.length}条` : '暂无记录' }}</view>
      </view>
      <view v-if="loading" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">正在加载记录</view>
          <view class="empty-desc">请稍候。</view>
        </view>
      </view>
      <view v-else-if="records.length === 0" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">暂无护理记录</view>
          <view class="empty-desc">点击下方快速记录后，会按时间展示宝宝今日照护。</view>
        </view>
      </view>
      <view v-else class="record-list">
        <view v-for="record in records" :key="record.recordId" class="record-row">
          <view class="record-time">{{ record.displayTime }}</view>
          <view class="record-main">
            <view class="record-name">{{ record.recordTypeLabel }}</view>
            <view class="record-remark">{{ record.displayRemark }}</view>
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
import {
  CARE_RECORD_TYPES,
  createQuickCareRecord,
  fetchCareRecordList,
  getRecordListTypeCountText,
  getTodayDateString
} from '../../services/careRecordService'
import { getCurrentBabyId } from '../../utils/currentBaby'

export default {
  name: 'RecordPage',
  data() {
    return {
      currentBabyId: '',
      records: [],
      loading: false,
      submitting: false,
      quickTypes: [
        ...CARE_RECORD_TYPES
      ]
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    if (!this.currentBabyId) {
      this.records = []
      uni.switchTab({
        url: '/pages/baby/index'
      })
      return
    }
    this.loadRecords()
  },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        this.records = await fetchCareRecordList({
          babyId: this.currentBabyId,
          date: getTodayDateString()
        })
      } catch (error) {
        this.records = []
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
      uni.navigateTo({
        url: '/pages/record/voice'
      })
    }
  }
}
</script>

<style scoped>
.record-page {
  min-height: 100vh;
  padding: 34rpx 28rpx 180rpx;
  background: #fff7dc;
}

.record-hero {
  padding: 16rpx 6rpx 28rpx;
}

.baby-pill {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #7a6a45;
  font-size: 22rpx;
}

.record-title {
  margin-top: 18rpx;
  color: #1f2933;
  font-size: 40rpx;
  font-weight: 700;
}

.record-desc {
  margin-top: 8rpx;
  color: #7a6a45;
  font-size: 24rpx;
  line-height: 1.6;
}

.summary-card,
.section-card,
.voice-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.section-title {
  color: #2f3a43;
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
  border-radius: 14rpx;
  background: #fafafa;
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
  background: #fff4cf;
  color: #d89c00;
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
  color: #2f3a43;
  font-size: 25rpx;
  font-weight: 700;
}

.summary-value {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 22rpx;
}

.voice-card {
  display: flex;
  align-items: center;
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
  background: #fff3ce;
  color: #e1ad16;
  font-size: 26rpx;
  font-weight: 700;
}

.voice-copy {
  flex: 1;
  min-width: 0;
}

.voice-title,
.empty-title {
  color: #2f3a43;
  font-size: 28rpx;
  font-weight: 700;
}

.voice-desc,
.empty-desc,
.section-more {
  color: #7b8794;
  font-size: 24rpx;
  line-height: 1.6;
}

.voice-action {
  color: #d89c00;
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
  border-radius: 14rpx;
  background: #fafafa;
}

.record-list {
  margin-top: 18rpx;
}

.record-row {
  display: flex;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f2f4;
}

.record-row:last-child {
  border-bottom: 0;
}

.record-time {
  flex-shrink: 0;
  width: 92rpx;
  color: #8a94a6;
  font-size: 23rpx;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-name {
  color: #2f3a43;
  font-size: 26rpx;
  font-weight: 700;
}

.record-remark {
  margin-top: 6rpx;
  color: #7b8794;
  font-size: 23rpx;
  line-height: 1.5;
}

.empty-dot {
  flex-shrink: 0;
  width: 18rpx;
  height: 18rpx;
  margin: 10rpx 18rpx 0 0;
  border-radius: 50%;
  background: #f2c433;
}

.quick-item {
  padding: 24rpx 12rpx;
  border-radius: 14rpx;
  background: #fafafa;
  color: #4b5563;
  font-size: 25rpx;
  text-align: center;
}

.quick-item.disabled {
  opacity: 0.58;
}
</style>
