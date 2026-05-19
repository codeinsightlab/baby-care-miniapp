<template>
  <view class="timeline-item" :class="[itemClass, modeClass]">
    <view class="timeline-time">{{ displayTime }}</view>
    <view class="timeline-node">
      <view class="timeline-dot" :class="typeClass">{{ iconText }}</view>
    </view>
    <view class="timeline-main">
      <view class="timeline-title">{{ title }}</view>
      <view v-if="showDescription" class="timeline-remark">{{ visibleDescription }}</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TimelineItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    mode: {
      type: String,
      default: 'compact'
    }
  },
  computed: {
    isDetailMode() {
      return this.mode === 'detail'
    },
    modeClass() {
      return this.isDetailMode ? 'timeline-item-detail' : 'timeline-item-compact'
    },
    displayTime() {
      return this.item.displayTime || '--:--'
    },
    title() {
      return this.item.title || this.item.recordTypeLabel || '护理事实'
    },
    description() {
      return this.item.description || this.item.displayRemark || this.item.remark || ''
    },
    visibleDescription() {
      if (this.isDetailMode || this.description.length <= 28) {
        return this.description
      }
      return `${this.description.slice(0, 28)}...`
    },
    showDescription() {
      return Boolean(this.item.showDescription !== false && this.description)
    },
    typeClass() {
      return this.item.typeClass || 'record-event'
    },
    itemClass() {
      return this.item.itemClass || 'timeline-item-record'
    },
    iconText() {
      return this.item.iconText || '护'
    }
  }
}
</script>

<style scoped>
.timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 18rpx 0;
}

.timeline-item-detail {
  padding-top: 22rpx;
  padding-bottom: 22rpx;
}

.timeline-item-record {
  min-height: 78rpx;
}

.timeline-time {
  flex-shrink: 0;
  width: 86rpx;
  color: #9aa1aa;
  font-size: 22rpx;
  line-height: 44rpx;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.timeline-node {
  position: relative;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  width: 58rpx;
  margin-right: 14rpx;
}

.timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18rpx;
  height: 18rpx;
  flex-shrink: 0;
  margin-top: 12rpx;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  background: #f28c38;
  color: #ffffff;
  font-size: 0;
}

.timeline-dot.record-event,
.timeline-dot.feeding,
.timeline-dot.sleep,
.timeline-dot.care,
.timeline-dot.play,
.timeline-dot.medicine,
.timeline-dot.temperature {
  width: 40rpx;
  height: 40rpx;
  margin-top: 2rpx;
  border-width: 3rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.timeline-dot.feeding,
.timeline-dot.record-event {
  background: #fff5ec;
  color: #c96a16;
}

.timeline-dot.sleep {
  background: #f2e7ff;
  color: #8d6bd1;
}

.timeline-dot.care,
.timeline-dot.temperature {
  background: #e8f7ec;
  color: #62a66d;
}

.timeline-dot.play {
  background: #edf3ff;
  color: #6a8ccf;
}

.timeline-dot.medicine {
  background: #fff0f0;
  color: #d86b6b;
}

.timeline-main {
  flex: 1;
  min-width: 0;
  padding: 0 4rpx 16rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.timeline-item:last-child .timeline-main {
  border-bottom: 0;
}

.timeline-title {
  color: #1f2329;
  font-size: 27rpx;
  font-weight: 800;
  line-height: 1.45;
  word-break: break-word;
}

.timeline-remark {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 23rpx;
  font-weight: 400;
  line-height: 1.55;
  word-break: break-word;
}

.timeline-item-compact .timeline-remark {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.timeline-item-detail .timeline-remark {
  color: #4f5965;
  font-size: 24rpx;
  line-height: 1.7;
}

.timeline-item-detail .timeline-title {
  font-size: 29rpx;
  line-height: 1.5;
}

</style>
