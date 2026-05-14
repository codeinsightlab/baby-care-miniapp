<template>
  <view class="page today-page">
    <view v-if="loading" class="state-card">正在同步宝宝数据...</view>

    <view v-else-if="currentBaby">
      <view class="today-hero">
          <view class="baby-avatar">{{ babyInitial }}</view>
          <view class="baby-main">
            <view class="baby-name">{{ currentBaby.nickname || '未命名宝宝' }}</view>
          <view class="baby-stage">当前阶段：{{ currentBaby.ageText }}</view>
          <view class="switch-action" @click="goBabyList">切换宝宝</view>
        </view>
      </view>

      <view class="summary-card">
        <view class="section-title">
          <text class="section-icon">★</text>
          <text>今日记录情况</text>
        </view>
        <view class="summary-grid">
          <view class="summary-item">
            <view class="summary-icon feeding">奶</view>
            <view class="summary-label">喂奶</view>
              <view class="summary-value">{{ getTypeCount('FEEDING') }}</view>
          </view>
          <view class="summary-item">
            <view class="summary-icon sleep">眠</view>
            <view class="summary-label">睡眠</view>
              <view class="summary-value">{{ getTypeCount('SLEEP') }}</view>
          </view>
          <view class="summary-item">
            <view class="summary-icon diaper">便</view>
            <view class="summary-label">大便</view>
              <view class="summary-value">{{ getTypeCount('DIAPER') }}</view>
          </view>
          <view class="summary-item">
            <view class="summary-icon pee">尿</view>
            <view class="summary-label">小便</view>
              <view class="summary-value">{{ getTypeCount('BASIC_CARE') }}</view>
          </view>
        </view>
        <view v-if="recentRecords.length === 0" class="voice-empty">
          <view class="voice-mark">声</view>
          <view>
            <view class="empty-title">还没有护理记录</view>
            <view class="empty-desc">接入记录后，会在这里汇总今日情况。</view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">
          <text class="section-icon clock">○</text>
          <text>当前待执行</text>
        </view>
        <view v-if="todayReminders.length === 0" class="empty-desc section-empty">暂无待执行提醒。</view>
        <view v-else class="reminder-mini-list">
          <view v-for="item in todayReminders" :key="item.reminderNodeId" class="reminder-mini-row">
            <view>
              <view class="reminder-mini-title">{{ item.careTypeLabel }} · {{ item.displayTime }}</view>
              <view class="empty-desc">{{ item.remark }}</view>
            </view>
            <view class="reminder-mini-status">{{ item.statusLabel }}</view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <view class="section-title">今日时间轴</view>
          <view class="section-more">{{ recentRecords.length ? `${recentRecords.length}条` : '暂无记录' }}</view>
        </view>
        <view v-if="recentRecords.length === 0" class="timeline-empty">今日还没有时间轴内容。</view>
        <view v-else class="timeline-list">
          <view v-for="record in recentRecords" :key="record.recordId" class="timeline-item">
            <view class="timeline-time">{{ record.displayTime }}</view>
            <view class="timeline-main">
              <view class="timeline-title">{{ record.recordTypeLabel }}</view>
              <view class="timeline-remark">{{ record.displayRemark }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">快速记录</view>
        <view class="quick-list">
          <view class="quick-item">
            <view class="quick-icon feeding">奶</view>
            <view>记录喂养</view>
          </view>
          <view class="quick-item">
            <view class="quick-icon sleep">眠</view>
            <view>记录睡眠</view>
          </view>
          <view class="quick-item">
            <view class="quick-icon diaper">护</view>
            <view>记录护理</view>
          </view>
          <view class="quick-item">
            <view class="quick-icon note">记</view>
            <view>记录互动</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchBabyDetail } from '../../services/babyService'
import { fetchTodaySummary, getRecordTypeCountText } from '../../services/careRecordService'
import { fetchTodayReminders } from '../../services/reminderService'
import { getToken } from '../../utils/auth'
import { clearCurrentBabyId, getCurrentBabyId } from '../../utils/currentBaby'

function isUnauthorizedError(error) {
  return error && (error.unauthorized || error.statusCode === 401 || error.code === 401 || error.code === '401')
}

export default {
  name: 'TodayPage',
  data() {
    return {
      loading: false,
      currentBaby: null,
      todaySummary: null,
      recentRecords: [],
      todayReminders: []
    }
  },
  computed: {
    babyInitial() {
      return this.currentBaby && this.currentBaby.initial ? this.currentBaby.initial : '宝'
    }
  },
  onShow() {
    this.loadCurrentBaby()
  },
  methods: {
    async loadCurrentBaby() {
      if (!getToken()) {
        this.currentBaby = null
        clearCurrentBabyId()
        uni.reLaunch({
          url: '/pages/splash/index'
        })
        return
      }

      this.loading = true
      try {
        const babyId = getCurrentBabyId()
        if (!babyId) {
          this.goBabyList()
          return
        }

        const baby = await fetchBabyDetail(babyId)
        this.currentBaby = baby
        await this.loadTodaySummary(baby.babyId)
        await this.loadTodayReminders(baby.babyId)
      } catch (error) {
        this.currentBaby = null
        this.todaySummary = null
        this.recentRecords = []
        this.todayReminders = []
        if (isUnauthorizedError(error)) {
          return
        }
        clearCurrentBabyId()
        this.goBabyList()
      } finally {
        this.loading = false
      }
    },
    async loadTodaySummary(babyId) {
      const summary = await fetchTodaySummary(babyId)
      this.todaySummary = summary
      this.recentRecords = summary.recentRecords
    },
    async loadTodayReminders(babyId) {
      this.todayReminders = await fetchTodayReminders(babyId)
    },
    getTypeCount(recordType) {
      return getRecordTypeCountText(this.todaySummary && this.todaySummary.typeCountMap, recordType)
    },
    goBabyList() {
      uni.switchTab({
        url: '/pages/baby/index'
      })
    }
  }
}
</script>

