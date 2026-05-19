<template>
  <view class="page today-page">
    <view v-if="pageInitializing && !hasDisplayState" class="state-card">正在同步宝宝数据...</view>

    <view v-else-if="pageError && !hasDisplayState" class="state-card">
      <view class="empty-title">同步失败</view>
      <view class="empty-desc">{{ pageError }}</view>
      <button class="page-action soft-action" @click="refreshTodayData">重新加载</button>
    </view>

    <view v-else-if="showNoBabyState" class="state-card no-baby-state">
      <view class="empty-title">{{ noBabyEmptyState.title }}</view>
      <view class="empty-desc">{{ noBabyEmptyState.description }}</view>
      <button class="page-action soft-action" @click="goBabyList">{{ noBabyEmptyState.actionText }}</button>
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

      <view class="section-card pending-section">
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
        <view v-if="noTodayReminders" class="empty-desc section-empty">现在没有需要立即处理的照护提醒。</view>
        <view v-else class="pending-stack">
          <swiper
            class="pending-swiper"
            :current="activePendingIndex"
            :duration="260"
            @change="handlePendingSwiperChange"
          >
            <swiper-item
              v-for="item in pendingPreviewList"
              :key="item.reminderInstanceId || item.id"
              class="pending-swiper-item"
            >
              <reminder-card :reminder="item" mode="today" @go-record="handleGoRecord" @snooze="handleSnoozeReminder" />
            </swiper-item>
          </swiper>
        </view>
      </view>

      <view class="section-card quick-section">
        <view class="section-title">快速记录</view>
        <view class="quick-list">
          <view
            v-for="item in quickActions"
            :key="item.careType"
            class="quick-item"
            @click="handleManualQuickRecord(item)"
          >
            <view class="quick-icon" :class="item.typeClass">{{ item.iconText }}</view>
            <view>{{ item.label }}</view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <view class="section-title">护理事实</view>
          <view class="section-header-meta">
            <view v-if="refreshingState.timeline" class="section-refreshing">更新中</view>
            <view class="section-more">{{ timelineEventCountText }}</view>
          </view>
        </view>
        <view v-if="noTimelineEvents" class="timeline-empty">今天还没有护理事实，保存护理记录后会在这里显示。</view>
        <view v-else class="timeline-list">
          <timeline-item v-for="event in timelineEvents" :key="event.id" :item="event" mode="compact" />
        </view>
      </view>
    </view>
    <quick-record-sheet
      :visible="quickRecordSheet.visible"
      :draft="quickRecordSheet.draft"
      :submitting="submitting"
      :mock-voice-enabled="mockVoiceEnabled"
      @close="closeQuickRecordSheet"
      @confirm="handleQuickRecordConfirm"
    />
  </view>
</template>

<script>
import { ensureCurrentBabyId, fetchBabyDetail } from '../../services/babyService'
import { createQuickCareRecord } from '../../services/careRecordService'
import { ensureSilentLogin } from '../../services/loginService'
import { fetchTodayReminders } from '../../services/reminderService'
import { fetchTodayTimelineEvents } from '../../services/timelineService'
import ReminderCard from '../../components/ReminderCard.vue'
import QuickRecordSheet from '../../components/QuickRecordSheet.vue'
import TimelineItem from '../../components/TimelineItem.vue'
import { isMockVoiceEnabled } from '../../config/env'
import { buildQuickActionMetas } from '../../constants/careTypeMeta'
import { getToken } from '../../utils/auth'
import { clearCurrentBabyId, getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage, isUnauthorizedError, shouldClearCurrentBabyId } from '../../utils/errorClassifier'
import { buildNoBabyEmptyState, shouldLoadTodayBabyData } from '../../utils/todayNoBabyState'
import {
  buildQuickRecordCareOptions,
  buildManualQuickRecordDraft,
  buildQuickRecordDraftFromReminder
} from '../../services/quickRecordService'

function createTodayDisplayState() {
  return {
    currentBaby: null,
    todayReminders: [],
    timelineEvents: []
  }
}

function createRefreshingState() {
  return {
    currentBaby: false,
    todayReminders: false,
    timeline: false
  }
}

