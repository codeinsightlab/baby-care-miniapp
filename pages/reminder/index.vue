<template>
  <view class="reminder-page">
    <view class="reminder-hero">
      <view class="baby-pill">{{ babyPillText }}</view>
      <view class="page-title">未处理提醒</view>
      <view class="page-desc">这里处理今天已经到点、但还没有记录的照护提醒。</view>
    </view>

    <view class="section-card">
      <view class="section-title">待补处理</view>
      <view v-if="loading" class="empty-reminder">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">正在加载提醒</view>
          <view class="empty-desc">请稍候。</view>
        </view>
      </view>
      <view v-else-if="loadError" class="empty-reminder">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">提醒加载失败</view>
          <view class="empty-desc">{{ loadErrorText }}</view>
          <button class="soft-action retry-action" @click="loadReminders">重新加载</button>
        </view>
      </view>
      <view v-else-if="noReminders" class="empty-reminder">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">暂无需要补处理的提醒</view>
          <view class="empty-desc">当前护理节奏请回到今日页查看。</view>
        </view>
      </view>
      <view v-else class="compensation-stack">
        <reminder-card
          v-for="item in reminders"
          :key="item.reminderInstanceId || item.id"
          :reminder="item"
          mode="compensation"
          @go-record="handleGoRecord"
          @ignore="handleIgnoreReminder"
        />
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">补偿概览</view>
      <view class="reminder-grid">
        <view
          v-for="item in visibleTypeSummaries"
          :key="item.careType"
          class="type-card"
          :class="item.typeClass"
        >
          <view class="type-icon">{{ item.iconText }}</view>
          <view class="type-title">{{ item.label }}</view>
          <view class="type-desc">{{ item.countText }}</view>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">提醒设置</view>
      <view class="setting-row">
        <view>
          <view class="setting-title">订阅消息</view>
          <view class="empty-desc">用于后续提醒通知授权，不影响当前页面使用。</view>
        </view>
        <button class="subscribe-action" @click="handleReminderSubscribe">接收提醒</button>
      </view>
      <view class="setting-row plan-link">
        <view>
          <view class="setting-title">护理节奏</view>
          <view class="empty-desc">配置提醒时间请到计划页，本页只处理已到点未记录的提醒。</view>
        </view>
        <button class="subscribe-action secondary" @click="goPlan">去设置</button>
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
  buildReminderTypeSummaries,
  buildReminderQueueWindow,
  queryReminderInstances
} from '../../services/reminderService'
import { createQuickCareRecord } from '../../services/careRecordService'
import { ensureCurrentBabyId } from '../../services/babyService'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage } from '../../utils/errorClassifier'
import { requestReminderSubscribe } from '../../utils/subscribe'
import { isMockVoiceEnabled } from '../../config/env'
import ReminderCard from '../../components/ReminderCard.vue'
import QuickRecordSheet from '../../components/QuickRecordSheet.vue'
import {
  buildQuickRecordCareOptions,
  buildQuickRecordDraftFromReminder
} from '../../services/quickRecordService'

function buildTypeSummaryViewModels(reminders) {
  return buildReminderTypeSummaries(reminders).map(item => ({
    ...item
  }))
}

export default {
  name: 'ReminderPage',
  components: {
    ReminderCard,
    QuickRecordSheet
  },
  data() {
    return {
      currentBabyId: '',
      loading: false,
      loadError: false,
      loadErrorText: '',
      submitting: false,
      mockVoiceEnabled: isMockVoiceEnabled(),
      quickRecordSheet: {
        visible: false,
        draft: null
      },
      reminders: [],
      typeSummaries: buildTypeSummaryViewModels([])
    }
  },
  computed: {
    visibleTypeSummaries() {
      return this.typeSummaries.filter((item) => item.countText !== '暂无提醒')
    },
    babyPillText() {
      return this.currentBabyId ? '当前宝宝已选择' : '未选择宝宝'
    },
    noReminders() {
      return this.reminders.length === 0
    }
  },
  async onShow() {
    this.currentBabyId = getCurrentBabyId()
    if (!this.currentBabyId) {
      this.reminders = []
      this.typeSummaries = buildTypeSummaryViewModels([])
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
      this.loading = true
      this.loadError = false
      try {
        const query = buildReminderQueueWindow()
        const reminders = await queryReminderInstances(this.currentBabyId, query)
        this.reminders = reminders
        this.typeSummaries = buildTypeSummaryViewModels(reminders)
      } catch (error) {
        this.reminders = []
        this.typeSummaries = buildTypeSummaryViewModels([])
        this.loadErrorText = getErrorMessage(error)
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    goPlan() {
      uni.navigateTo({
        url: '/pages/plan/index'
      })
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
    handleCareRecordCreated(payload) {
      if (!payload || !payload.babyId || String(payload.babyId) === String(this.currentBabyId)) {
        this.loadReminders()
      }
    },
    goCreate() {
      uni.navigateTo({
        url: '/pages/baby/create'
      })
    },
    async handleReminderSubscribe() {
      const result = await requestReminderSubscribe('reminder_enable')
      this.showSubscribeHint(result)
    },
    showSubscribeHint(result) {
      if (!result || result.status === 'throttled') {
        return
      }

      const titleMap = {
        accepted: '已开启提醒通知',
        rejected: '未开启通知，不影响继续使用',
        failed: '通知授权失败，不影响继续使用',
        unsupported: '当前环境不支持订阅授权',
        unconfigured: '订阅模板待配置',
        unknown: '授权结果待确认'
      }

      uni.showToast({
        title: titleMap[result.status] || '通知授权未完成',
        icon: 'none'
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

.reminder-hero {
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

.page-title {
  margin-top: 18rpx;
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}

.section-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.next-card {
  border: 1rpx solid #f3d8bf;
  box-shadow: 0 12rpx 28rpx rgba(242, 140, 56, 0.08);
}

.section-title {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
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

.empty-title,
.type-title,
.setting-title {
  color: #1f2329;
  font-size: 27rpx;
  font-weight: 700;
}

.next-card .empty-title {
  font-size: 31rpx;
}

.empty-desc,
.type-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 23rpx;
  line-height: 1.5;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
  margin-top: 24rpx;
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

.plan-action {
  border-color: #eceff3;
  background: #ffffff;
}

.reminder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 22rpx;
}

.type-card {
  box-sizing: border-box;
  min-width: 0;
  min-height: 150rpx;
  padding: 22rpx 16rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 16rpx rgba(31, 35, 41, 0.04);
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.type-card:active {
  border-color: #f3d8bf;
  background: #fff8f2;
  transform: scale(0.98);
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 14rpx;
  border-radius: 50%;
  font-size: 22rpx;
  font-weight: 700;
}

.feeding .type-icon {
  background: #fff5ec;
  color: #c96a16;
}

.sleep .type-icon {
  background: #f2e7ff;
  color: #8d6bd1;
}

.care .type-icon {
  background: #e8f7ec;
  color: #62a66d;
}

.play .type-icon {
  background: #edf3ff;
  color: #6a8ccf;
}

.basic-care .type-icon {
  background: #e8f7ec;
  color: #62a66d;
}

.interaction .type-icon {
  background: #edf3ff;
  color: #6a8ccf;
}

.compensation-stack {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 20rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22rpx;
}

.subscribe-action {
  box-sizing: border-box;
  min-width: 132rpx;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  border: 2rpx solid #d96f1f;
  background: #e8792a;
  color: #ffffff;
  font-size: 23rpx;
  font-weight: 800;
  line-height: 1.5;
}

.subscribe-action.secondary {
  background: #ffffff;
  color: #9f4e12;
}
</style>