<style scoped>
.today-page {
  min-height: 100vh;
  padding: 36rpx 28rpx 180rpx;
  background: #fff7dc;
}

.state-card {
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: 18rpx;
  background: #ffffff;
  color: #6b7a86;
  font-size: 28rpx;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.today-hero {
  display: flex;
  align-items: center;
  padding: 10rpx 4rpx 28rpx;
}

.baby-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  margin-right: 18rpx;
  border-radius: 50%;
  background: #ffffff;
  color: #d58b4d;
  font-size: 34rpx;
  font-weight: 600;
}

.baby-main {
  flex: 1;
  min-width: 0;
}

.baby-name {
  color: #1f2933;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.35;
}

.baby-stage {
  margin-top: 4rpx;
  color: #7a6a45;
  font-size: 22rpx;
}

.switch-action {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 12rpx;
  padding: 0 18rpx;
  width: auto;
  max-width: 132rpx;
  min-width: 0;
  height: 56rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.62);
  color: #3f4a4f;
  font-size: 22rpx;
  line-height: 56rpx;
}

.summary-card,
.section-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.section-title,
.section-header {
  display: flex;
  align-items: center;
}

.section-title {
  color: #2f3a43;
  font-size: 28rpx;
  font-weight: 600;
}

.section-icon {
  margin-right: 10rpx;
  color: #f2c433;
}

.section-icon.clock {
  color: #f2c433;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 22rpx;
}

.summary-item {
  min-height: 132rpx;
  box-sizing: border-box;
  padding: 16rpx 8rpx;
  border-radius: 14rpx;
  background: #fafafa;
  text-align: center;
}

.summary-icon,
.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8rpx;
  border-radius: 50%;
  font-weight: 600;
}

.summary-icon {
  width: 44rpx;
  height: 44rpx;
  font-size: 22rpx;
}

.summary-label {
  color: #2f3a43;
  font-size: 23rpx;
  font-weight: 600;
}

.summary-value {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 20rpx;
}

.feeding {
  background: #fff4cf;
  color: #d89c00;
}

.sleep {
  background: #f2e7ff;
  color: #8d6bd1;
}

.diaper {
  background: #e8f7ec;
  color: #62a66d;
}

.pee,
.note {
  background: #edf3ff;
  color: #6a8ccf;
}

.voice-empty {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #fafafa;
}

.voice-empty > view:last-child {
  flex: 1;
  min-width: 0;
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
  font-weight: 600;
}

.empty-title {
  color: #2f3a43;
  font-size: 25rpx;
  font-weight: 600;
}

.empty-desc,
.timeline-empty {
  color: #7b8794;
  font-size: 24rpx;
  line-height: 1.6;
  white-space: normal;
  word-break: break-all;
}

.section-empty {
  margin-top: 18rpx;
}

.reminder-mini-list {
  margin-top: 18rpx;
}

.reminder-mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f2f4;
}

.reminder-mini-row:last-child {
  border-bottom: 0;
}

.reminder-mini-title {
  color: #2f3a43;
  font-size: 26rpx;
  font-weight: 700;
}

.reminder-mini-status {
  margin-left: 18rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #fff3ce;
  color: #d89c00;
  font-size: 22rpx;
  white-space: nowrap;
}

.section-header {
  justify-content: space-between;
}

.section-more {
  color: #8a94a6;
  font-size: 22rpx;
}

.timeline-empty {
  margin-top: 18rpx;
  padding: 20rpx 0 4rpx;
  text-align: center;
}

.timeline-list {
  margin-top: 18rpx;
}

.timeline-item {
  display: flex;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f2f4;
}

.timeline-item:last-child {
  border-bottom: 0;
}

.timeline-time {
  flex-shrink: 0;
  width: 88rpx;
  color: #8a94a6;
  font-size: 22rpx;
}

.timeline-main {
  flex: 1;
  min-width: 0;
}

.timeline-title {
  color: #2f3a43;
  font-size: 25rpx;
  font-weight: 600;
}

.timeline-remark {
  margin-top: 6rpx;
  color: #7b8794;
  font-size: 22rpx;
  line-height: 1.5;
}

.quick-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 22rpx;
}

.quick-item {
  color: #4b5563;
  font-size: 21rpx;
  text-align: center;
}

.quick-icon {
  width: 76rpx;
  height: 76rpx;
  font-size: 24rpx;
}
</style>
