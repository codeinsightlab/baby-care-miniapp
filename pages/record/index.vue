<template>
  <view class="record-page">
    <view class="record-hero">
      <view class="baby-pill">{{ babyPillText }}</view>
      <view class="record-title">记录</view>
      <view class="record-desc">查看宝宝已经发生的护理事实，按时间回看备注和记录来源。</view>
    </view>

    <view class="date-card">
      <view>
        <view class="section-title">护理事实</view>
        <view class="empty-desc">{{ selectedDateLabel }}</view>
      </view>
      <picker mode="date" :value="selectedDate" @change="handleDateChange">
        <view class="date-action">切换日期</view>
      </picker>
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
        <view class="section-title">护理事实</view>
        <view class="section-more">{{ timelineCountText }}</view>
      </view>
      <view v-if="isTimelineInitialLoading" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">正在加载记录</view>
          <view class="empty-desc">请稍候。</view>
        </view>
      </view>
      <view v-else-if="loadError && !hasVisibleRecords" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">记录加载失败</view>
          <view class="empty-desc">{{ loadErrorText }}</view>
          <button class="soft-action retry-action" @click="refreshTimelineData">重新加载</button>
        </view>
      </view>
      <view v-else-if="noRecords" class="timeline-empty">
        <view class="empty-dot"></view>
        <view>
          <view class="empty-title">暂无护理记录</view>
          <view class="empty-desc">这一天还没有护理记录。</view>
        </view>
      </view>
      <view v-else class="record-list">
        <timeline-item v-for="record in visibleRecords" :key="record.id" :item="record" mode="detail" />
      </view>
    </view>
  </view>
</template>

<script>
import { isMockVoiceEnabled } from '../../config/env'
import {
  fetchCareRecordList,
  getTodayDateString
} from '../../services/careRecordService'
import { ensureCurrentBabyId } from '../../services/babyService'
import TimelineItem from '../../components/TimelineItem.vue'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage } from '../../utils/errorClassifier'

export default {
  name: 'RecordPage',
  components: {
    TimelineItem
  },
  data() {
    return {
      currentBabyId: '',
      recordsBabyId: '',
      records: [],
      loading: false,
      loadError: false,
      loadErrorText: '',
      timelineRequestSeq: 0,
      mockVoiceEnabled: isMockVoiceEnabled(),
      selectedDate: getTodayDateString()
    }
  },
  computed: {
    voiceEntryDesc() {
      return this.mockVoiceEnabled ? '说一句照护备注，确认后保存到记录。' : '语音输入暂未开放，可从今日页快速记录。'
    },
    babyPillText() {
      return this.currentBabyId ? '当前宝宝已选择' : '未选择宝宝'
    },
    timelineCountText() {
      return this.visibleRecords.length ? `${this.visibleRecords.length}条` : '暂无记录'
    },
    selectedDateLabel() {
      return this.selectedDate === getTodayDateString() ? '今天' : this.selectedDate
    },
    visibleRecords() {
      if (!this.currentBabyId || String(this.recordsBabyId) !== String(this.currentBabyId)) {
        return []
      }
      return this.records
    },
    hasVisibleRecords() {
      return this.visibleRecords.length > 0
    },
    isTimelineInitialLoading() {
      return this.loading && !this.hasVisibleRecords
    },
    noRecords() {
      return this.visibleRecords.length === 0
    }
  },
  async onShow() {
    await this.refreshTimelineData()
  },
  onLoad() {
    uni.$on('care-record-created', this.handleCareRecordCreated)
  },
  onUnload() {
    uni.$off('care-record-created', this.handleCareRecordCreated)
  },
  async onPullDownRefresh() {
    try {
      await this.refreshTimelineData()
    } finally {
      uni.stopPullDownRefresh()
    }
  },
  methods: {
    async refreshTimelineData() {
      const requestSeq = this.timelineRequestSeq + 1
      this.timelineRequestSeq = requestSeq
      this.currentBabyId = getCurrentBabyId()
      if (!this.currentBabyId) {
        this.recordsBabyId = ''
        this.records = []
        this.loadError = false
        try {
          const result = await ensureCurrentBabyId()
          if (requestSeq !== this.timelineRequestSeq) {
            return
          }
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
      const targetBabyId = this.currentBabyId
      this.loading = true
      this.loadError = false
      try {
        const records = await fetchCareRecordList({
          babyId: targetBabyId,
          date: this.selectedDate
        })
        if (requestSeq !== this.timelineRequestSeq || String(targetBabyId) !== String(this.currentBabyId)) {
          return
        }
        this.records = records
        this.recordsBabyId = targetBabyId
      } catch (error) {
        if (requestSeq !== this.timelineRequestSeq || String(targetBabyId) !== String(this.currentBabyId)) {
          return
        }
        this.loadErrorText = getErrorMessage(error)
        this.loadError = true
      } finally {
        if (requestSeq === this.timelineRequestSeq) {
          this.loading = false
        }
      }
    },
    async handleDateChange(event) {
      this.selectedDate = event.detail.value || getTodayDateString()
      await this.refreshTimelineData()
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
    },
    handleCareRecordCreated(payload) {
      const currentBabyId = getCurrentBabyId()
      if (!payload || !payload.babyId || String(payload.babyId) === String(currentBabyId)) {
        this.refreshTimelineData()
      }
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

.date-card,
.section-card,
.voice-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.date-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.date-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 148rpx;
  height: 64rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  border: 2rpx solid #d96f1f;
  border-radius: 999rpx;
  background: #ffffff;
  color: #9f4e12;
  font-size: 24rpx;
  font-weight: 800;
  white-space: nowrap;
}

.section-title {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112rpx;
  height: 56rpx;
  box-sizing: border-box;
  border: 2rpx solid #d96f1f;
  border-radius: 999rpx;
  background: #ffffff;
  color: #9f4e12;
  font-size: 24rpx;
  font-weight: 800;
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
}

.record-list::before {
  position: absolute;
  top: 24rpx;
  bottom: 24rpx;
  left: 115rpx;
  width: 2rpx;
  border-radius: 999rpx;
  background: #eceff3;
  content: '';
}

.empty-dot {
  flex-shrink: 0;
  width: 18rpx;
  height: 18rpx;
  margin: 10rpx 18rpx 0 0;
  border-radius: 50%;
  background: #f28c38;
}

.retry-action {
  margin-top: 16rpx;
  border: 2rpx solid #d96f1f;
  background: #ffffff;
  color: #9f4e12;
  border-radius: 999rpx;
  font-weight: 750;
}
</style>
