<template>
  <view class="pending-main-card">
    <view class="pending-card-top">
      <view class="reminder-mini-type">{{ careTypeLabel }}</view>
      <view class="pending-task-status">待执行</view>
    </view>
    <view class="pending-card-body">
      <view class="pending-time">{{ displayTime }}</view>
      <view class="pending-title">{{ templateTitle }}</view>
      <view class="pending-desc">{{ remarkText }}</view>
    </view>
    <view class="pending-actions">
      <button class="pending-action primary" @click.stop="handleGoRecord">去记录</button>
      <button class="pending-action soft" @click.stop="handleSnooze">稍后</button>
    </view>
  </view>
</template>

<script>
import { getCareTypeMeta } from '../constants/careTypeMeta'

export default {
  name: 'TodayPendingCard',
  props: {
    reminder: {
      type: Object,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    meta() {
      return getCareTypeMeta(this.reminder && this.reminder.careType)
    },
    careTypeLabel() {
      return (this.reminder && this.reminder.careTypeLabel) || this.meta.label
    },
    displayTime() {
      return this.reminder && this.reminder.displayTime
        ? this.reminder.displayTime
        : '--:--'
    },
    templateTitle() {
      return (
        this.reminder.templateName ||
        this.reminder.title ||
        this.meta.label ||
        '护理提醒'
      )
    },
    remarkText() {
      return this.reminder.remark || this.reminder.defaultRecordContext || ''
    }
  },
  methods: {
    handleGoRecord() {
      this.$emit('go-record', this.reminder)
    },
    handleSnooze() {
      this.$emit('snooze', this.reminder)
    }
  }
}
</script>

<style scoped>
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
</style>
