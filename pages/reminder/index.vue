<template>
  <view class="reminder-page">
    <view class="reminder-hero">
      <view class="baby-pill">{{ babyPillText }}</view>
      <view class="page-title">提醒</view>
      <view class="page-desc">提醒实例模型正在接入，本页暂作为提醒设置入口。</view>
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
          <view class="empty-desc">新的待执行提醒将由提醒实例生成后展示。</view>
        </view>
      </view>
      <view class="action-row" :class="{ triple: nextReminder }">
        <button class="soft-action plan-action" @click="goPlan">照护计划</button>
        <button v-if="nextReminder" class="primary-action" :disabled="true">去记录</button>
        <button class="soft-action" :disabled="true">稍后提醒</button>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">提醒类型</view>
      <view class="reminder-grid">
        <view
          v-for="item in typeSummaries"
          :key="item.careType"
          class="type-card"
          :class="item.typeClass"
        >
          <view class="type-icon">{{ item.typeIcon }}</view>
          <view class="type-title">{{ item.label }}提醒</view>
          <view class="type-desc">{{ item.countText }}</view>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">提醒列表</view>
      <view v-if="noReminders" class="empty-desc list-empty">旧提醒节点已下线，待新计划提醒模型接入。</view>
      <view v-else class="reminder-list">
        <view
          v-for="(item, index) in reminders"
          :key="item.reminderInstanceId || item.id"
          class="reminder-row"
          :class="{ faded: index > 0 }"
        >
          <view>
            <view class="setting-title">{{ item.careTypeLabel }} · {{ item.displayTime }}</view>
            <view class="empty-desc">{{ item.statusLabel }} · {{ item.remark }}</view>
          </view>
          <view class="row-actions">
            <button class="mini-action" :disabled="true">去记录</button>
            <button class="mini-action soft-mini" :disabled="true">稍后</button>
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
  fetchReminderList,
  fetchTodayReminders
} from '../../services/reminderService'
import { ensureCurrentBabyId } from '../../services/babyService'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { getErrorMessage } from '../../utils/errorClassifier'
import { requestReminderSubscribe } from '../../utils/subscribe'

function normalizeCareTypeClass(careType) {
  return String(careType || '').toLowerCase().replace(/_/g, '-')
}

function buildTypeSummaryViewModels(reminders) {
  return buildReminderTypeSummaries(reminders).map(item => ({
    ...item,
    typeClass: normalizeCareTypeClass(item.careType),
    typeIcon: String(item.label || '').slice(0, 1)
  }))
}

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
      typeSummaries: buildTypeSummaryViewModels([])
    }
  },
  computed: {
    nextReminder() {
      return this.todayReminders[0] || null
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
      this.todayReminders = []
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
  methods: {
    async loadReminders() {
      this.loading = true
      this.loadError = false
      try {
        const today = await fetchTodayReminders(this.currentBabyId)
        const list = await fetchReminderList(this.currentBabyId)
        this.todayReminders = today
        this.reminders = list
        this.typeSummaries = buildTypeSummaryViewModels(list)
      } catch (error) {
        this.todayReminders = []
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
  color: #c96a16;
  background: #fff5ec;
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
  background: #f28c38;
  color: #ffffff;
  box-shadow: 0 8rpx 18rpx rgba(242, 140, 56, 0.18);
}

.soft-action {
  border: 1rpx solid #f3d8bf;
  background: #fff5ec;
  color: #c96a16;
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

.reminder-list {
  margin-top: 18rpx;
}

.reminder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.reminder-row.faded .setting-title {
  font-weight: 600;
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
  border: 1rpx solid #f3d8bf;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 22rpx;
  line-height: 1.5;
}

.soft-mini {
  border-color: #eceff3;
  background: #ffffff;
  color: #69707a;
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
  border: 1rpx solid #f3d8bf;
  background: #fff5ec;
  color: #c96a16;
  font-size: 23rpx;
  line-height: 1.5;
}
</style>
