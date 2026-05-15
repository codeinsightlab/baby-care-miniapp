<template>
  <view class="plan-detail-page">
    <view class="page-title">喂养计划</view>
    <view class="page-desc">选择后会为当前宝宝创建喂养提醒。</view>

    <view class="section-card">
      <view class="section-title">喂养方式</view>
      <view class="option-list">
        <view class="option-item active">混合喂养</view>
        <view class="option-item">母乳喂养</view>
        <view class="option-item">奶粉喂养</view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">默认节奏</view>
      <view class="empty-desc">{{ templateSummaryText }}</view>
    </view>

    <view class="section-card">
      <view class="section-title">记录方式</view>
      <view class="empty-desc">按原型预留记录方式说明位置。</view>
    </view>

    <view class="section-card">
      <view class="section-title">参考喂养节点</view>
      <view v-if="loading" class="empty-desc">正在加载模板...</view>
      <view v-else-if="noTemplates" class="empty-desc">暂无可用模板。</view>
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
  name: 'FeedingPlanPage',
  data() {
    return {
      loading: false,
      submitting: false,
      currentBabyId: '',
      templates: []
    }
  },
  computed: {
    templateSummaryText() {
      return this.templates.length ? `已读取 ${this.templates.length} 个喂养模板。` : '暂无可用喂养模板。'
    },
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
        this.templates = await fetchPlanTemplatesByCareType('FEEDING')
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
  background: #fff5ec;
  color: #c96a16;
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

.node-desc {
  margin-top: 6rpx;
  color: #69707a;
  font-size: 22rpx;
  line-height: 1.4;
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
