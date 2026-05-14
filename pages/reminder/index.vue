<template>
  <view class="reminder-page">
    <view class="reminder-hero">
      <view class="baby-pill">{{ currentBabyId ? '当前宝宝已选择' : '未选择宝宝' }}</view>
      <view class="page-title">提醒</view>
      <view class="page-desc">查看当前宝宝的个人提醒，完成或稍后都会同步记录。</view>
    </view>

    <view class="section-card next-card">
      <view class="section-title">当前待执行</view>
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
      <view v-else-if="nextReminder" class="empty-reminder">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">{{ nextReminder.careTypeLabel }} · {{ nextReminder.displayTime }}</view>
          <view class="empty-desc">{{ nextReminder.remark }}</view>
        </view>
      </view>
      <view v-else class="empty-reminder">
        <view class="reminder-icon">铃</view>
        <view>
          <view class="empty-title">暂无待执行提醒</view>
          <view class="empty-desc">可在照护计划中创建提醒节点。</view>
        </view>
      </view>
      <view class="action-row" :class="{ triple: nextReminder }">
        <button class="primary-action" @click="goPlan">照护计划</button>
        <button v-if="nextReminder" class="soft-action" :disabled="submitting" @click="handleComplete(nextReminder)">完成</button>
        <button class="soft-action" :disabled="!nextReminder || submitting" @click="handleSnooze(nextReminder)">稍后提醒</button>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">提醒类型</view>
      <view class="reminder-grid">
        <view
          v-for="item in typeSummaries"
          :key="item.careType"
          class="type-card"
          :class="item.careType.toLowerCase().replace('_', '-')"
        >
          <view class="type-icon">{{ item.label.slice(0, 1) }}</view>
          <view class="type-title">{{ item.label }}提醒</view>
          <view class="type-desc">{{ item.countText }}</view>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">提醒列表</view>
      <view v-if="reminders.length === 0" class="empty-desc list-empty">暂无提醒节点。</view>
      <view v-else class="reminder-list">
        <view v-for="item in reminders" :key="item.reminderNodeId" class="reminder-row">
          <view>
            <view class="setting-title">{{ item.careTypeLabel }} · {{ item.displayTime }}</view>
            <view class="empty-desc">{{ item.statusLabel }} · {{ item.remark }}</view>
          </view>
          <view class="row-actions">
            <button class="mini-action" :disabled="submitting || item.status === 'DONE'" @click="handleComplete(item)">完成</button>
            <button class="mini-action soft-mini" :disabled="submitting || item.status === 'DONE'" @click="handleSnooze(item)">稍后</button>
          </view>
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
    </view>
  </view>
</template>

<script>
import {
  buildReminderTypeSummaries,
  completeReminder,
  fetchReminderList,
  fetchTodayReminders,
  snoozeReminder
} from '../../services/reminderService'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage } from '../../utils/errorClassifier'
import { requestReminderSubscribe } from '../../utils/subscribe'

export default {
  name: 'ReminderPage',
  data() {
    return {
      currentBabyId: '',
      loading: false,
      loadError: false,
      loadErrorText: '',
      submitting: false,
      todayReminders: [],
      reminders: [],
      typeSummaries: buildReminderTypeSummaries([])
    }
  },
  computed: {
    nextReminder() {
      return this.todayReminders[0] || null
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    if (!this.currentBabyId) {
      this.todayReminders = []
      this.reminders = []
      this.typeSummaries = buildReminderTypeSummaries([])
      return
    }
    this.loadReminders()
  },
  methods: {
    async loadReminders() {
      this.loading = true
      this.loadError = false
      try {
        const today = await fetchTodayReminders(this.currentBabyId)
        const list = await fetchReminderList(this.currentBabyId)
        this.todayReminders = today
        this.reminders = list
        this.typeSummaries = buildReminderTypeSummaries(list)
      } catch (error) {
        this.todayReminders = []
        this.reminders = []
        this.typeSummaries = buildReminderTypeSummaries([])
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
    async handleComplete(reminder) {
      if (!reminder || this.submitting) {
        return
      }
      this.submitting = true
      try {
        await completeReminder(reminder)
        uni.showToast({ title: '已完成', icon: 'success' })
        await this.loadReminders()
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
        await this.loadReminders()
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '操作失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
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
  background: #fff8ee;
}

.reminder-hero {
  padding: 16rpx 6rpx 28rpx;
}

.baby-pill {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #fff3ce;
  color: #d58b4d;
  font-size: 22rpx;
}

.page-title {
  margin-top: 18rpx;
  color: #2f2f2f;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin-top: 8rpx;
  color: #7a7a7a;
  font-size: 24rpx;
  line-height: 1.6;
}

.section-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.section-title {
  color: #2f2f2f;
  font-size: 30rpx;
  font-weight: 700;
}

.empty-reminder {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fffaf2;
}

.retry-action {
  margin-top: 16rpx;
  color: #d58b4d;
  background: #fff3ce;
  border-radius: 999rpx;
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
  background: #fff1df;
  color: #d58b4d;
  font-size: 26rpx;
  font-weight: 700;
}

.empty-title,
.type-title,
.setting-title {
  color: #2f2f2f;
  font-size: 27rpx;
  font-weight: 700;
}

.empty-desc,
.type-desc {
  margin-top: 8rpx;
  color: #7a7a7a;
  font-size: 23rpx;
  line-height: 1.5;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
  margin-top: 24rpx;
}

.action-row.triple {
  grid-template-columns: 1fr 1fr;
}

.primary-action,
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

.primary-action {
  background: #f6b84b;
  color: #ffffff;
}

.soft-action {
  background: #fff3ce;
  color: #d58b4d;
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
  border-radius: 18rpx;
  background: #fffaf2;
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
  background: #fff4cf;
  color: #d89c00;
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

.reminder-list {
  margin-top: 18rpx;
}

.reminder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0e6d6;
}

.reminder-row > view:first-child {
  flex: 1;
  min-width: 0;
}

.reminder-row:last-child {
  border-bottom: 0;
}

.row-actions {
  display: flex;
  flex-shrink: 0;
  gap: 10rpx;
  margin-left: 16rpx;
}

.mini-action {
  box-sizing: border-box;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #fff3ce;
  color: #d58b4d;
  font-size: 22rpx;
  line-height: 1.5;
}

.soft-mini {
  background: #fffaf2;
  color: #7a7a7a;
}

.list-empty {
  margin-top: 16rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22rpx;
}

.subscribe-action {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #fff3ce;
  color: #d58b4d;
  font-size: 23rpx;
  line-height: 1.5;
}
</style>
