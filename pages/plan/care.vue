<template>
  <view class="plan-detail-page">
    <view class="page-hero">
      <view class="page-title">基础护理计划</view>
      <view class="page-desc">这个阶段以基础护理为主，重点关注换尿布、补剂和基础观察。</view>
      <view v-if="refreshing" class="refreshing-pill">更新中</view>
    </view>

    <view v-if="pageInitializing && !hasNodes" class="state-card">正在加载计划...</view>

    <view v-else class="section-stack">
    <view class="section-card">
      <view class="section-title">换尿布检查</view>
      <view
        v-for="item in diaperModes"
        :key="item.value"
        class="option-item"
        :class="{ active: diaperMode === item.value }"
        @click="selectDiaperMode(item)"
      >
        <view class="radio-dot"></view>
        <text>{{ item.label }}</text>
      </view>
      <view v-for="(node, index) in diaperNodes" :key="node.localId" class="node-row">
        <picker mode="time" :value="node.reminderTime" @change="handleGroupTimeChange('diaperNodes', index, $event)">
          <view class="time-value">{{ node.reminderTime }}</view>
        </picker>
        <switch :checked="isPlanEnabled(node.enabled)" color="#f28c38" @change="handleGroupToggle('diaperNodes', index, $event)" />
        <view class="delete-action" @click="removeNode('diaperNodes', index)">删</view>
      </view>
      <view class="add-node" @click="addDiaperNode">+ 新建节点</view>
    </view>

    <view class="section-card">
      <view class="section-title">补剂</view>
      <view v-for="(node, index) in supplementNodes" :key="node.localId" class="supplement-row">
        <view>
          <view class="node-label">{{ node.context.supplementName }}</view>
          <picker mode="time" :value="node.reminderTime" @change="handleGroupTimeChange('supplementNodes', index, $event)">
            <view class="node-sub">{{ node.context.repeatRuleLabel }} {{ node.reminderTime }}</view>
          </picker>
        </view>
        <switch :checked="isPlanEnabled(node.enabled)" color="#f28c38" @change="handleGroupToggle('supplementNodes', index, $event)" />
        <view class="delete-action" @click="removeNode('supplementNodes', index)">删</view>
      </view>
      <view class="add-node" @click="addSupplementNode">+ 新建补剂项</view>
    </view>

    <view class="section-card">
      <view class="section-title">体温观察</view>
      <view class="inline-options">
        <view
          v-for="item in temperatureModes"
          :key="item.value"
          class="inline-option"
          :class="{ active: temperatureMode === item.value }"
          @click="selectTemperatureMode(item.value)"
        >
          {{ item.label }}
        </view>
      </view>
      <view v-if="temperatureMode !== 'NONE'" class="node-row">
        <picker mode="time" :value="temperatureNode.reminderTime" @change="handleTemperatureTimeChange">
          <view class="time-value">{{ temperatureNode.reminderTime }}</view>
        </picker>
        <switch :checked="isPlanEnabled(temperatureNode.enabled)" color="#f28c38" @change="handleTemperatureToggle" />
        <view class="reset-action" @click="resetTemperature">重置</view>
      </view>
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

const DIAPER_TIMES = ['06:15', '08:15', '10:15', '12:15', '14:15', '16:15', '18:15', '20:15', '22:15', '00:15', '02:15', '04:15']

