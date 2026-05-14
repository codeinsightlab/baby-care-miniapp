<template>
  <view class="plan-detail-page">
    <view class="page-title">睡眠计划</view>
    <view class="page-desc">选择后会为当前宝宝创建睡眠提醒。</view>

    <view class="section-card">
      <view class="section-title">睡眠模式</view>
      <view class="option-item active">记录睡眠</view>
      <view class="option-item">记录睡眠并开启提醒</view>
    </view>

    <view class="section-card">
      <view class="section-title">参考睡眠观察节点</view>
      <view v-if="loading" class="empty-desc">正在加载模板...</view>
      <view v-else-if="templates.length === 0" class="empty-desc">暂无可用模板。</view>
      <view class="node-row" v-for="item in templates" :key="item.templateId">
        <view>
          <view>{{ item.templateName }}</view>
          <view class="node-desc">{{ item.description }}</view>
        </view>
        <text class="node-status" @click="handleCreateReminder(item)">{{ item.displayTime }}</text>
      </view>
      <view class="add-node" @click="handleCreateDefault">创建默认提醒</view>
    </view>

    <view class="footer-actions">
      <button class="primary-action" :loading="submitting" :disabled="submitting" @click="handleCreateDefault">创建提醒</button>
      <button class="soft-action" @click="goBack">稍后设置</button>
    </view>
  </view>
</template>

<script>
import { createReminderFromTemplate, fetchPlanTemplatesByCareType } from '../../services/planService'
import { getCurrentBabyId } from '../../utils/currentBaby'

export default {
  name: 'SleepPlanPage',
  data() {
    return {
      loading: false,
      submitting: false,
      currentBabyId: '',
      templates: []
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    this.loadTemplates()
  },
  methods: {
    async loadTemplates() {
      this.loading = true
      try {
        this.templates = await fetchPlanTemplatesByCareType('SLEEP')
      } catch (error) {
        this.templates = []
      } finally {
        this.loading = false
      }
    },
    async handleCreateDefault() {
      if (!this.templates.length) {
        return
      }
      await this.handleCreateReminder(this.templates[0])
    },
    async handleCreateReminder(template) {
      if (this.submitting) {
        return
      }
      if (!this.currentBabyId) {
        uni.switchTab({ url: '/pages/baby/index' })
        return
      }
      this.submitting = true
      try {
        await createReminderFromTemplate(this.currentBabyId, template)
        uni.showToast({ title: '已创建提醒', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '创建失败', icon: 'none' })
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
  padding: 42rpx 28rpx 80rpx;
  background: #f6f6f3;
}

.page-title {
  color: #1f2933;
  font-size: 40rpx;
  font-weight: 700;
}

.page-desc {
  margin: 12rpx 0 28rpx;
  color: #7b8794;
  font-size: 24rpx;
  line-height: 1.6;
}

.section-card {
  margin-bottom: 18rpx;
  padding: 26rpx 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.section-title {
  margin-bottom: 18rpx;
  color: #2f3a43;
  font-size: 29rpx;
  font-weight: 700;
}

.option-item {
  margin-bottom: 12rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid #e7ece8;
  border-radius: 10rpx;
  color: #4b5563;
  font-size: 26rpx;
}

.option-item.active {
  border-color: #ffe28a;
  background: #fff6d8;
  color: #8a6500;
}

.node-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #edf1f3;
  color: #344054;
  font-size: 25rpx;
}

.node-desc {
  margin-top: 6rpx;
  color: #7b8794;
  font-size: 22rpx;
  line-height: 1.4;
}

.node-status {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #eef0ec;
  color: #7b8794;
  font-size: 22rpx;
}

.add-node {
  margin-top: 18rpx;
  padding: 20rpx;
  border: 1rpx dashed #d8dee3;
  border-radius: 10rpx;
  color: #7b8794;
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
  height: 84rpx;
  border-radius: 12rpx;
  font-size: 27rpx;
  line-height: 84rpx;
}

.primary-action {
  background: #ffd65b;
  color: #5f4700;
}

.soft-action {
  background: #ffffff;
  color: #64748b;
}
</style>
