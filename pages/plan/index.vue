<template>
  <view class="plan-page">
    <view class="plan-header">
      <view class="page-title">计划管理</view>
      <view class="stage-pill">计划模板</view>
      <view class="page-desc">选择模板后，可为当前宝宝创建提醒节点。</view>
    </view>

    <view v-if="loading" class="state-card">正在加载计划模板...</view>

    <view v-else class="plan-list">
      <view
        v-for="group in planGroups"
        :key="group.careType"
        class="plan-card"
        :class="{ muted: group.disabled }"
        @click="goPlan(group)"
      >
        <view>
          <view class="plan-title">{{ group.title }}</view>
          <view class="plan-desc">{{ group.description }}</view>
          <view class="plan-time">建议时间：{{ group.displayTime }}</view>
        </view>
        <view class="plan-action" :class="{ 'muted-action': group.disabled }">
          {{ group.disabled ? '待补充' : '去设置' }}
        </view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="primary-action" @click="handlePlanSubscribe">接收计划提醒</button>
      <button class="soft-action" disabled>稍后设置</button>
    </view>
  </view>
</template>

<script>
import { buildPlanGroups, fetchPlanTemplates } from '../../services/planService'
import { requestReminderSubscribe } from '../../utils/subscribe'

export default {
  name: 'PlanIndexPage',
  data() {
    return {
      loading: false,
      templates: [],
      planGroups: []
    }
  },
  onShow() {
    this.loadTemplates()
  },
  methods: {
    async loadTemplates() {
      this.loading = true
      try {
        this.templates = await fetchPlanTemplates()
        this.planGroups = buildPlanGroups(this.templates)
      } catch (error) {
        this.templates = []
        this.planGroups = buildPlanGroups([])
      } finally {
        this.loading = false
      }
    },
    goPlan(group) {
      if (!group || group.disabled || !group.pageUrl) {
        return
      }
      uni.navigateTo({ url: group.pageUrl })
    },
    async handlePlanSubscribe() {
      const result = await requestReminderSubscribe('plan_tab')
      this.showSubscribeHint(result)
    },
    showSubscribeHint(result) {
      if (!result || result.status === 'throttled') {
        return
      }

      const titleMap = {
        accepted: '已开启计划提醒',
        rejected: '未开启通知，不影响继续设置',
        failed: '通知授权失败，不影响继续设置',
        unsupported: '当前环境不支持订阅授权',
        unconfigured: '订阅模板待配置',
        unknown: '授权结果待确认'
      }

      uni.showToast({
        title: titleMap[result.status] || '通知授权未完成',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.plan-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 80rpx;
  background: #f6f6f3;
}

.plan-header {
  margin-bottom: 28rpx;
}

.page-title {
  color: #1f2933;
  font-size: 40rpx;
  font-weight: 700;
}

.stage-pill {
  display: inline-flex;
  margin-top: 18rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #eef0ec;
  color: #687268;
  font-size: 23rpx;
}

.page-desc {
  margin-top: 14rpx;
  color: #7b8794;
  font-size: 24rpx;
  line-height: 1.6;
}

.plan-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 26rpx rgba(96, 96, 80, 0.06);
}

.state-card {
  padding: 28rpx 24rpx;
  border-radius: 18rpx;
  background: #ffffff;
  color: #7b8794;
  font-size: 26rpx;
}

.plan-card.muted {
  opacity: 0.78;
}

.plan-title {
  color: #2f3a43;
  font-size: 30rpx;
  font-weight: 700;
}

.plan-desc {
  margin-top: 10rpx;
  color: #7b8794;
  font-size: 24rpx;
}

.plan-time {
  margin-top: 8rpx;
  color: #8a6500;
  font-size: 23rpx;
}

.plan-action {
  flex-shrink: 0;
  margin-left: 18rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #ffd65b;
  color: #80620f;
  font-size: 24rpx;
  font-weight: 600;
}

.muted-action {
  background: #eef0ec;
  color: #7b8794;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 42rpx;
}

.primary-action,
.soft-action {
  height: 86rpx;
  border-radius: 12rpx;
  font-size: 27rpx;
  line-height: 86rpx;
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
