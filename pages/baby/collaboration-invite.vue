<template>
  <view v-if="hasValidEntry" class="page invite-page">
    <view class="invite-header">
      <view class="page-title">加入宝宝协作</view>
      <view class="page-placeholder">确认后，你可以和照顾人一起查看宝宝记录，并按自己的节奏设置提醒。</view>
    </view>

    <view class="invite-card">
      <view v-if="loading" class="state-desc">正在读取邀请...</view>
      <view v-else-if="loadError" class="state-desc invalid-desc">{{ loadError }}</view>
      <view v-else>
        <view class="baby-name">{{ invite.babyName || '宝宝' }}</view>
        <view class="state-desc">{{ invite.inviterNickname || '主要照顾人' }} 邀请你一起照顾宝宝</view>
        <view v-if="invite.expiresAt" class="expire-text">有效期至 {{ invite.expiresAt }}</view>
      </view>
    </view>

    <button
      class="page-action primary-action"
      :loading="joining"
      :disabled="loading || joining || Boolean(loadError)"
      @click="handleConfirmJoin"
    >
      确认加入
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
        if (await this.resolveActiveFamilyEntry(this.invite)) {
          return
        }
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
        const result = await joinBabyCollaboration(this.inviteToken)
        if (result && result.babyId) {
          setCurrentBabyId(result.babyId)
        }
        await refreshAccessibleBabiesAfterJoin()
        clearPendingInviteToken()
        uni.showToast({ title: '已加入协作', icon: 'success' })
        this.returnToNormalFlow()
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '加入失败', icon: 'none' })
      } finally {
        this.joining = false
      }
    },
    async resolveActiveFamilyEntry(invite) {
      if (invite && invite.alreadyJoined) {
        if (invite.babyId) {
          setCurrentBabyId(invite.babyId)
        }
        clearPendingInviteToken()
        this.returnToNormalFlow()
        return true
      }

      let babies = []
      try {
        babies = await refreshAccessibleBabiesAfterJoin()
      } catch (error) {
        return false
      }
      if (Array.isArray(babies) && babies.length > 0) {
        this.loadError = '当前账号已加入一个宝宝协作，暂不支持加入新的宝宝协作'
        return true
      }
      return false
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
  border: 1rpx solid #ebe3d9;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 28rpx rgba(31, 35, 41, 0.06);
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

.invalid-desc {
  padding: 18rpx 20rpx;
  border: 1rpx solid #e9c5a6;
  border-radius: 16rpx;
  background: #fff4e9;
  color: #9f5618;
  font-weight: 600;
}

.primary-action,
.soft-action {
  box-sizing: border-box;
  margin-top: 24rpx;
  min-height: 88rpx;
  padding: 0 32rpx;
  border: 2rpx solid transparent;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
  transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
}

.page-action::after {
  border: 0;
}

.primary-action {
  border-color: #df7b2d;
  background: #f28c38;
  color: #ffffff;
  box-shadow: 0 10rpx 22rpx rgba(242, 140, 56, 0.22);
}

.soft-action {
  border-color: #e8bd94;
  color: #9f5618;
  background: #fff4e9;
  box-shadow: 0 6rpx 16rpx rgba(201, 106, 22, 0.09);
}

.page-action:active {
  opacity: 0.9;
  transform: translateY(2rpx) scale(0.99);
  box-shadow: 0 4rpx 12rpx rgba(31, 35, 41, 0.08);
}

.page-action[disabled] {
  opacity: 1;
  box-shadow: none;
}

.primary-action[disabled] {
  border-color: #dfc1a8;
  background: #f3dcc8 !important;
  color: #8f7660 !important;
}

.soft-action[disabled] {
  border-color: #e6d3c3;
  background: #f8ede3 !important;
  color: #a78b74 !important;
}
</style>
