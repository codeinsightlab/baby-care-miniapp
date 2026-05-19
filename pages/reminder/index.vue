<template>
  <view class="reminder-page">
    <view class="reminder-flow-header">
      <view class="baby-pill">{{ babyPillText }}</view>
      <view v-if="isRefreshingReminders" class="flow-refreshing">更新中</view>
    </view>

    <view class="reminder-flow-section">
      <view v-if="isInitialLoading" class="empty-reminder flow-state-card">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">正在加载提醒</view>
          <view class="empty-desc">请稍候。</view>
        </view>
      </view>
      <view v-else-if="showInitialError" class="empty-reminder flow-state-card">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">提醒加载失败</view>
          <view class="empty-desc">{{ loadErrorText }}</view>
          <button class="soft-action retry-action" @click="loadReminders">重新加载</button>
        </view>
      </view>
      <view v-else-if="noReminders" class="empty-reminder flow-state-card">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">现在没有需要处理的提醒</view>
        </view>
      </view>
      <view v-else class="reminder-card-flow">
        <reminder-card
          v-for="item in recentCompensationReminders"
          :key="item.reminderInstanceId || item.id"
          :reminder="item"
          mode="compensation"
          @go-record="handleGoRecord"
          @ignore="handleIgnoreReminder"
        />
        <view v-if="hasEarlierReminders" class="earlier-reminders">
          <view class="earlier-toggle" @click="toggleEarlierReminders">
            <text>{{ earlierToggleText }}</text>
            <text class="earlier-toggle-action">{{ earlierExpanded ? '收起' : '展开' }}</text>
          </view>
          <view v-if="earlierExpanded" class="earlier-card-flow">
            <reminder-card
              v-for="item in earlierCompensationReminders"
              :key="item.reminderInstanceId || item.id"
              :reminder="item"
              mode="compensation"
              @go-record="handleGoRecord"
              @ignore="handleIgnoreReminder"
            />
          </view>
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
import {
  buildReminderQueueWindow,
  queryReminderInstances
} from '../../services/reminderService'
import { createQuickCareRecord } from '../../services/careRecordService'
import { ensureCurrentBabyId } from '../../services/babyService'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage } from '../../utils/errorClassifier'
import { isMockVoiceEnabled } from '../../config/env'
import ReminderCard from '../../components/ReminderCard.vue'
import QuickRecordSheet from '../../components/QuickRecordSheet.vue'
import {
  buildQuickRecordCareOptions,
  buildQuickRecordDraftFromReminder
} from '../../services/quickRecordService'

const RECENT_COMPENSATION_LIMIT = 3

