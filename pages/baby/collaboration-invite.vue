<template>
  <view v-if="hasValidEntry" class="page invite-page">
    <view class="invite-header">
      <view class="page-title">加入宝宝协作</view>
      <view class="page-placeholder">确认后，你可以和照顾人一起查看宝宝记录，并按自己的节奏设置提醒。</view>
    </view>

    <view class="invite-card">
      <view v-if="loading" class="state-desc">正在读取邀请...</view>
      <view v-else-if="loadError" class="state-desc">{{ loadError }}</view>
      <view v-else>
        <view class="baby-name">{{ invite.babyName || '宝宝' }}</view>
        <view class="state-desc">{{ invite.inviterNickname || '主要照顾人' }} 邀请你一起照顾宝宝</view>
        <view v-if="invite.expiresAt" class="expire-text">有效期至 {{ invite.expiresAt }}</view>
        <view v-if="invite.alreadyJoined" class="state-desc">你已经在这个宝宝协作中。</view>
      </view>
    </view>

    <button
      class="page-action primary-action"
      :loading="joining"
      :disabled="loading || joining || Boolean(loadError)"
      @click="handleConfirmJoin"
    >
      {{ invite.alreadyJoined ? '进入宝宝协作' : '确认加入' }}
    </button>
    <button class="page-action soft-action" :disabled="joining" @click="goBabyList">暂不加入</button>
  </view>
</template>

<script>
import { fetchInviteDetail, joinBabyCollaboration, refreshAccessibleBabiesAfterJoin } from '../../services/collaborationService'
import { ensureSilentLogin } from '../../services/loginService'
import { clearPendingInviteToken, consumePendingInviteToken, extractInviteTokenFromLaunchOptions, normalizeInviteToken } from '../../utils/collaborationInvite'
import { getToken } from '../../utils/auth'
import { setCurrentBabyId } from '../../utils/currentBaby'

export default {
  name: 'BabyCollaborationInvitePage',
  data() {
    return {
      inviteToken: '',
      invite: {},
      loading: false,
      joining: false,
      loadError: '',
      hasValidEntry: false
    }
  },
  onLoad(options) {
    // Hidden landing page: only scanned invitees with token/scene, or Splash's one-time pending token, may enter.
    this.inviteToken = normalizeInviteToken(options && options.inviteToken)
      || extractInviteTokenFromLaunchOptions({ query: options || {} })
      || consumePendingInviteToken()
    clearPendingInviteToken()
    if (!this.inviteToken) {
      this.rejectInvalidEntry()
      return
    }
    this.hasValidEntry = true
  },
  onShow() {
    if (this.hasValidEntry) {
      this.bootstrap()
    }
  },
  methods: {
    async bootstrap() {
      if (!this.inviteToken) {
        this.rejectInvalidEntry()
        return
      }
      this.loading = true
      this.loadError = ''
      try {
        if (!getToken()) {
          await ensureSilentLogin()
        }
        this.invite = await fetchInviteDetail(this.inviteToken)
      } catch (error) {
        clearPendingInviteToken()
        uni.showToast({ title: error.msg || error.message || '邀请读取失败', icon: 'none' })
        this.returnToNormalFlow()
      } finally {
        this.loading = false
      }
    },
    async handleConfirmJoin() {
      if (this.joining || !this.inviteToken) {
        return
      }
      this.joining = true
      try {
        if (!getToken()) {
          await ensureSilentLogin()
        }
        const result = this.invite.alreadyJoined
          ? { babyId: this.invite.babyId }
          : await joinBabyCollaboration(this.inviteToken)
        if (result && result.babyId) {
          setCurrentBabyId(result.babyId)
        }
        await refreshAccessibleBabiesAfterJoin()
        clearPendingInviteToken()
        uni.showToast({ title: this.invite.alreadyJoined ? '已进入协作' : '已加入协作', icon: 'success' })
        this.returnToNormalFlow()
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '加入失败', icon: 'none' })
      } finally {
        this.joining = false
      }
    },
    rejectInvalidEntry() {
      this.hasValidEntry = false
      this.loadError = '邀请信息无效或已失效'
      clearPendingInviteToken()
      uni.showToast({ title: '邀请信息无效或已失效', icon: 'none' })
      this.returnToNormalFlow()
    },
    goBabyList() {
      clearPendingInviteToken()
      this.returnToNormalFlow()
    },
    returnToNormalFlow() {
      uni.reLaunch({ url: '/pages/splash/index' })
    }
  }
}
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 100rpx;
  background: #f7f6f2;
}

.invite-header {
  margin-bottom: 30rpx;
}

.invite-card {
  padding: 34rpx 30rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(31, 35, 41, 0.05);
}

.baby-name {
  color: #1f2329;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.4;
}

.state-desc,
.expire-text {
  margin-top: 14rpx;
  color: #69707a;
  font-size: 26rpx;
  line-height: 1.6;
}

.expire-text {
  color: #c96a16;
}

.primary-action,
.soft-action {
  margin-top: 24rpx;
  border-radius: 999rpx;
}

.primary-action {
  background: #f28c38;
}

.soft-action {
  color: #c96a16;
  background: #fff5ec;
}
</style>
