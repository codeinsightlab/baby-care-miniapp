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
      <view v-else-if="noTemplates" class="empty-desc">暂无可用模板。</view>
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
  computed: {
    noTemplates() {
      return this.templates.length === 0
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
  box-sizing: border-box;
  padding: 42rpx 28rpx 80rpx;
  background: #f7f6f2;
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
  margin: 12rpx 0 28rpx;
}

.section-card {
  margin-bottom: 18rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(31, 35, 41, 0.05);
}

.section-title {
  margin-bottom: 18rpx;
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 700;
}

.option-item {
  margin-bottom: 12rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  color: #1f2329;
  font-size: 26rpx;
}

.option-item.active {
  border-color: #f28c38;
  background: #e8f7ec;
  color: #62a66d;
}

.node-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.node-item {
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8f9fb;
  color: #1f2329;
  font-size: 24rpx;
  text-align: center;
}

.node-desc {
  margin-top: 6rpx;
  color: #69707a;
  font-size: 22rpx;
}

.node-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #eceff3;
  color: #1f2329;
  font-size: 25rpx;
}

.node-status {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 22rpx;
}

.add-node {
  margin-top: 18rpx;
  padding: 20rpx;
  border: 1rpx dashed #eceff3;
  border-radius: 18rpx;
  color: #69707a;
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
  background: #ffffff;
  color: #69707a;
}
</style>