export default {
  name: 'ReminderPage',
  components: {
    ReminderCard,
    QuickRecordSheet
  },
  data() {
    return {
      currentBabyId: '',
      loadError: false,
      loadErrorText: '',
      reminderRequestSeq: 0,
      submitting: false,
      mockVoiceEnabled: isMockVoiceEnabled(),
      displayState: {
        babyId: '',
        reminders: [],
        loaded: false
      },
      refreshingState: {
        reminders: false
      },
      quickRecordSheet: {
        visible: false,
        draft: null
      },
      earlierExpanded: false
    }
  },
  computed: {
    babyPillText() {
      return this.currentBabyId ? '当前宝宝已选择' : '未选择宝宝'
    },
    hasReminderDisplayState() {
      return Boolean(
        this.currentBabyId &&
        this.displayState.loaded &&
        String(this.displayState.babyId) === String(this.currentBabyId)
      )
    },
    reminders() {
      if (!this.hasReminderDisplayState) {
        return []
      }
      return this.displayState.reminders
    },
    noReminders() {
      return this.hasReminderDisplayState && this.reminders.length === 0
    },
    isInitialLoading() {
      return this.refreshingState.reminders && !this.hasReminderDisplayState
    },
    isRefreshingReminders() {
      return this.refreshingState.reminders && this.hasReminderDisplayState
    },
    showInitialError() {
      return this.loadError && !this.hasReminderDisplayState
    },
    recentCompensationReminders() {
      return this.reminders.slice(-RECENT_COMPENSATION_LIMIT)
    },
    earlierCompensationReminders() {
      return this.reminders.slice(0, Math.max(0, this.reminders.length - RECENT_COMPENSATION_LIMIT))
    },
    hasEarlierReminders() {
      return this.earlierCompensationReminders.length > 0
    },
    earlierToggleText() {
      if (this.earlierExpanded) {
        return '收起更早提醒'
      }
      return `还有 ${this.earlierCompensationReminders.length} 条更早提醒`
    }
  },
  async onShow() {
    this.currentBabyId = getCurrentBabyId()
    if (!this.currentBabyId) {
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
    this.loadReminders()
  },
  onLoad() {
    uni.$on('care-record-created', this.handleCareRecordCreated)
  },
  onUnload() {
    uni.$off('care-record-created', this.handleCareRecordCreated)
  },
  async onPullDownRefresh() {
    try {
      await this.loadReminders()
    } finally {
      uni.stopPullDownRefresh()
    }
  },
  methods: {
    async loadReminders() {
      if (!this.currentBabyId) {
        return
      }
      const targetBabyId = this.currentBabyId
      const requestSeq = this.reminderRequestSeq + 1
      this.reminderRequestSeq = requestSeq
      this.refreshingState = {
        ...this.refreshingState,
        reminders: true
      }
      this.loadError = false
      try {
        const query = buildReminderQueueWindow()
        const reminders = await queryReminderInstances(targetBabyId, query)
        if (requestSeq !== this.reminderRequestSeq || String(targetBabyId) !== String(this.currentBabyId)) {
          return
        }
        this.displayState = {
          babyId: targetBabyId,
          reminders,
          loaded: true
        }
        this.earlierExpanded = false
      } catch (error) {
        if (requestSeq !== this.reminderRequestSeq || String(targetBabyId) !== String(this.currentBabyId)) {
          return
        }
        this.earlierExpanded = false
        this.loadErrorText = getErrorMessage(error)
        this.loadError = true
      } finally {
        if (requestSeq === this.reminderRequestSeq) {
          this.refreshingState = {
            ...this.refreshingState,
            reminders: false
          }
        }
      }
    },
    handleGoRecord(reminder) {
      const draft = buildQuickRecordDraftFromReminder(reminder, this.currentBabyId)
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
      if (String(draft.babyId) !== String(this.currentBabyId)) {
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
        await this.loadReminders()
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
    handleIgnoreReminder(reminder) {
      if (!reminder) {
        return
      }
      uni.showToast({
        title: '忽略功能暂未接入',
        icon: 'none',
        duration: 1500
      })
    },
    toggleEarlierReminders() {
      this.earlierExpanded = !this.earlierExpanded
    },
    handleCareRecordCreated(payload) {
      if (!payload || !payload.babyId || String(payload.babyId) === String(this.currentBabyId)) {
        this.loadReminders()
      }
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
.reminder-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 34rpx 28rpx 180rpx;
  background: #f7f6f2;
}

.reminder-flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 14rpx 4rpx 26rpx;
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

.flow-refreshing {
  flex-shrink: 0;
  color: #c96a16;
  font-size: 21rpx;
  font-weight: 650;
  line-height: 1.4;
}

.reminder-flow-section {
  margin-bottom: 28rpx;
}

.empty-reminder {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
}

.flow-state-card {
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.retry-action {
  margin-top: 16rpx;
  border: 2rpx solid #d96f1f;
  background: #ffffff;
  color: #9f4e12;
  border-radius: 999rpx;
  font-weight: 750;
}

.reminder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 78rpx;
  height: 78rpx;
  margin-right: 18rpx;
  border-radius: 50%;
  background: #fff5ec;
  color: #f28c38;
  font-size: 26rpx;
  font-weight: 700;
}

.empty-title {
  color: #1f2329;
  font-size: 27rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 23rpx;
  line-height: 1.5;
}

.soft-action {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin-left: 0;
  margin-right: 0;
  padding: 0 10rpx;
  height: 82rpx;
  border-radius: 999rpx;
  font-size: 25rpx;
  line-height: 82rpx;
  white-space: nowrap;
}

.soft-action {
  border: 2rpx solid #d96f1f;
  background: #ffffff;
  color: #9f4e12;
  font-weight: 750;
}

.reminder-card-flow {
  display: flex;
  flex-direction: column;
  gap: 26rpx;
}

.earlier-reminders {
  padding-top: 2rpx;
}

.earlier-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: 72rpx;
  padding: 0 22rpx;
  border: 1rpx solid #e4e8ee;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #69707a;
  font-size: 24rpx;
  font-weight: 650;
}

.earlier-toggle-action {
  flex-shrink: 0;
  margin-left: 18rpx;
  color: #9f4e12;
  font-weight: 800;
}

.earlier-card-flow {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  margin-top: 18rpx;
  opacity: 0.92;
}
</style>
