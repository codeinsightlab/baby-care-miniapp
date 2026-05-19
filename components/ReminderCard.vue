<template>
  <view class="reminder-card" :class="cardClass">
    <view class="reminder-title-row">
      <view class="reminder-icon" :class="meta.typeClass">{{ meta.iconText }}</view>
      <view class="reminder-title">{{ templateTitle }}</view>
    </view>
    <view class="reminder-time-line">{{ timeLineText }}</view>
    <view v-if="contextText" class="reminder-desc">{{ contextText }}</view>
    <view class="reminder-actions" :class="{ compensation: isCompensationMode }">
      <button class="reminder-action primary" @click.stop="handleGoRecord">去记录</button>
      <button v-if="isCompensationMode" class="reminder-action secondary" @click.stop="handleIgnore">忽略</button>
      <button v-else class="reminder-action secondary" @click.stop="handleSnooze">稍后</button>
    </view>
  </view>
</template>

<script>
import { getCareTypeMeta } from '../constants/careTypeMeta'

export default {
  name: 'ReminderCard',
  props: {
    reminder: {
      type: Object,
      required: true
    },
    mode: {
      type: String,
      default: 'today'
    }
  },
  computed: {
    meta() {
      return getCareTypeMeta(this.reminder && this.reminder.careType)
    },
    isCompensationMode() {
      return this.mode === 'compensation'
    },
    cardClass() {
      return this.isCompensationMode ? 'compensation-card' : 'today-card'
    },
    displayTime() {
      return this.reminder && this.reminder.displayTime
        ? this.reminder.displayTime
        : '--:--'
    },
    dueText() {
      const urgency = this.reminder && this.reminder.urgency
      const status = this.reminder && this.reminder.status
      if (this.isCompensationMode) {
        return `未处理${this.meta.label}`
      }
      if (status === 'SNOOZED') {
        return '稍后提醒'
      }
      if (urgency === 'overdue' || urgency === 'due') {
        return '已到点'
      }
      return '待照护'
    },
    timeLineText() {
      return `${this.displayTime} · ${this.dueText}`
    },
    templateTitle() {
      return (
        this.reminder.templateName ||
        this.reminder.title ||
        this.meta.label ||
        '护理提醒'
      )
    },
    contextText() {
      return this.reminder.remark || this.reminder.defaultRecordContext || ''
    }
  },
  methods: {
    handleGoRecord() {
      this.$emit('go-record', this.reminder)
    },
    handleIgnore() {
      this.$emit('ignore', this.reminder)
    },
    handleSnooze() {
      this.$emit('snooze', this.reminder)
    }
  }
}
</script>

<style scoped>
.reminder-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 250rpx;
  box-sizing: border-box;
  padding: 28rpx 26rpx 24rpx;
  border: 1rpx solid #f3d8bf;
  border-left: 8rpx solid #f28c38;
  border-radius: 24rpx;
  background: #fff9f3;
  box-shadow: 0 14rpx 30rpx rgba(242, 140, 56, 0.11);
}

.reminder-card.compensation-card {
  min-height: 232rpx;
  border-color: #d7dde5;
  border-left-color: #5f6874;
  background: #ffffff;
  box-shadow: 0 8rpx 18rpx rgba(31, 35, 41, 0.06);
}

.reminder-title-row,
.reminder-actions {
  display: flex;
  align-items: center;
}

.reminder-title-row {
  gap: 14rpx;
}

.reminder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background: #fff5ec;
  color: #c96a16;
  font-size: 23rpx;
  font-weight: 800;
}

.reminder-icon.sleep {
  background: #f2e7ff;
  color: #8d6bd1;
}

.reminder-icon.care,
.reminder-icon.temperature {
  background: #e8f7ec;
  color: #4d8f58;
}

.reminder-icon.play {
  background: #edf3ff;
  color: #5f7fbf;
}

.reminder-icon.medicine {
  background: #fff0f0;
  color: #c75656;
}

.reminder-title {
  flex: 1;
  min-width: 0;
  color: #1f2329;
  font-size: 31rpx;
  font-weight: 750;
  line-height: 1.35;
}

.reminder-time-line {
  margin-top: 16rpx;
  color: #7a4b24;
  font-size: 25rpx;
  font-weight: 750;
  line-height: 1.4;
}

.compensation-card .reminder-time-line {
  color: #4f5965;
}

.reminder-desc {
  margin-top: 10rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.5;
  word-break: break-all;
}

.reminder-actions {
  margin-top: 22rpx;
  gap: 16rpx;
}

.reminder-actions.compensation {
  gap: 12rpx;
}

.reminder-action {
  flex: 1;
  box-sizing: border-box;
  height: 68rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 25rpx;
  font-weight: 800;
  line-height: 68rpx;
}

.reminder-action::after {
  border: 0;
}

.reminder-action.primary {
  border: 2rpx solid #d96f1f;
  background: #e8792a;
  color: #ffffff;
}

.reminder-action.secondary {
  border: 2rpx solid #d96f1f;
  background: #ffffff;
  color: #9f4e12;
}

.reminder-action:active {
  transform: scale(0.98);
}
</style>
