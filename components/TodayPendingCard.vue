<template>
  <view class="today-pending-card" :class="[typeClass, urgencyClass, { compact }]">
    <view class="pending-card-head">
      <view class="pending-type-icon">{{ meta.iconText }}</view>
      <view class="pending-main-title">{{ meta.label }}</view>
    </view>

    <view class="pending-card-body">
      <view class="pending-title">{{ primaryTitle }}</view>
      <view class="pending-type-badge">{{ planTypeText }}</view>
      <view class="pending-time-line">{{ reminder.displayTime || '--:--' }} · {{ urgencyText }}</view>
      <view v-if="contextSummary" class="pending-context">{{ contextSummary }}</view>
    </view>

    <view class="pending-actions">
      <button class="pending-action primary" @click.stop="handleGoRecord">{{ meta.quickActionText }}</button>
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
    typeClass() {
      return `type-${this.meta.typeClass}`
    },
    urgencyClass() {
      return `urgency-${this.reminder && this.reminder.urgency ? this.reminder.urgency : 'upcoming'}`
    },
    urgencyText() {
      const urgency = this.reminder && this.reminder.urgency
      if (urgency === 'overdue') {
        return '已到点'
      }
      if (urgency === 'due') {
        return '即将到点'
      }
      return '未到点'
    },
    primaryTitle() {
      const rawTitle = this.reminder.templateName || this.reminder.title || this.meta.label || '护理提醒'
      const text = String(rawTitle).trim().replace(/^\d{1,2}:\d{2}\s*/, '')
      return text || this.meta.label || '护理提醒'
    },
    contextSummary() {
      return this.buildContextSummary(this.reminder.defaultRecordContext)
    },
    planTypeText() {
      return `${this.meta.label}计划`
    }
  },
  methods: {
    handleGoRecord() {
      this.$emit('go-record', this.reminder)
    },
    buildContextSummary(value) {
      if (!value) {
        return ''
      }
      const context = this.parseContext(value)
      if (!context) {
        return this.toShortText(value)
      }

      const candidates = [
        context.displayText,
        context.summary,
        context.feedingAmountLabel,
        context.milkAmountLabel,
        context.volumeLabel,
        this.formatAmount(context.milkAmount || context.amount || context.volume, context.unit),
        context.feedingTypeLabel,
        context.sleepSceneLabel,
        context.careItemLabel,
        context.activityName,
        context.medicineName,
        context.temperatureValue ? `${context.temperatureValue}℃` : '',
        context.durationLabel,
        context.timeWindowLabel
      ]
      return this.toShortText(candidates.filter(Boolean).join(' · '))
    },
    parseContext(value) {
      if (typeof value === 'object') {
        return value
      }
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch (error) {
        return null
      }
    },
    formatAmount(amount, unit) {
      if (!amount) {
        return ''
      }
      return `${amount}${unit || 'ml'}`
    },
    toShortText(value) {
      const text = String(value || '').trim()
      if (!text || text[0] === '{' || text[0] === '[') {
        return ''
      }
      return text.length > 28 ? `${text.slice(0, 28)}...` : text
    }
  }
}
</script>

<style scoped>
.today-pending-card {
  box-sizing: border-box;
  width: 100%;
  padding: 22rpx 24rpx;
  border: 1rpx solid #f1dfca;
  border-radius: 18rpx;
  background: #fffaf4;
  box-shadow: 0 12rpx 28rpx rgba(31, 35, 41, 0.06);
}

.today-pending-card.compact {
  padding: 20rpx 22rpx;
  box-shadow: 0 8rpx 20rpx rgba(31, 35, 41, 0.045);
}

.pending-card-head,
.pending-actions {
  display: flex;
  align-items: center;
}

.pending-card-head {
  gap: 12rpx;
}

.pending-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  font-size: 20rpx;
  font-weight: 700;
}

.pending-main-title {
  min-width: 0;
  color: #1f2329;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1.4;
  margin-right: 8rpx;
}

.pending-type-badge {
  box-sizing: border-box;
  height: 42rpx;
  min-width: 0;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(242, 140, 56, 0.12);
  color: #b76a1a;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 42rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 10rpx;
  margin-bottom: 8rpx;
  display: inline-flex;
  align-items: center;
  max-width: fit-content;
}

.pending-time-line {
  min-width: 0;
  color: #69707a;
  font-size: 23rpx;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-card-body {
  margin-top: 14rpx;
}

.pending-title {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.compact .pending-title {
  font-size: 29rpx;
  -webkit-line-clamp: 1;
}

.pending-context {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 23rpx;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-actions {
  margin-top: 18rpx;
}

.pending-action {
  box-sizing: border-box;
  min-width: 0;
  width: auto;
  min-width: 180rpx;
  margin: 0;
  padding: 0 18rpx;
  height: 66rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 66rpx;
}

.pending-action.primary {
  background: #f28c38;
  color: #ffffff;
  box-shadow: 0 8rpx 18rpx rgba(242, 140, 56, 0.18);
}

.type-feeding .pending-type-icon {
  background: #fff5ec;
  color: #c96a16;
}

.type-sleep .pending-type-icon {
  background: #f2e7ff;
  color: #8d6bd1;
}

.type-care .pending-type-icon {
  background: #e8f7ec;
  color: #62a66d;
}

.type-play .pending-type-icon {
  background: #edf3ff;
  color: #6a8ccf;
}

.type-medicine .pending-type-icon {
  background: #fff0f0;
  color: #ca5f5f;
}

.type-temperature .pending-type-icon {
  background: #f0f7ff;
  color: #5284bd;
}

.type-other .pending-type-icon {
  background: #f1f2f4;
  color: #69707a;
}

.urgency-overdue {
  border-color: #efc7a5;
}

.urgency-due {
  border-color: #f3d8bf;
}
</style>
