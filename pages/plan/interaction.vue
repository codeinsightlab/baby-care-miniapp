<template>
  <view class="plan-detail-page">
    <view class="page-hero">
      <view class="page-title">运动与认知计划</view>
      <view class="page-desc">这个阶段以短时、轻量互动为主，可按宝宝清醒状态调整。</view>
      <view v-if="refreshing" class="refreshing-pill">更新中</view>
    </view>

    <view class="section-card">
      <view class="section-title">本阶段重点</view>
      <view class="focus-grid">
        <view v-for="item in focusItems" :key="item.label" class="focus-item">
          <view class="focus-icon">{{ item.iconText }}</view>
          <view class="focus-label">{{ item.label }}</view>
        </view>
      </view>
    </view>

    <view v-if="pageInitializing && !hasNodes" class="state-card">正在加载计划...</view>

    <view v-else>
      <view v-for="group in activityGroups" :key="group.key" class="section-card">
        <view class="section-header">
          <view>
            <view class="section-title">{{ group.title }}</view>
            <view class="section-desc">{{ group.description }}</view>
          </view>
          <view class="section-count">{{ group.nodes.length }} 项</view>
        </view>

        <view v-if="!group.nodes.length" class="empty-desc">暂无活动，可新增参考活动。</view>
        <view v-for="(node, index) in group.nodes" :key="node.localId" class="activity-row">
          <view class="activity-icon" :class="node.context.activityGroup">{{ node.context.iconText || '动' }}</view>
          <view class="activity-main">
            <view class="activity-title">{{ node.title }}</view>
            <view class="activity-meta">建议时长：{{ node.context.durationLabel }}</view>
            <picker mode="time" :value="node.reminderTime" @change="handleTimeChange(group.key, index, $event)">
              <view class="activity-meta">提醒时间：{{ node.reminderTime }} · {{ node.context.timeWindowLabel }}</view>
            </picker>
          </view>
          <switch :checked="isPlanEnabled(node.enabled)" color="#f28c38" @change="handleNodeToggle(group.key, index, $event)" />
          <view class="delete-action" @click="removeNode(group.key, index)">删</view>
        </view>

        <view class="add-node" @click="addNode(group.key)">+ 新增活动</view>
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

const GROUPS = [
  {
    key: 'motor',
    title: '运动发展',
    description: '建议在宝宝清醒、精神状态较好时进行，单次时间不宜过长。'
  },
  {
    key: 'cognition',
    title: '认知互动',
    description: '建议在宝宝清醒且情绪稳定时进行，以短时注视和轻声互动为主。'
  }
]

const DEFAULT_ACTIVITIES = {
  motor: [
    { name: '短时趴卧', iconText: '趴', durationLabel: '1-2分钟', timeWindowLabel: '上午清醒时', reminderTime: '10:00' },
    { name: '轻柔肢体活动', iconText: '动', durationLabel: '1-2分钟', timeWindowLabel: '白天清醒时', reminderTime: '14:00' },
    { name: '被动抬头联系', iconText: '抬', durationLabel: '1分钟', timeWindowLabel: '午间清醒时', reminderTime: '12:00' }
  ],
  cognition: [
    { name: '看人脸/黑白卡注视', iconText: '看', durationLabel: '1-2分钟', timeWindowLabel: '白天清醒时', reminderTime: '11:00' },
    { name: '轻声说话互动', iconText: '说', durationLabel: '1-2分钟', timeWindowLabel: '喂养后或清醒互动时', reminderTime: '16:00' },
    { name: '听轻音乐互动', iconText: '听', durationLabel: '2-3分钟', timeWindowLabel: '睡前', reminderTime: '20:00' }
  ]
}