export default {
  name: 'CarePlanPage',
  data() {
    return {
      pageInitializing: true,
      refreshing: false,
      displayReady: false,
      submitting: false,
      currentBabyId: '',
      diaperMode: 'FOLLOW_TEMPLATE',
      temperatureMode: 'RECORD_ONLY',
      removedIds: [],
      diaperNodes: [],
      supplementNodes: [],
      temperatureNode: {
        localId: 'temperature-initial',
        careType: PLAN_CARE_TYPES.BASIC_CARE,
        title: '体温观察',
        reminderTime: '08:00',
        enabled: PLAN_ENABLED_STATUS.DISABLED,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.BASIC_CARE],
          careItem: 'TEMPERATURE',
          careItemLabel: '体温观察',
          temperatureMode: 'RECORD_ONLY'
        },
        remark: '基础护理体温观察节点'
      },
      diaperModes: [
        { value: 'FOLLOW_TEMPLATE', label: '跟随推荐节点生成' },
        { value: 'SINGLE', label: '单独设置提醒' },
        { value: 'RECORD_ONLY', label: '暂不提醒，仅记录' }
      ],
      temperatureModes: [
        { value: 'RECORD_ONLY', label: '仅记录' },
        { value: 'REMINDER', label: '加入提醒' },
        { value: 'NONE', label: '不加入计划' }
      ]
    }
  },
  computed: {
    hasNodes() {
      return this.displayReady
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
        const plans = await fetchPlanTemplatesByCareType(this.currentBabyId, PLAN_CARE_TYPES.BASIC_CARE)
        this.applyPlans(plans)
      } catch (error) {
        if (isFirstLoad) {
          this.applyPlans([])
        }
        uni.showToast({ title: error.msg || error.message || '计划加载失败', icon: 'none' })
      } finally {
        this.refreshing = false
        this.pageInitializing = false
      }
    },
    applyPlans(plans) {
      const diaper = plans.filter((item) => item.context.careItem === 'DIAPER')
      const supplements = plans.filter((item) => item.context.careItem === 'SUPPLEMENT')
      const temperatures = plans.filter((item) => item.context.careItem === 'TEMPERATURE')
      this.diaperNodes = diaper.length ? diaper.map(this.toNode) : DIAPER_TIMES.map((time, index) => this.buildDiaperNode(time, index))
      this.supplementNodes = supplements.length ? supplements.map(this.toNode) : [
        this.buildSupplementNode('AD（维生素A+D滴剂）', '每天 06:00', '06:00', 0),
        this.buildSupplementNode('D3（维生素D3滴剂）', '双日 06:00', '06:00', 1)
      ]
      this.temperatureNode = temperatures.length ? this.toNode(temperatures[0]) : this.buildTemperatureNode()
      const diaperContext = this.diaperNodes[0] && this.diaperNodes[0].context
      if (diaperContext && diaperContext.remindMode) {
        this.diaperMode = diaperContext.remindMode
      }
      const temperatureContext = this.temperatureNode && this.temperatureNode.context
      if (temperatureContext && temperatureContext.temperatureMode) {
        this.temperatureMode = temperatureContext.temperatureMode
      }
      this.displayReady = true
    },
    toNode(plan) {
      return {
        localId: plan.templateId || `local-${Date.now()}`,
        templateId: plan.templateId,
        careType: PLAN_CARE_TYPES.BASIC_CARE,
        title: plan.title || '基础护理提醒',
        reminderTime: plan.reminderTime,
        enabled: plan.enabled,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.BASIC_CARE],
          ...(plan.context || {})
        },
        remark: plan.remark || ''
      }
    },
    buildDiaperNode(time, index) {
      return {
        localId: `diaper-${Date.now()}-${index}`,
        careType: PLAN_CARE_TYPES.BASIC_CARE,
        title: '换尿布检查',
        reminderTime: time,
        enabled: this.diaperMode === 'RECORD_ONLY' ? PLAN_ENABLED_STATUS.DISABLED : PLAN_ENABLED_STATUS.ENABLED,
        context: this.buildDiaperContext(),
        remark: '基础护理换尿布节点'
      }
    },
    buildSupplementNode(name, repeatLabel, time, index) {
      return {
        localId: `supplement-${Date.now()}-${index}`,
        careType: PLAN_CARE_TYPES.BASIC_CARE,
        title: name,
        reminderTime: time,
        enabled: PLAN_ENABLED_STATUS.ENABLED,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.BASIC_CARE],
          careItem: 'SUPPLEMENT',
          careItemLabel: '补剂',
          supplementName: name,
          repeatRuleLabel: repeatLabel
        },
        remark: '基础护理补剂节点'
      }
    },
    buildTemperatureNode() {
      return {
        localId: `temperature-${Date.now()}`,
        careType: PLAN_CARE_TYPES.BASIC_CARE,
        title: '体温观察',
        reminderTime: '08:00',
        enabled: PLAN_ENABLED_STATUS.DISABLED,
        context: {
          ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.BASIC_CARE],
          careItem: 'TEMPERATURE',
          careItemLabel: '体温观察',
          temperatureMode: 'RECORD_ONLY'
        },
        remark: '基础护理体温观察节点'
      }
    },
    buildDiaperContext() {
      const mode = this.diaperModes.find((item) => item.value === this.diaperMode) || this.diaperModes[0]
      return {
        ...DEFAULT_CONTEXT[PLAN_CARE_TYPES.BASIC_CARE],
        careItem: 'DIAPER',
        careItemLabel: '换尿布检查',
        remindMode: mode.value,
        remindModeLabel: mode.label
      }
    },
    selectDiaperMode(item) {
      this.diaperMode = item.value
      this.diaperNodes = this.diaperNodes.map((node) => ({
        ...node,
        enabled: item.value === 'RECORD_ONLY' ? PLAN_ENABLED_STATUS.DISABLED : node.enabled,
        context: this.buildDiaperContext()
      }))
    },
    selectTemperatureMode(mode) {
      this.temperatureMode = mode
      this.temperatureNode.enabled = mode === 'REMINDER' ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
      this.temperatureNode.context = {
        ...this.temperatureNode.context,
        temperatureMode: mode
      }
    },
    handleGroupTimeChange(groupName, index, event) {
      this[groupName][index].reminderTime = event.detail.value
    },
    handleGroupToggle(groupName, index, event) {
      this[groupName][index].enabled = event.detail.value ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
    },
    handleTemperatureTimeChange(event) {
      this.temperatureNode.reminderTime = event.detail.value
    },
    handleTemperatureToggle(event) {
      this.temperatureNode.enabled = event.detail.value ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
      this.temperatureMode = event.detail.value ? 'REMINDER' : 'RECORD_ONLY'
      this.temperatureNode.context.temperatureMode = this.temperatureMode
    },
    addDiaperNode() {
      this.diaperNodes.push(this.buildDiaperNode('08:15', this.diaperNodes.length))
    },
    addSupplementNode() {
      this.supplementNodes.push(this.buildSupplementNode('补剂', '每天 08:00', '08:00', this.supplementNodes.length))
    },
    removeNode(groupName, index) {
      const node = this[groupName][index]
      if (node && node.templateId) {
        this.removedIds.push(node.templateId)
      }
      this[groupName].splice(index, 1)
    },
    resetTemperature() {
      if (this.temperatureNode.templateId) {
        this.removedIds.push(this.temperatureNode.templateId)
      }
      this.temperatureMode = 'RECORD_ONLY'
      this.temperatureNode = this.buildTemperatureNode()
    },
    async saveNodes() {
      if (this.submitting) {
        return
      }
      this.submitting = true
      try {
        const nodes = this.buildSaveNodes()
        await Promise.all(this.removedIds.map((id) => removePlanTemplate(this.currentBabyId, id)))
        await Promise.all(nodes.map((node) => savePlanTemplate(this.currentBabyId, node)))
        this.removedIds = []
        uni.showToast({ title: '已保存基础护理计划', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '保存失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    buildSaveNodes() {
      const diaperNodes = this.diaperNodes.map((node) => ({
        ...node,
        title: `换尿布检查${node.reminderTime}`,
        context: {
          ...this.buildDiaperContext(),
          reminderTime: node.reminderTime
        }
      }))
      const supplementNodes = this.supplementNodes.map((node) => ({
        ...node,
        title: node.context.supplementName,
        context: {
          ...node.context,
          reminderTime: node.reminderTime
        }
      }))
      const temperatureNode = {
        ...this.temperatureNode,
        enabled: this.temperatureMode === 'NONE' ? PLAN_ENABLED_STATUS.DISABLED : this.temperatureNode.enabled,
        context: {
          ...this.temperatureNode.context,
          temperatureMode: this.temperatureMode,
          reminderTime: this.temperatureNode.reminderTime
        }
      }
      return diaperNodes.concat(supplementNodes).concat([temperatureNode])
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

.page-desc {
  margin-top: 8rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
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

.state-card {
  margin-bottom: 20rpx;
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  color: #69707a;
  font-size: 26rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
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

.option-item.active,
.inline-option.active {
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

.node-row,
.supplement-row {
  display: grid;
  grid-template-columns: 1fr 96rpx 48rpx;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.supplement-row {
  grid-template-columns: 1fr 96rpx 48rpx;
}

.time-value {
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 700;
}

.node-label {
  color: #1f2329;
  font-size: 26rpx;
  font-weight: 600;
}

.node-sub {
  margin-top: 6rpx;
  color: #8f98a3;
  font-size: 23rpx;
}

.delete-action,
.reset-action {
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

.inline-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.inline-option {
  padding: 18rpx 8rpx;
  border: 1rpx solid #eceff3;
  border-radius: 10rpx;
  color: #4f5863;
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
