<template>
  <view class="page collaboration-page">
    <view class="collaboration-header">
      <view class="page-title">宝宝协作</view>
      <view class="page-placeholder">邀请照顾人一起查看记录和提醒。</view>
    </view>

    <view v-if="!currentBabyId" class="state-card">
      <view class="state-title">请先选择宝宝</view>
      <view class="state-desc">可以先输入邀请码加入宝宝协作，或选择宝宝后邀请照顾人。</view>
      <button class="page-action soft-action" @click="goBabyList">去选择宝宝</button>
    </view>

    <view>
      <view class="section-card">
        <view class="section-title">输入邀请码</view>
        <input class="code-input" v-model="inviteCodeInput" placeholder="请输入邀请码" />
        <button class="page-action soft-action" :loading="joining" :disabled="joining" @click="handleJoin">
          加入宝宝协作
        </button>
      </view>
    </view>

    <view v-if="currentBabyId">
      <view class="section-card">
        <view class="section-title">当前协作</view>
        <view v-if="loading" class="state-desc">正在加载协作信息...</view>
        <view v-else>
          <view class="baby-name">{{ collaboration.babyName || '宝宝' }}</view>
          <view class="state-desc">{{ collaboration.currentUserRoleText || '照顾人' }} · {{ collaboration.collaboratorCount || 0 }}位照顾人</view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-title">邀请照顾人</view>
        <view class="state-desc">生成邀请码后，对方输入邀请码即可一起照顾宝宝。</view>
        <view v-if="invite.inviteCode" class="invite-box">
          <view class="invite-code">{{ invite.inviteCode }}</view>
          <view class="state-desc">有效期至 {{ invite.expiresAt }}</view>
        </view>
        <button class="page-action primary-action" :loading="creatingInvite" :disabled="creatingInvite" @click="handleCreateInvite">
          生成邀请码
        </button>
      </view>

      <view class="section-card">
        <view class="section-title">已加入的照顾人</view>
        <view v-if="noCollaborators" class="state-desc">还没有照顾人加入。</view>
        <view v-else class="collaborator-list">
          <view v-for="item in collaborators" :key="item.collaboratorId" class="collaborator-row">
            <view class="collaborator-avatar">{{ item.avatarText }}</view>
            <view class="collaborator-main">
              <view class="collaborator-name">{{ item.collaboratorName }}</view>
              <view class="state-desc">{{ item.roleJoinedText }}</view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  createInviteCodeForBaby,
  fetchCollaboratorList,
  fetchCurrentCollaboration,
  joinBabyCollaboration,
  refreshAccessibleBabiesAfterJoin
} from '../../services/collaborationService'
import { getCurrentBabyId, setCurrentBabyId } from '../../utils/currentBaby'

function isUnauthorizedError(error) {
  return error && (error.unauthorized || error.statusCode === 401 || error.code === 401 || error.code === '401')
}

function buildCollaboratorViewModels(collaborators) {
  return (Array.isArray(collaborators) ? collaborators : []).map(item => {
    const collaboratorName = item.collaboratorName || ''
    const collaboratorRoleText = item.collaboratorRoleText || ''
    return {
      ...item,
      avatarText: String(collaboratorName).slice(0, 1),
      roleJoinedText: item.joinedAt ? `${collaboratorRoleText} · ${item.joinedAt}` : collaboratorRoleText
    }
  })
}

export default {
  name: 'BabyCollaborationPage',
  data() {
    return {
      currentBabyId: '',
      loading: false,
      creatingInvite: false,
      joining: false,
      collaboration: {},
      collaborators: [],
      invite: {},
      inviteCodeInput: ''
    }
  },
  computed: {
    noCollaborators() {
      return this.collaborators.length === 0
    }
  },
  onShow() {
    this.currentBabyId = getCurrentBabyId()
    if (this.currentBabyId) {
      this.loadCollaboration()
    }
  },
  methods: {
    async loadCollaboration() {
      this.loading = true
      try {
        const current = await fetchCurrentCollaboration(this.currentBabyId)
        const collaborators = await fetchCollaboratorList(this.currentBabyId)
        this.collaboration = current
        this.collaborators = buildCollaboratorViewModels(collaborators)
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          uni.showToast({ title: error.msg || error.message || '加载失败', icon: 'none' })
        }
      } finally {
        this.loading = false
      }
    },
    async handleCreateInvite() {
      if (!this.currentBabyId || this.creatingInvite) {
        return
      }
      this.creatingInvite = true
      try {
        this.invite = await createInviteCodeForBaby(this.currentBabyId)
        uni.showToast({ title: '已生成邀请码', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '生成失败', icon: 'none' })
      } finally {
        this.creatingInvite = false
      }
    },
    async handleJoin() {
      if (this.joining) {
        return
      }
      const inviteCode = String(this.inviteCodeInput || '').trim()
      if (!inviteCode) {
        uni.showToast({ title: '请输入邀请码', icon: 'none' })
        return
      }
      this.joining = true
      try {
        const result = await joinBabyCollaboration(inviteCode)
        if (result && result.babyId) {
          setCurrentBabyId(result.babyId)
          this.currentBabyId = result.babyId
        }
        await refreshAccessibleBabiesAfterJoin()
        await this.loadCollaboration()
        this.inviteCodeInput = ''
        uni.showToast({ title: '已加入宝宝协作', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '加入失败', icon: 'none' })
      } finally {
        this.joining = false
      }
    },
    goBabyList() {
      uni.switchTab({ url: '/pages/baby/index' })
    }
  }
}
</script>

<style scoped>
.collaboration-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 100rpx;
  background: #f7f6f2;
}

.collaboration-header {
  margin-bottom: 30rpx;
}

.state-card,
.section-card {
  margin-bottom: 20rpx;
  padding: 30rpx 28rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(31, 35, 41, 0.05);
}

.state-title,
.section-title {
  color: #1f2329;
  font-size: 31rpx;
  font-weight: 700;
}

.state-desc {
  margin-top: 10rpx;
  color: #69707a;
  font-size: 24rpx;
  line-height: 1.6;
}

.baby-name {
  margin-top: 16rpx;
  color: #1f2329;
  font-size: 34rpx;
  font-weight: 700;
}

.invite-box {
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 18rpx;
  background: #f8f9fb;
}

.invite-code {
  color: #c96a16;
  font-size: 44rpx;
  font-weight: 800;
  letter-spacing: 0;
}

.code-input {
  box-sizing: border-box;
  width: 100%;
  height: 86rpx;
  margin-top: 20rpx;
  padding: 0 24rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
  color: #1f2329;
  font-size: 30rpx;
  line-height: 86rpx;
}

.collaborator-list {
  margin-top: 18rpx;
}

.collaborator-row {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #eceff3;
}

.collaborator-row:last-child {
  border-bottom: 0;
}

.collaborator-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  margin-right: 18rpx;
  border-radius: 50%;
  background: #fff5ec;
  color: #c96a16;
  font-size: 28rpx;
  font-weight: 700;
}

.collaborator-main {
  flex: 1;
  min-width: 0;
}

.collaborator-name {
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 600;
}

.primary-action,
.soft-action {
  margin-top: 22rpx;
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
