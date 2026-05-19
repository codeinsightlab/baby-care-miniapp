<template>
  <view class="plan-detail-page">
    <view class="page-hero">
      <view class="page-title">喂养计划</view>
      <view class="page-desc">这个阶段以高频按需喂养为主，系统已为你生成参考安排，可按实际情况调整。</view>
      <view v-if="refreshing" class="refreshing-pill">更新中</view>
    </view>

    <view class="section-card">
      <view class="section-title">喂养方式</view>
      <view
        v-for="item in feedingOptions"
        :key="item.value"
        class="option-item"
        :class="{ active: feedingType === item.value }"
        @click="selectFeedingType(item)"
      >
        <view class="radio-dot"></view>
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">默认节奏</view>
      <view class="empty-desc">0-14天阶段以高频喂养为主，可按实际节奏设置参考喂养时间。</view>
    </view>

    <view class="section-card">
      <view class="section-title">记录方式</view>
      <view class="empty-desc">{{ recordModeText }}</view>
    </view>

    <view class="section-card">
      <view class="section-title">参考喂养时间</view>
      <view v-if="pageInitializing && !hasNodes" class="empty-desc">正在加载计划...</view>
      <view v-else>
        <view v-for="(node, index) in nodes" :key="node.localId" class="node-row">
          <picker mode="time" :value="node.reminderTime" @change="handleTimeChange(index, $event)">
            <view class="time-value">{{ node.reminderTime }}</view>
          </picker>
          <switch :checked="isPlanEnabled(node.enabled)" color="#f28c38" @change="handleNodeToggle(index, $event)" />
          <view class="delete-action" @click="removeNode(index)">删</view>
        </view>
        <view class="add-node" @click="addNode">+ 新建时间</view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="primary-action" :loading="submitting" :disabled="submitting" @click="saveNodes">保存并使用</button>
      <button class="soft-action" :disabled="submitting" @click="goBack">稍后设置</button>
    </view>
  </view>
</template>

<script>
import { DEFAULT_CONTEXT, PLAN_CARE_TYPES, PLAN_ENABLED_STATUS, isPlanEnabled } from '../../constants/planEnums'
import { fetchPlanTemplatesByCareType, removePlanTemplate, savePlanTemplate } from '../../services/planService'
import { getCurrentBabyId } from '../../utils/currentBaby'

const DEFAULT_TIMES = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00']

