<template>
  <view class="page today-page">
    <view v-if="pageInitializing && !hasDisplayState" class="state-card">正在同步宝宝数据...</view>

    <view v-else-if="pageError && !hasDisplayState" class="state-card">
      <view class="empty-title">同步失败</view>
      <view class="empty-desc">{{ pageError }}</view>
      <button class="page-action soft-action" @click="refreshTodayData">重新加载</button>
    </view>

    <view v-else-if="currentBaby">
      <view class="today-hero">
        <view class="baby-avatar">{{ babyInitial }}</view>
        <view class="baby-main">
          <view class="baby-name">{{ currentBaby.nickname || '未命名宝宝' }}</view>
          <view class="baby-stage">当前阶段：{{ currentBaby.ageText }}</view>
        </view>
        <view class="baby-actions">
          <view v-if="refreshingState.currentBaby" class="section-refreshing">更新中</view>
          <view class="switch-action" @click="goBabyList">切换宝宝</view>
        </view>
      </view>

      <view class="summary-card">
        <view class="section-header">
          <view class="section-title">
            <text class="section-icon">★</text>
            <text>今日记录情况</text>
          </view>
          <view v-if="refreshingState.summary" class="section-refreshing">更新中</view>
        </view>
        <view class="summary-grid">
          <view v-for="item in summaryItems" :key="item.recordType" class="summary-item">
            <view class="summary-icon" :class="item.typeClass">{{ item.iconText }}</view>
            <view class="summary-label">{{ item.label }}</view>
            <view class="summary-value">{{ item.countText }}</view>
          </view>
        </view>
        <view v-if="noRecentRecords" class="voice-empty">
          <view class="voice-mark">声</view>
          <view>
            <view class="empty-title">还没有护理记录</view>
            <view class="empty-desc">接入记录后，会在这里汇总今日情况。</view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <view class="section-title">
            <text class="section-icon clock">○</text>
            <text>当前待执行</text>
          </view>
          <view class="section-header-meta">
            <view v-if="refreshingState.todayReminders" class="section-refreshing">更新中</view>
            <view v-if="pendingIndicatorDots.length" class="pending-header-meta">
              <view class="pending-indicator">
                <view
                  v-for="item in pendingIndicatorDots"
                  :key="item.index"
                  :class="item.className"
                ></view>
              </view>
            </view>
          </view>
        </view>
        <view v-if="noTodayReminders" class="empty-desc section-empty">暂无待执行提醒</view>
        <view v-else class="pending-stack">
          <swiper
            class="pending-swiper"
            :current="activePendingIndex"
            :duration="260"
            @change="handlePendingSwiperChange"
          >
            <swiper-item
              v-for="item in pendingPreviewList"
              :key="item.reminderNodeId"
              class="pending-swiper-item"
            >
              <view class="pending-main-card">
                <view class="pending-card-top">
                  <view class="reminder-mini-type">{{ item.careTypeLabel }}</view>
                  <view class="pending-task-status">待执行</view>
                </view>
                <view class="pending-card-body">
                  <view class="pending-time">{{ item.displayTime }}</view>
                  <view class="pending-title">{{ item.templateName }}</view>
                  <view class="pending-desc">{{ item.remark }}</view>
                </view>
                <view class="pending-actions">
                  <button class="pending-action primary" :disabled="submitting" @click.stop="handleComplete(item)">完成</button>
                  <button class="pending-action soft" :disabled="submitting" @click.stop="handleSnooze(item)">稍后</button>
                </view>
              </view>
            </swiper-item>
          </swiper>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <view class="section-title">今日时间轴</view>
          <view class="section-header-meta">
            <view v-if="refreshingState.timeline" class="section-refreshing">更新中</view>
            <view class="section-more">{{ timelineEventCountText }}</view>
          </view>
        </view>
        <view v-if="noTimelineEvents" class="timeline-empty">今天还没有照护事件，完成记录或计划后会在这里显示。</view>
        <view v-else class="timeline-list">
          <view v-for="event in timelineEvents" :key="event.id" class="timeline-item" :class="event.itemClass">
            <view class="timeline-time">{{ event.displayTime }}</view>
            <view class="timeline-node">
              <view class="timeline-dot" :class="event.typeClass">{{ event.iconText }}</view>
            </view>
            <view class="timeline-main">
              <view class="timeline-title">{{ event.title }}</view>
              <view v-if="event.showDescription" class="timeline-remark">{{ event.description }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">快速记录</view>
        <view class="quick-list">
          <view v-for="item in quickActions" :key="item.label" class="quick-item">
            <view class="quick-icon" :class="item.typeClass">{{ item.iconText }}</view>
            <view>{{ item.label }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ensureCurrentBabyId, fetchBabyDetail } from '../../services/babyService'
import { fetchTodaySummary, getRecordTypeCountText } from '../../services/careRecordService'
import { ensureSilentLogin } from '../../services/loginService'
import { completeReminder, fetchTodayReminders, snoozeReminder } from '../../services/reminderService'
import { fetchTodayTimelineEvents } from '../../services/timelineService'
import { getToken } from '../../utils/auth'
import { clearCurrentBabyId, getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage, isUnauthorizedError, shouldClearCurrentBabyId } from '../../utils/errorClassifier'

function createTodayDisplayState() {
  return {
    currentBaby: null,
    todaySummary: null,
    recentRecords: [],
    todayReminders: [],
    timelineEvents: []
  }
}

function createRefreshingState() {
  return {
    currentBaby: false,
    todayReminders: false,
    timeline: false,
    summary: false
  }
}

export default {
  name: 'TodayPage',
  data() {
    return {
      pageInitializing: true,
      pageError: '',
      submitting: false,
      activePendingIndex: 0,
      displayState: createTodayDisplayState(),
      refreshingState: createRefreshingState()
    }
  },
  computed: {
    hasDisplayState() {
      return Boolean(this.displayState.currentBaby)
    },
    currentBaby() {
      return this.displayState.currentBaby
    },
    todaySummary() {
      return this.displayState.todaySummary
    },
    recentRecords() {
      return this.displayState.recentRecords
    },
    todayReminders() {
      return this.displayState.todayReminders
    },
    timelineEvents() {
      return this.displayState.timelineEvents
    },
    babyInitial() {
      return this.currentBaby && this.currentBaby.initial ? this.currentBaby.initial : '宝'
    },
    timelineEventCountText() {
      return this.timelineEvents.length ? `${this.timelineEvents.length}个事件` : '今天还没有事件'
    },
    noRecentRecords() {
      return this.recentRecords.length === 0
    },
    noTimelineEvents() {
      return this.timelineEvents.length === 0
    },
    noTodayReminders() {
      return this.pendingPreviewList.length === 0
    },
    pendingPreviewList() {
      return this.todayReminders
        .filter((item) => this.isPendingReminder(item))
        .slice(0, 5)
    },
    pendingIndicatorDots() {
      const list = this.pendingPreviewList
      const count = list.length
      if (count < 2) {
        return []
      }
      const activeIndex = this.getSafePendingIndex(count)
      return list.map((item, index) => ({
        index,
        className: index === activeIndex ? 'pending-indicator-dot active' : 'pending-indicator-dot'
      }))
    },
    summaryItems() {
      return [
        this.buildSummaryItem('FEEDING', '喂奶', '奶', 'feeding'),
        this.buildSummaryItem('SLEEP', '睡眠', '眠', 'sleep'),
        this.buildSummaryItem('DIAPER', '大便', '便', 'diaper'),
        this.buildSummaryItem('BASIC_CARE', '小便', '尿', 'pee')
      ]
    },
    quickActions() {
      return [
        { label: '记录喂奶', iconText: '奶', typeClass: 'feeding' },
        { label: '记录睡眠', iconText: '眠', typeClass: 'sleep' },
        { label: '记录护理', iconText: '护', typeClass: 'diaper' },
        { label: '记录互动', iconText: '记', typeClass: 'note' }
      ]
    }
  },
  onShow() {
    this.refreshTodayData()
  },
  methods: {
    async refreshTodayData() {
      const isFirstLoad = !this.hasDisplayState
      this.pageInitializing = isFirstLoad
      this.pageError = ''

      if (!getToken()) {
        try {
          await ensureSilentLogin()
        } catch (error) {
          this.handleRefreshFailure(error, '进入失败，请稍后重试。')
          this.pageInitializing = false
          return
        }
      }

      let babyId = getCurrentBabyId()
      if (!babyId) {
        try {
          const result = await ensureCurrentBabyId()
          if (!result.hasBaby) {
            this.pageInitializing = false
            this.goCreate()
            return
          }
          babyId = result.babyId
        } catch (error) {
          this.handleRefreshFailure(error)
          this.pageInitializing = false
          return
        }
      }

      const baby = await this.refreshCurrentBaby(babyId)
      if (!baby) {
        this.pageInitializing = false
        return
      }

      const results = await Promise.all([
        this.refreshTodaySummary(baby.babyId),
        this.refreshTodayReminders(baby.babyId),
        this.refreshTodayTimeline(baby.babyId)
      ])
      if (results.includes(false) && this.hasDisplayState) {
        uni.showToast({ title: '更新失败，仍显示上次数据', icon: 'none' })
      }
      this.pageInitializing = false
    },
    async refreshCurrentBaby(babyId) {
      this.refreshingState.currentBaby = true
      try {
        const baby = await fetchBabyDetail(babyId)
        this.displayState = {
          ...this.displayState,
          currentBaby: baby
        }
        return baby
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return null
        }
        if (shouldClearCurrentBabyId(error)) {
          clearCurrentBabyId()
          this.goBabyList()
          return null
        }
        this.handleRefreshFailure(error)
        return null
      } finally {
        this.refreshingState.currentBaby = false
      }
    },
    async refreshTodaySummary(babyId) {
      this.refreshingState.summary = true
      try {
        const summary = await fetchTodaySummary(babyId)
        this.displayState = {
          ...this.displayState,
          todaySummary: summary,
          recentRecords: summary.recentRecords
        }
        return true
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return false
        }
        this.handleRefreshFailure(error)
        return false
      } finally {
        this.refreshingState.summary = false
      }
    },
    async refreshTodayTimeline(babyId) {
      this.refreshingState.timeline = true
      try {
        const timelineEvents = await fetchTodayTimelineEvents(babyId)
        this.displayState = {
          ...this.displayState,
          timelineEvents
        }
        return true
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return false
        }
        this.handleRefreshFailure(error)
        return false
      } finally {
        this.refreshingState.timeline = false
      }
    },
    async refreshTodayReminders(babyId) {
      this.refreshingState.todayReminders = true
      try {
        const reminders = await fetchTodayReminders(babyId)
        this.displayState = {
          ...this.displayState,
          todayReminders: reminders
        }
        this.ensureActivePendingIndex()
        return true
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return false
        }
        this.handleRefreshFailure(error)
        return false
      } finally {
        this.refreshingState.todayReminders = false
      }
    },
    handleRefreshFailure(error, fallbackMessage) {
      if (this.hasDisplayState) {
        return
      }
      this.pageError = getErrorMessage(error, fallbackMessage)
    },
    isPendingReminder(reminder) {
      if (!reminder) {
        return false
      }
      return reminder.status !== 'DONE' && reminder.status !== 'CANCELED'
    },
    getSafePendingIndex(count) {
      if (!count || this.activePendingIndex >= count) {
        return 0
      }
      return this.activePendingIndex
    },
    ensureActivePendingIndex() {
      if (this.activePendingIndex >= this.pendingPreviewList.length) {
        this.activePendingIndex = 0
      }
    },
    handlePendingSwiperChange(event) {
      const current = Number(event && event.detail ? event.detail.current : 0)
      if (!Number.isNaN(current)) {
        this.activePendingIndex = current
      }
    },
    async handleComplete(reminder) {
      if (!reminder || this.submitting) {
        return
      }
      this.submitting = true
      try {
        await completeReminder(reminder)
        uni.showToast({ title: '已完成', icon: 'success' })
        await Promise.all([
          this.refreshTodayReminders(reminder.babyId),
          this.refreshTodayTimeline(reminder.babyId)
        ])
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '操作失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    async handleSnooze(reminder) {
      if (!reminder || this.submitting) {
        return
      }
      this.submitting = true
      try {
        await snoozeReminder(reminder)
        uni.showToast({ title: '已稍后', icon: 'success' })
        await Promise.all([
          this.refreshTodayReminders(reminder.babyId),
          this.refreshTodayTimeline(reminder.babyId)
        ])
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '操作失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    getTypeCount(recordType) {
      return getRecordTypeCountText(this.todaySummary && this.todaySummary.typeCountMap, recordType)
    },
    buildSummaryItem(recordType, label, iconText, typeClass) {
      return {
        recordType,
        label,
        iconText,
        typeClass,
        countText: this.getTypeCount(recordType)
      }
    },
    goBabyList() {
      uni.switchTab({
        url: '/pages/baby/index'
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
.today-page {
  min-height: 100vh;
  padding: 40rpx 28rpx 180rpx;
  background: #f7f6f2;
}

.state-card {
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  color: #69707a;
  font-size: 28rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.soft-action {
  color: #c96a16;
  background: #fff5ec;
  border-radius: 999rpx;
}

.today-hero {
  display: flex;
  align-items: center;
  margin-bottom: 22rpx;
  padding: 28rpx 24rpx;
  border: 1rpx solid #f4dfca;
  border-radius: 20rpx;
  background: #fffaf2;
  box-shadow: 0 12rpx 28rpx rgba(242, 140, 56, 0.08);
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
  color: #f28c38;
  font-size: 34rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 18rpx rgba(242, 140, 56, 0.12);
}

.baby-main {
  flex: 1;
  min-width: 0;
}

.baby-actions,
.section-header-meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12rpx;
  margin-left: 18rpx;
}

.section-refreshing {
  flex-shrink: 0;
  color: #c96a16;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.baby-name {
  color: #1f2329;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.35;
}

.baby-stage {
  margin-top: 4rpx;
  color: #69707a;
  font-size: 22rpx;
}

.switch-action {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 18rpx;
  width: auto;
  max-width: 132rpx;
  min-width: 0;
  height: 56rpx;
  border-radius: 999rpx;
  border: 1rpx solid #f3d8bf;
  background: rgba(255, 255, 255, 0.78);
  color: #c96a16;
  font-size: 22rpx;
  line-height: 56rpx;
}

.summary-card,
.section-card {
  margin-bottom: 22rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 28rpx rgba(31, 35, 41, 0.055);
}

.section-title,
.section-header {
  display: flex;
  align-items: center;
}

.section-title {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
}

.section-icon {
  margin-right: 10rpx;
  color: #f28c38;
}

.section-icon.clock {
  color: #f28c38;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 22rpx;
}

.summary-item {
  min-height: 150rpx;
  box-sizing: border-box;
  padding: 18rpx 6rpx 16rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
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
  width: 52rpx;
  height: 52rpx;
  font-size: 24rpx;
}

.summary-label {
  color: #1f2329;
  font-size: 23rpx;
  font-weight: 700;
}

.summary-value {
  margin-top: 10rpx;
  color: #c96a16;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 1.25;
}

.feeding {
  background: #fff5ec;
  color: #c96a16;
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

.record-event {
  background: #edf3ff;
  color: #6a8ccf;
}

.plan-completed {
  background: #e8f7ec;
  color: #62a66d;
}

.plan-delayed {
  background: #f7f2ea;
  color: #8a6f50;
}

.system-event {
  background: #eef0f3;
  color: transparent;
}

.voice-empty {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 20rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
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
  background: #fff5ec;
  color: #f28c38;
  font-size: 26rpx;
  font-weight: 600;
}

.empty-title {
  color: #1f2329;
  font-size: 25rpx;
  font-weight: 600;
}

.empty-desc,
.timeline-empty {
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
  white-space: normal;
  word-break: break-all;
}

.section-empty {
  margin-top: 18rpx;
}

.pending-stack {
  position: relative;
  width: 100%;
  margin-top: 18rpx;
}

.pending-swiper {
  height: 342rpx;
}

.pending-swiper-item {
  box-sizing: border-box;
  padding: 0 2rpx 10rpx;
}

.pending-main-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 326rpx;
  box-sizing: border-box;
  padding: 30rpx 28rpx 26rpx;
  border: 1rpx solid #f3d8bf;
  border-left: 8rpx solid #f28c38;
  border-radius: 24rpx;
  background: #fff9f3;
  box-shadow: 0 14rpx 30rpx rgba(242, 140, 56, 0.11);
}

.pending-card-top,
.pending-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reminder-mini-type {
  display: inline-flex;
  margin-bottom: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 21rpx;
  font-weight: 600;
}

.pending-header-meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.pending-task-status {
  color: #b9855b;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.pending-card-body {
  flex: 1;
  margin-top: 6rpx;
}

.pending-time {
  margin-top: 4rpx;
  color: #1f2329;
  font-size: 38rpx;
  font-weight: 800;
  line-height: 1.2;
}

.pending-title {
  margin-top: 10rpx;
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 700;
  line-height: 1.35;
}

.pending-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.45;
  word-break: break-all;
}

.pending-indicator {
  display: flex;
  align-items: center;
  gap: 7rpx;
  opacity: 0.88;
}

.pending-indicator-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #f5d4b8;
  opacity: 0.68;
}

.pending-indicator-dot.active {
  width: 22rpx;
  background: #f28c38;
  opacity: 1;
}

.pending-actions {
  margin-top: 18rpx;
  gap: 16rpx;
}

.pending-action {
  flex: 1;
  height: 64rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 64rpx;
}

.pending-action::after {
  border: 0;
}

.pending-action.primary {
  background: #f28c38;
  color: #ffffff;
}

.pending-action.soft {
  border: 1rpx solid #f3d8bf;
  background: #ffffff;
  color: #c96a16;
}

.pending-action[disabled] {
  opacity: 0.55;
}

.section-header {
  justify-content: space-between;
}

.section-more {
  color: #9aa1aa;
  font-size: 22rpx;
}

.timeline-empty {
  margin-top: 18rpx;
  padding: 20rpx 0 4rpx;
  text-align: center;
}

.timeline-list {
  position: relative;
  margin-top: 18rpx;
}

.timeline-list::before {
  position: absolute;
  top: 34rpx;
  bottom: 34rpx;
  left: 124rpx;
  width: 2rpx;
  border-radius: 999rpx;
  background: #e5e8ed;
  content: '';
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 18rpx 0;
}

.timeline-item-record {
  padding: 20rpx 0;
}

.timeline-item-plan-completed {
  padding: 15rpx 0;
}

.timeline-item-plan-delayed {
  padding: 14rpx 0;
}

.timeline-item-system {
  padding: 10rpx 0;
}

.timeline-time {
  flex-shrink: 0;
  width: 96rpx;
  padding-top: 10rpx;
  color: #69707a;
  font-size: 22rpx;
  font-weight: 600;
}

.timeline-node {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 62rpx;
}

.timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50rpx;
  height: 50rpx;
  margin: 0 auto;
  border: 6rpx solid #ffffff;
  border-radius: 50%;
  font-size: 20rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(31, 35, 41, 0.08);
}

.timeline-item-record .timeline-time {
  color: #4f5d68;
  font-size: 23rpx;
  font-weight: 700;
}

.timeline-item-record .timeline-dot {
  width: 56rpx;
  height: 56rpx;
  font-size: 21rpx;
  box-shadow: 0 6rpx 16rpx rgba(31, 35, 41, 0.1);
}

.timeline-item-plan-completed .timeline-time,
.timeline-item-plan-delayed .timeline-time {
  padding-top: 8rpx;
  color: #8b929b;
  font-size: 21rpx;
  font-weight: 500;
}

.timeline-item-plan-completed .timeline-dot,
.timeline-item-plan-delayed .timeline-dot {
  width: 44rpx;
  height: 44rpx;
  border-width: 5rpx;
  font-size: 17rpx;
  box-shadow: none;
}

.timeline-item-system .timeline-time {
  padding-top: 2rpx;
  color: #b0b6bd;
  font-size: 20rpx;
  font-weight: 500;
}

.timeline-item-system .timeline-dot {
  width: 26rpx;
  height: 26rpx;
  margin-top: 4rpx;
  border-width: 5rpx;
  font-size: 0;
  box-shadow: none;
}

.timeline-main {
  flex: 1;
  min-width: 0;
  padding: 4rpx 0 0 10rpx;
}

.timeline-title {
  color: #1f2329;
  font-size: 26rpx;
  font-weight: 700;
}

.timeline-item-record .timeline-title {
  font-size: 27rpx;
  font-weight: 700;
}

.timeline-item-plan-completed .timeline-title {
  color: #4f5d68;
  font-size: 24rpx;
  font-weight: 600;
}

.timeline-item-plan-delayed .timeline-title {
  color: #6f6a62;
  font-size: 23rpx;
  font-weight: 500;
}

.timeline-item-system .timeline-main {
  padding-top: 0;
}

.timeline-item-system .timeline-title {
  color: #8b929b;
  font-size: 21rpx;
  font-weight: 500;
}

.timeline-remark {
  margin-top: 6rpx;
  color: #69707a;
  font-size: 22rpx;
  line-height: 1.5;
}

.timeline-item-record .timeline-remark {
  color: #4f5d68;
  font-size: 23rpx;
}

.timeline-item-plan-completed .timeline-remark,
.timeline-item-plan-delayed .timeline-remark {
  margin-top: 4rpx;
  color: #8b929b;
  font-size: 21rpx;
  line-height: 1.45;
}

.quick-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 22rpx;
}

.quick-item {
  min-height: 138rpx;
  box-sizing: border-box;
  padding: 18rpx 4rpx 14rpx;
  border: 1rpx solid #e9edf2;
  border-radius: 18rpx;
  background: #f8f9fb;
  color: #1f2329;
  font-size: 21rpx;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 6rpx 14rpx rgba(31, 35, 41, 0.035);
}

.quick-item:active {
  border-color: #f3d8bf;
  background: #fff8f2;
}

.quick-icon {
  width: 74rpx;
  height: 74rpx;
  font-size: 24rpx;
}
</style>
