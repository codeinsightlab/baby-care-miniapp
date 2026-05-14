<template>
  <view class="plan-detail-page">
    <view class="page-title">基础护理计划</view>
    <view class="page-desc">选择后会为当前宝宝创建基础护理提醒。</view>

    <view class="section-card">
      <view class="section-title">换尿布检查</view>
      <view class="option-item active">尿布湿了就记录</view>
      <view class="option-item">排便时提醒</view>
      <view class="option-item">暂不提醒，仅记录</view>
    </view>

    <view class="section-card">
      <view class="section-title">提醒节点</view>
      <view v-if="loading" class="empty-desc">正在加载模板...</view>
      <view v-else-if="templates.length === 0" class="empty-desc">暂无可用模板。</view>
      <view v-else class="node-grid">
        <view class="node-item" v-for="item in templates" :key="item.templateId" @click="handleCreateReminder(item)">
          <view>{{ item.templateName }}</view>
          <view class="node-desc">{{ item.displayTime }}</view>
        </view>
      </view>
      <view class="add-node" @click="handleCreateDefault">创建默认提醒</view>
    </view>

    <view class="section-card">
      <view class="section-title">补剂</view>
      <view class="node-row">
        <text>维生素 AD</text>
        <text class="node-status">待接入</text>
      </view>
      <view class="node-row">
        <text>维生素 D3</text>
        <text class="node-status">待接入</text>
      </view>
      <view class="add-node">+ 新增补剂</view>
    </view>

    <view class="section-card">
      <view class="section-title">体温提醒</view>
      <view class="empty-desc">按原型预留体温提醒设置位置。</view>
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
  name: 'CarePlanPage',
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
        this.templates = await fetchPlanTemplatesByCareType('BASIC_CARE')
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

.page-desc,
.empty-desc {
  color: #7b8794;
  font-size: 24rpx;
  line-height: 1.6;
}

.page-desc {
  margin: 12rpx 0 28rpx;
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

.node-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.node-item {
  padding: 18rpx;
  border-radius: 10rpx;
  background: #fafafa;
  color: #344054;
  font-size: 24rpx;
  text-align: center;
}

.node-desc {
  margin-top: 6rpx;
  color: #7b8794;
  font-size: 22rpx;
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

.node-status {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #fff3ce;
  color: #d89c00;
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
