<template>
  <view class="plan-detail-page">
    <view class="page-hero">
      <view class="page-title">睡眠计划</view>
      <view class="page-desc">这个阶段睡眠节律尚未稳定，建议以睡眠记录和观察为主，可按需开启轻提醒。</view>
      <view v-if="refreshing" class="refreshing-pill">更新中</view>
    </view>

    <view class="section-card">
      <view class="section-title">睡眠模式</view>
      <view
        v-for="item in sleepModes"
        :key="item.value"
        class="option-item"
        :class="{ active: sleepMode === item.value }"
        @click="selectSleepMode(item.value)"
      >
        <view class="radio-dot"></view>
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">参考睡眠观察节点</view>
      <view class="empty-desc">已根据当前阶段生成默认观察节点，你可以修改时间或关闭部分提醒。</view>
      <view v-if="pageInitializing && !hasNodes" class="empty-desc">正在加载计划...</view>
      <view v-else>
        <view v-for="(node, index) in nodes" :key="node.localId" class="node-row">
          <picker mode="time" :value="node.reminderTime" @change="handleTimeChange(index, $event)">
            <view class="time-value">{{ node.reminderTime }}</view>
          </picker>
          <view class="node-label">{{ node.context.sleepSceneLabel }}</view>
          <switch :checked="isPlanEnabled(node.enabled)" color="#f28c38" @change="handleNodeToggle(index, $event)" />
          <view class="delete-action" @click="removeNode(index)">删</view>
        </view>
        <view class="add-node" @click="addNode">+ 新建节点</view>
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

const DEFAULT_NODES = [
  { time: '08:00', scene: 'MORNING', label: '上午睡眠记录', enabled: PLAN_ENABLED_STATUS.DISABLED },
  { time: '12:30', scene: 'NOON', label: '午间睡眠记录', enabled: PLAN_ENABLED_STATUS.DISABLED },
  { time: '16:00', scene: 'AFTERNOON', label: '下午睡眠记录', enabled: PLAN_ENABLED_STATUS.DISABLED },
  { time: '21:00', scene: 'NIGHT', label: '夜间睡眠记录', enabled: PLAN_ENABLED_STATUS.ENABLED },
  { time: '00:30', scene: 'NIGHT', label: '夜间睡眠记录', enabled: PLAN_ENABLED_STATUS.ENABLED }
]

export default {
  name: 'SleepPlanPage',
  data() {
    return {
      pageInitializing: true,
      refreshing: false,
      submitting: false,
      currentBabyId: '',
      sleepMode: 'RECORD_ONLY',
      removedIds: [],
      nodes: [],
      sleepModes: [
        { value: 'RECORD_ONLY', label: '仅记录睡眠' },
        { value: 'REMINDER', label: '记录睡眠并开启轻提醒' }
      ]
    }
  },
  computed: {
    hasNodes() {
      return this.nodes.length > 0
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
        const plans = await fetchPlanTemplatesByCareType(this.currentBabyId, PLAN_CARE_TYPES.SLEEP)
        this.nodes = plans.length ? plans.map(this.toNode) : this.buildDefaultNodes()
        const firstContext = this.nodes[0] && this.nodes[0].context
        if (firstContext && firstContext.sleepMode) {
          this.sleepMode = firstContext.sleepMode
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
        careType: PLAN_CARE_TYPES.SLEEP,
        title: plan.title || '睡眠观察',
        reminderTime: plan.reminderTime,
        enabled: plan.enabled,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.SLEEP],
          ...(plan.context || {})
        },
        remark: plan.remark || ''
      }
    },
    buildDefaultNodes() {
      return DEFAULT_NODES.map((item, index) => this.buildNode(item, index))
    },
    buildNode(item, index) {
      return {
        localId: `new-${Date.now()}-${index}`,
        careType: PLAN_CARE_TYPES.SLEEP,
        title: item.label,
        reminderTime: item.time,
        enabled: item.enabled,
        context: this.buildContext(item.scene, item.label),
        remark: '睡眠计划默认观察节点'
      }
    },
    buildContext(scene, label) {
      const modeLabel = this.sleepMode === 'REMINDER' ? '记录睡眠并开启轻提醒' : '仅记录睡眠'
      return {
        ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.SLEEP],
        sleepMode: this.sleepMode,
        sleepModeLabel: modeLabel,
        sleepScene: scene || 'NAP',
        sleepSceneLabel: label || '睡眠记录'
      }
    },
    selectSleepMode(mode) {
      this.sleepMode = mode
      this.nodes = this.nodes.map((node) => ({
        ...node,
        enabled: mode === 'REMINDER' ? node.enabled : PLAN_ENABLED_STATUS.DISABLED,
        context: this.buildContext(node.context.sleepScene, node.context.sleepSceneLabel)
      }))
    },
    handleTimeChange(index, event) {
      this.nodes[index].reminderTime = event.detail.value
    },
    handleNodeToggle(index, event) {
      this.nodes[index].enabled = event.detail.value ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
      if (event.detail.value) {
        this.sleepMode = 'REMINDER'
      }
    },
    addNode() {
      this.nodes.push(this.buildNode({ time: '21:00', scene: 'NIGHT', label: '夜间睡眠记录', enabled: PLAN_ENABLED_STATUS.ENABLED }, this.nodes.length))
      this.sleepMode = 'REMINDER'
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
        uni.showToast({ title: '请至少保留一个睡眠节点', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await Promise.all(this.removedIds.map((id) => removePlanTemplate(this.currentBabyId, id)))
        await Promise.all(this.nodes.map((node) => savePlanTemplate(this.currentBabyId, {
          ...node,
          title: node.context.sleepSceneLabel,
          context: {
            ...this.buildContext(node.context.sleepScene, node.context.sleepSceneLabel),
            reminderTime: node.reminderTime
          }
        })))
        this.removedIds = []
        uni.showToast({ title: '已保存睡眠计划', icon: 'none' })
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
  grid-template-columns: 118rpx 1fr 96rpx 48rpx;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.time-value {
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 700;
}

.node-label {
  color: #1f2329;
  font-size: 25rpx;
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
  border-radius: 999rpx;
  font-size: 27rpx;
  line-height: 84rpx;
}

.primary-action {
  background: #f28c38;
  color: #ffffff;
}

.soft-action {
  border: 1rpx solid #f3d8bf;
  background: #fff5ec;
  color: #c96a16;
}
</style>