export default {
  name: 'TodayPage',
  components: {
    ReminderCard,
    QuickRecordSheet,
    TimelineItem
  },
  data() {
    return {
      pageInitializing: true,
      pageError: '',
      submitting: false,
      mockVoiceEnabled: isMockVoiceEnabled(),
      quickRecordSheet: {
        visible: false,
        draft: null
      },
      activePendingIndex: 0,
      noBabyEmptyState: buildNoBabyEmptyState(),
      displayState: createTodayDisplayState(),
      refreshingState: createRefreshingState()
    }
  },
  computed: {
    hasDisplayState() {
      return Boolean(this.displayState.currentBaby)
    },
    showNoBabyState() {
      return !this.pageInitializing && !this.pageError && !this.currentBaby
    },
    currentBaby() {
      return this.displayState.currentBaby
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
      return this.timelineEvents.length ? `${this.timelineEvents.length}条` : '暂无护理事实'
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
    quickActions() {
      return buildQuickActionMetas()
    }
  },
  onShow() {
    this.refreshTodayData()
  },
  onLoad() {
    uni.$on('care-record-created', this.handleCareRecordCreated)
  },
  onUnload() {
    uni.$off('care-record-created', this.handleCareRecordCreated)
  },
  async onPullDownRefresh() {
    try {
      await this.refreshTodayData()
    } finally {
      uni.stopPullDownRefresh()
    }
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
            clearCurrentBabyId()
            this.displayState = createTodayDisplayState()
            this.pageInitializing = false
            return
          }
          babyId = result.babyId
        } catch (error) {
          this.handleRefreshFailure(error)
          this.pageInitializing = false
          return
        }
      }

      if (!shouldLoadTodayBabyData(babyId)) {
        this.pageInitializing = false
        return
      }

      const baby = await this.refreshCurrentBaby(babyId)
      if (!baby) {
        this.pageInitializing = false
        return
      }

      const results = await Promise.all([
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
    handleGoRecord(reminder) {
      const currentBabyId = this.currentBaby && this.currentBaby.babyId
      const draft = buildQuickRecordDraftFromReminder(reminder, currentBabyId)
      if (!draft) {
        uni.showToast({
          title: '提醒不属于当前宝宝',
          icon: 'none'
        })
        return
      }
      this.quickRecordSheet = {
        visible: true,
        draft
      }
    },
    handleManualQuickRecord(item) {
      const currentBabyId = this.currentBaby && this.currentBaby.babyId
      const draft = buildManualQuickRecordDraft(currentBabyId, item)
      if (!draft) {
        uni.showToast({
          title: '请先选择宝宝',
          icon: 'none'
        })
        return
      }
      this.quickRecordSheet = {
        visible: true,
        draft
      }
    },
    closeQuickRecordSheet() {
      this.quickRecordSheet = {
        visible: false,
        draft: null
      }
    },
    async handleQuickRecordConfirm(result) {
      const draft = this.quickRecordSheet.draft
      if (this.submitting || !draft) {
        return
      }
      if (!this.currentBaby || String(draft.babyId) !== String(this.currentBaby.babyId)) {
        uni.showToast({
          title: '提醒不属于当前宝宝',
          icon: 'none'
        })
        return
      }
      this.submitting = true
      try {
        const options = buildQuickRecordCareOptions(draft, result)
        await createQuickCareRecord(draft.babyId, draft.recordType, options)
        uni.$emit('care-record-created', {
          babyId: draft.babyId,
          reminderInstanceId: draft.reminderInstanceId
        })
        this.closeQuickRecordSheet()
        uni.showToast({
          title: '已记录',
          icon: 'success'
        })
        await this.refreshTodayData()
      } catch (error) {
        uni.showToast({
          title: error.msg || '记录失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    },
    handleSnoozeReminder(reminder) {
      if (!reminder) {
        return
      }
      uni.showToast({
        title: '稍后提醒功能暂未接入',
        icon: 'none',
        duration: 1500
      })
    },
    goBabyList() {
      uni.switchTab({
        url: '/pages/baby/index'
      })
    },
    handleCareRecordCreated(payload) {
      if (!payload || !payload.babyId || String(payload.babyId) === String(this.currentBaby && this.currentBaby.babyId)) {
        this.refreshTodayData()
      }
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
  box-sizing: border-box;
  border: 2rpx solid #d96f1f;
  border-radius: 999rpx;
  background: #ffffff;
  color: #9f4e12;
  font-weight: 750;
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
  border: 2rpx solid #d96f1f;
  background: #ffffff;
  color: #9f4e12;
  font-size: 22rpx;
  font-weight: 750;
  line-height: 56rpx;
}

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

.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8rpx;
  border-radius: 50%;
  font-weight: 600;
}

.feeding {
  background: #fff5ec;
  color: #c96a16;
}

.sleep {
  background: #f2e7ff;
  color: #8d6bd1;
}

.diaper,
.care {
  background: #e8f7ec;
  color: #62a66d;
}

.pee,
.note,
.play {
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

.pending-header-meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
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
  left: 115rpx;
  width: 2rpx;
  border-radius: 999rpx;
  background: #e5e8ed;
  content: '';
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