export default {
  name: 'FeedingPlanPage',
  data() {
    return {
      pageInitializing: true,
      refreshing: false,
      submitting: false,
      currentBabyId: '',
      feedingType: 'MIXED',
      removedIds: [],
      nodes: [],
      feedingOptions: [
        { value: 'BREAST', label: '纯母乳喂养', recordMode: '母乳按分钟记录，奶粉按 ml 记录' },
        { value: 'FORMULA', label: '纯奶粉喂养', recordMode: '按奶量记录，每次以 ml 为单位' },
        { value: 'MIXED', label: '混合喂养', recordMode: '母乳按分钟记录，奶粉按 ml 记录' }
      ]
    }
  },
  computed: {
    hasNodes() {
      return this.nodes.length > 0
    },
    currentFeedingOption() {
      return this.feedingOptions.find((item) => item.value === this.feedingType) || this.feedingOptions[2]
    },
    recordModeText() {
      return this.currentFeedingOption.recordMode
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    this.loadNodes()
  },
  methods: {
    isPlanEnabled,
    async loadNodes() {
      if (!this.currentBabyId) {
        uni.switchTab({ url: '/pages/baby/index' })
        return
      }
      const isFirstLoad = !this.hasNodes
      this.pageInitializing = isFirstLoad
      this.refreshing = true
      try {
        const plans = await fetchPlanTemplatesByCareType(this.currentBabyId, PLAN_CARE_TYPES.FEEDING)
        this.nodes = plans.length ? plans.map(this.toNode) : this.buildDefaultNodes()
        const firstContext = this.nodes[0] && this.nodes[0].context
        if (firstContext && firstContext.feedingType) {
          this.feedingType = firstContext.feedingType
        }
      } catch (error) {
        if (isFirstLoad) {
          this.nodes = this.buildDefaultNodes()
        }
        uni.showToast({ title: error.msg || error.message || '计划加载失败', icon: 'none' })
      } finally {
        this.refreshing = false
        this.pageInitializing = false
      }
    },
    toNode(plan) {
      return {
        localId: plan.templateId || `local-${Date.now()}`,
        templateId: plan.templateId,
        careType: PLAN_CARE_TYPES.FEEDING,
        title: plan.title || '喂养提醒',
        reminderTime: plan.reminderTime,
        enabled: plan.enabled,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.FEEDING],
          ...(plan.context || {})
        },
        remark: plan.remark || ''
      }
    },
    buildDefaultNodes() {
      return DEFAULT_TIMES.map((time, index) => this.buildNode(time, index))
    },
    buildNode(time, index) {
      return {
        localId: `new-${Date.now()}-${index}`,
        careType: PLAN_CARE_TYPES.FEEDING,
        title: '喂养提醒',
        reminderTime: time,
        enabled: PLAN_ENABLED_STATUS.ENABLED,
        context: this.buildContext(),
        remark: '喂养计划参考时间'
      }
    },
    buildContext() {
      return {
        ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.FEEDING],
        feedingType: this.currentFeedingOption.value,
        feedingTypeLabel: this.currentFeedingOption.label,
        recordMode: this.currentFeedingOption.recordMode
      }
    },
    selectFeedingType(item) {
      this.feedingType = item.value
      this.nodes = this.nodes.map((node) => ({
        ...node,
        context: this.buildContext()
      }))
    },
    handleTimeChange(index, event) {
      this.nodes[index].reminderTime = event.detail.value
    },
    handleNodeToggle(index, event) {
      this.nodes[index].enabled = event.detail.value ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
    },
    addNode() {
      this.nodes.push(this.buildNode('08:00', this.nodes.length))
    },
    removeNode(index) {
      const node = this.nodes[index]
      if (node && node.templateId) {
        this.removedIds.push(node.templateId)
      }
      this.nodes.splice(index, 1)
    },
    async saveNodes() {
      if (this.submitting) {
        return
      }
      if (!this.nodes.length) {
        uni.showToast({ title: '请至少保留一个喂养时间', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await Promise.all(this.removedIds.map((id) => removePlanTemplate(this.currentBabyId, id)))
        await Promise.all(this.nodes.map((node) => savePlanTemplate(this.currentBabyId, {
          ...node,
          title: `${this.currentFeedingOption.label}${node.reminderTime}`,
          context: {
            ...this.buildContext(),
            reminderTime: node.reminderTime
          }
        })))
        this.removedIds = []
        uni.showToast({ title: '已保存喂养计划', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '保存失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.plan-detail-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 34rpx 28rpx 180rpx;
  background: #f7f6f2;
}

.page-hero {
  padding: 16rpx 6rpx 28rpx;
}

.page-title {
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc,
.empty-desc {
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}

.page-desc {
  margin-top: 8rpx;
}

.refreshing-pill {
  display: inline-flex;
  margin-top: 16rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 22rpx;
}

.section-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.section-title {
  margin-bottom: 18rpx;
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 700;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 12rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid #eceff3;
  border-radius: 10rpx;
  color: #1f2329;
  font-size: 26rpx;
}

.option-item.active {
  border-color: #f3d8bf;
  background: #fff5ec;
  color: #c96a16;
}

.radio-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 999rpx;
  border: 3rpx solid #d7dce2;
}

.option-item.active .radio-dot {
  border-color: #f28c38;
  background: #f28c38;
}

.node-row {
  display: grid;
  grid-template-columns: 1fr 96rpx 48rpx;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.time-value {
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 700;
}

.delete-action {
  color: #8f98a3;
  font-size: 24rpx;
  text-align: center;
}

.add-node {
  margin-top: 18rpx;
  padding: 20rpx;
  border: 1rpx dashed #d7dce2;
  border-radius: 999rpx;
  color: #c96a16;
  background: #fffaf6;
  font-size: 24rpx;
  text-align: center;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 30rpx;
}

.primary-action,
.soft-action {
  box-sizing: border-box;
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  height: 84rpx;
  border: 2rpx solid #d96f1f;
  border-radius: 999rpx;
  font-size: 27rpx;
  font-weight: 800;
  line-height: 84rpx;
}

.primary-action {
  background: #e8792a;
  color: #ffffff;
}

.soft-action {
  background: #ffffff;
  color: #9f4e12;
}
</style>
