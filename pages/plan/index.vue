<template>
  <view class="plan-page">
    <view class="top-bar">
      <view>
        <view class="baby-title">{{ babyName }}</view>
        <view class="baby-age">{{ babyAgeText }}</view>
      </view>
      <view>
        <view class="stage-pill">当前阶段：0-14天成长模板</view>
        <view v-if="refreshing" class="refreshing-pill">更新中</view>
      </view>
    </view>

    <view class="page-desc">已根据宝宝信息生成参考计划，可按实际情况调整。</view>

    <view v-if="!currentBabyId" class="state-card">
      <view>请先选择宝宝，再设置护理计划。</view>
      <button class="soft-action full-action" @click="goBabyList">去选择宝宝</button>
    </view>

    <view v-else-if="pageInitializing && !hasDisplayState" class="state-card">正在加载计划...</view>

    <view v-else class="plan-list">
      <view v-for="group in planGroups" :key="group.careType" class="plan-card">
        <view class="plan-card-main" @click="goPlan(group)">
          <view>
            <view class="plan-title">{{ group.title }}</view>
            <view class="plan-desc">{{ group.description }}</view>
            <view class="plan-summary">{{ group.summary }}</view>
          </view>
          <view class="plan-action">去设置</view>
        </view>

        <view v-if="group.templates.length" class="template-list">
          <view v-for="item in group.templates" :key="item.templateId" class="template-row">
            <view>
              <view class="template-title">{{ item.title }}</view>
              <view class="template-meta">{{ item.careTypeLabel }} · {{ item.displayTime }}</view>
            </view>
            <switch
              :checked="isPlanEnabled(item.enabled)"
              color="#f28c38"
              :disabled="togglingId === item.templateId"
              @change="handleToggle(item, $event)"
            />
          </view>
        </view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="primary-action" @click="goToday">保存并进入首页</button>
      <button class="soft-action" @click="goBack">稍后设置</button>
    </view>
  </view>
</template>

<script>
import { fetchBabyDetail } from '../../services/babyService'
import { PLAN_ENABLED_STATUS, getPlanEnabledText, isPlanEnabled } from '../../constants/planEnums'
import { buildPlanGroups, fetchPlanTemplates, togglePlanTemplateEnabled } from '../../services/planService'
import { getCurrentBabyId } from '../../utils/currentBaby'
import { applyRefreshFailure, applyRefreshSuccess } from '../../utils/pageRefreshState'

export default {
  name: 'PlanIndexPage',
  data() {
    return {
      pageInitializing: true,
      refreshing: false,
      togglingId: '',
      currentBabyId: '',
      loadErrorText: '',
      displayState: {
        baby: null,
        planGroups: buildPlanGroups([])
      }
    }
  },
  computed: {
    hasDisplayState() {
      return Boolean(this.displayState.baby)
    },
    baby() {
      return this.displayState.baby
    },
    planGroups() {
      return this.displayState.planGroups
    },
    babyName() {
      return this.baby && this.baby.nickname ? this.baby.nickname : '宝宝'
    },
    babyAgeText() {
      return this.baby && this.baby.ageText ? this.baby.ageText : '7天'
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    this.loadPageData()
  },
  methods: {
    isPlanEnabled,
    async loadPageData() {
      if (!this.currentBabyId) {
        this.displayState = {
          baby: null,
          planGroups: buildPlanGroups([])
        }
        return
      }
      const isFirstLoad = !this.hasDisplayState
      this.pageInitializing = isFirstLoad
      this.refreshing = true
      this.loadErrorText = ''
      try {
        const [baby, templates] = await Promise.all([
          fetchBabyDetail(this.currentBabyId),
          fetchPlanTemplates(this.currentBabyId)
        ])
        const refreshResult = applyRefreshSuccess({
          baby,
          planGroups: buildPlanGroups(templates)
        })
        this.displayState = refreshResult.displayState
        this.loadErrorText = refreshResult.loadErrorText
      } catch (error) {
        const refreshResult = applyRefreshFailure(this.displayState, error, '计划加载失败')
        this.displayState = refreshResult.displayState
        this.loadErrorText = refreshResult.loadErrorText
        uni.showToast({ title: this.loadErrorText, icon: 'none' })
      } finally {
        this.refreshing = false
        this.pageInitializing = false
      }
    },
    goPlan(group) {
      if (!group || !group.pageUrl) {
        return
      }
      uni.navigateTo({ url: group.pageUrl })
    },
    async handleToggle(item, event) {
      if (!item || !item.templateId || this.togglingId) {
        return
      }
      this.togglingId = item.templateId
      const enabled = event.detail.value ? PLAN_ENABLED_STATUS.ENABLED : PLAN_ENABLED_STATUS.DISABLED
      try {
        await togglePlanTemplateEnabled(this.currentBabyId, item.templateId, enabled)
        item.enabled = enabled
        item.enabledText = getPlanEnabledText(enabled)
        this.displayState.planGroups = buildPlanGroups(this.planGroups.reduce((list, group) => list.concat(group.templates), []))
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '状态更新失败', icon: 'none' })
      } finally {
        this.togglingId = ''
      }
    },
    goToday() {
      uni.switchTab({ url: '/pages/today/index' })
    },
    goBabyList() {
      uni.switchTab({ url: '/pages/baby/index' })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.plan-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 34rpx 28rpx 180rpx;
  background: #f7f6f2;
}

.top-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.baby-title {
  color: #1f2329;
  font-size: 34rpx;
  font-weight: 700;
}

.baby-age {
  margin-top: 6rpx;
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 600;
}

.stage-pill {
  display: inline-flex;
  flex-shrink: 0;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid #f3d8bf;
  background: #fff5ec;
  color: #c96a16;
  font-size: 23rpx;
}

.refreshing-pill {
  margin-top: 10rpx;
  color: #8f98a3;
  font-size: 22rpx;
  text-align: right;
}

.page-desc {
  margin: 24rpx 0 28rpx;
  color: #8f98a3;
  font-size: 24rpx;
  line-height: 1.6;
}

.state-card {
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  color: #69707a;
  font-size: 26rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.plan-card {
  margin-bottom: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(31, 35, 41, 0.05);
}

.plan-card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.plan-title {
  color: #1f2329;
  font-size: 31rpx;
  font-weight: 700;
}

.plan-desc {
  margin-top: 12rpx;
  color: #69707a;
  font-size: 24rpx;
}

.plan-summary {
  margin-top: 8rpx;
  color: #8f98a3;
  font-size: 23rpx;
}

.plan-action {
  flex-shrink: 0;
  min-width: 136rpx;
  padding: 18rpx 20rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 25rpx;
  font-weight: 600;
  text-align: center;
}

.template-list {
  margin-top: 20rpx;
  border-top: 1rpx solid #eceff3;
}

.template-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0 0;
}

.template-title {
  color: #1f2329;
  font-size: 25rpx;
  font-weight: 600;
}

.template-meta {
  margin-top: 6rpx;
  color: #8f98a3;
  font-size: 22rpx;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 42rpx;
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

.full-action {
  margin-top: 24rpx;
}
</style>