export default {
  name: 'InteractionPlanPage',
  data() {
    return {
      pageInitializing: true,
      refreshing: false,
      submitting: false,
      currentBabyId: '',
      removedIds: [],
      nodes: []
    }
  },
  computed: {
    hasNodes() {
      return this.nodes.length > 0
    },
    focusItems() {
      return [
        { label: '短时趴卧', iconText: '趴' },
        { label: '看人脸/黑白卡注视', iconText: '看' },
        { label: '轻声说话互动', iconText: '说' }
      ]
    },
    activityGroups() {
      return GROUPS.map((group) => ({
        ...group,
        nodes: this.nodes.filter((node) => node.context.activityGroup === group.key)
      }))
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
        const plans = await fetchPlanTemplatesByCareType(this.currentBabyId, PLAN_CARE_TYPES.INTERACTION)
        this.nodes = plans.length ? plans.map(this.toNode) : this.buildDefaultNodes()
        this.removedIds = []
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
      const context = {
        ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.INTERACTION],
        ...(plan.context || {})
      }
      const group = GROUPS.find((item) => item.key === context.activityGroup) || GROUPS[0]
      return {
        localId: plan.templateId || `local-${Date.now()}`,
        templateId: plan.templateId,
        careType: PLAN_CARE_TYPES.INTERACTION,
        title: plan.title || context.activityName || '轻量互动',
        reminderTime: plan.reminderTime,
        enabled: plan.enabled,
        context: {
          ...context,
          activityGroup: group.key,
          activityGroupLabel: group.title,
          activityName: plan.title || context.activityName || '轻量互动',
          durationLabel: context.durationLabel || '1-2分钟',
          timeWindowLabel: context.timeWindowLabel || '白天清醒时'
        },
        remark: plan.remark || ''
      }
    },
    buildDefaultNodes() {
      return DEFAULT_ACTIVITIES.motor
        .map((item, index) => this.buildNode('motor', item, index))
        .concat(DEFAULT_ACTIVITIES.cognition.map((item, index) => this.buildNode('cognition', item, index)))
    },
    buildNode(groupKey, activity, index) {
      const group = GROUPS.find((item) => item.key === groupKey) || GROUPS[0]
      const source = activity || this.pickNextActivity(groupKey)
      return {
        localId: `${groupKey}-${Date.now()}-${index}`,
        careType: PLAN_CARE_TYPES.INTERACTION,
        title: source.name,
        reminderTime: source.reminderTime,
        enabled: PLAN_ENABLED_STATUS.ENABLED,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.INTERACTION],
          activityGroup: group.key,
          activityGroupLabel: group.title,
          activityName: source.name,
          iconText: source.iconText,
          durationLabel: source.durationLabel,
          timeWindowLabel: source.timeWindowLabel
        },
        remark: '运动与认知计划参考活动'
      }
    },
    pickNextActivity(groupKey) {
      const source = DEFAULT_ACTIVITIES[groupKey] || DEFAULT_ACTIVITIES.motor
      const existingCount = this.nodes.filter((node) => node.context.activityGroup === groupKey).length
      return source[existingCount % source.length]
    },
    findNodeIndex(groupKey, groupIndex) {
      const groupNodes = this.nodes
        .map((node, index) => ({ node, index }))
        .filter((item) => item.node.context.activityGroup === groupKey)
      return groupNodes[groupIndex] ? groupNodes[groupIndex].index : -1
    },
    handleTimeChange(groupKey, groupIndex, event) {
      const index = this.findNodeIndex(groupKey, groupIndex)
      if (index >= 0) {
        this.nodes[index].reminderTime = event.detail.value
      }
    },
    handleNodeToggle(groupKey, groupIndex, event) {
      const index = this.findNodeIndex(groupKey, groupIndex)
      if (index >= 0) {
        this.nodes[index].enabled = event.detail.value ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
      }
    },
    addNode(groupKey) {
      this.nodes.push(this.buildNode(groupKey, null, this.nodes.length))
    },
    removeNode(groupKey, groupIndex) {
      const index = this.findNodeIndex(groupKey, groupIndex)
      if (index < 0) {
        return
      }
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
        uni.showToast({ title: '请至少保留一个活动', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await Promise.all(this.removedIds.map((id) => removePlanTemplate(this.currentBabyId, id)))
        await Promise.all(this.nodes.map((node) => savePlanTemplate(this.currentBabyId, {
          ...node,
          title: node.title,
          context: {
            ...node.context,
            activityName: node.title,
            reminderTime: node.reminderTime
          }
        })))
        this.removedIds = []
        uni.showToast({ title: '已保存运动与认知计划', icon: 'none' })
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
  position: relative;
  padding: 16rpx 6rpx 28rpx;
}

.page-title {
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc,
.section-desc,
.empty-desc,
.activity-meta {
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}

.page-desc {
  margin-top: 8rpx;
}

.refreshing-pill,
.section-count {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 22rpx;
}

.refreshing-pill {
  margin-top: 16rpx;
}

.state-card,
.section-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.state-card {
  color: #69707a;
  font-size: 26rpx;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.section-title {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
}

.section-desc {
  margin-top: 6rpx;
}

.focus-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.focus-item {
  padding: 20rpx 10rpx;
  border-radius: 18rpx;
  background: #f8f9fb;
  text-align: center;
}

.focus-icon,
.activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff5ec;
  color: #f28c38;
  font-weight: 700;
}

.focus-icon {
  width: 64rpx;
  height: 64rpx;
  margin: 0 auto 12rpx;
  font-size: 26rpx;
}

.focus-label {
  color: #1f2329;
  font-size: 24rpx;
}

.activity-row {
  display: grid;
  grid-template-columns: 72rpx 1fr 96rpx 48rpx;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.activity-icon {
  width: 72rpx;
  height: 72rpx;
  font-size: 26rpx;
}

.activity-icon.cognition {
  background: #edf3ff;
  color: #3f6fb5;
}

.activity-main {
  min-width: 0;
}

.activity-title {
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 600;
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
