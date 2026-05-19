<template>
  <view class="page collaboration-page">
    <view class="collaboration-header">
      <view class="page-title">宝宝协作</view>
      <view class="page-placeholder">邀请照顾人一起查看记录，并按各自节奏设置提醒。</view>
    </view>

    <view v-if="!currentBabyId" class="state-card">
      <view class="state-title">请先选择宝宝</view>
      <view class="state-desc">选择宝宝后，可以查看协作成员或邀请新的照顾人。</view>
      <button class="page-action soft-action" @click="goBabyList">去选择宝宝</button>
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

      <view v-if="collaboration.isOwner" class="section-card">
        <view class="section-title">邀请照顾人</view>
        <view class="state-desc">生成小程序码后，对方扫码并确认即可加入宝宝协作。</view>
        <view v-if="invite.inviteToken" class="invite-box">
          <image v-if="invite.miniappCodeImage" class="invite-code-image" :src="invite.miniappCodeImage" mode="aspectFit" />
          <view class="state-desc">有效期至 {{ invite.expiresAt }}</view>
        </view>
        <button class="page-action primary-action" :loading="creatingInvite" :disabled="creatingInvite" @click="handleCreateInvite">
          生成协作小程序码
        </button>
      </view>

      <view class="section-card">
        <view class="section-title">已加入的照顾人</view>
        <view v-if="noCollaborators" class="state-desc">还没有照顾人加入。</view>
        <view v-else class="collaborator-list">
          <view v-for="item in collaborators" :key="item.collaboratorId" class="collaborator-row">
            <view class="collaborator-avatar">{{ item.avatarText }}</view>
            <view class="collaborator-main">
              <view class="collaborator-name">
                {{ item.collaboratorName }}
                <text v-if="item.isOwner" class="owner-badge">主要</text>
              </view>
              <view class="state-desc">{{ item.roleJoinedText }}</view>
            </view>
            <button
              v-if="canRemoveCollaborator(item)"
              class="row-action"
              :loading="removingCollaboratorId === item.collaboratorId"
              :disabled="Boolean(removingCollaboratorId)"
              @click="handleRemoveCollaborator(item)"
            >
              移除
            </button>
          </view>
        </view>
      </view>

      <view v-if="canLeave" class="section-card">
        <view class="section-title">退出协作</view>
        <view class="state-desc">退出后将不能再查看这个宝宝的护理数据，可由主要照顾人重新邀请加入。</view>
        <button class="page-action soft-action danger-action" :loading="leaving" :disabled="leaving" @click="handleLeave">
          退出宝宝协作
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import {
  createInviteForBaby,
  fetchCollaboratorList,
  fetchCurrentCollaboration,
  leaveBabyCollaboration,
  removeCollaborator
} from '../../services/collaborationService'
import { getUser } from '../../utils/auth'
import { clearCurrentBabyId, getCurrentBabyId } from '../../utils/currentBaby'

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
      currentUserId: '',
      loading: false,
      creatingInvite: false,
      removingCollaboratorId: '',
      leaving: false,
      collaboration: {},
      collaborators: [],
      invite: {}
    }
  },
  computed: {
    noCollaborators() {
      return this.collaborators.length === 0
    },
    canLeave() {
      return Boolean(this.currentBabyId && !this.collaboration.isOwner)
    }
  },
  onShow() {
    const user = getUser() || {}
    this.currentUserId = user.userId || ''
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
        // Owner only generates and displays the miniapp code here; invite confirmation is for scanned invitees.
        this.invite = await createInviteForBaby(this.currentBabyId)
        uni.showToast({ title: '已生成邀请', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '生成失败', icon: 'none' })
      } finally {
        this.creatingInvite = false
      }
    },
    canRemoveCollaborator(item) {
      const collaboratorId = item && item.collaboratorId
      return Boolean(
        this.collaboration.isOwner
          && item
          && !item.isOwner
          && String(collaboratorId) !== String(this.currentUserId)
      )
    },
    async handleRemoveCollaborator(item) {
      if (!this.canRemoveCollaborator(item) || this.removingCollaboratorId) {
        return
      }
      this.removingCollaboratorId = item.collaboratorId
      try {
        await removeCollaborator(this.currentBabyId, item.collaboratorId)
        await this.loadCollaboration()
        uni.showToast({ title: '已移除', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '移除失败', icon: 'none' })
      } finally {
        this.removingCollaboratorId = ''
      }
    },
    async handleLeave() {
      if (!this.canLeave || this.leaving) {
        return
      }
      this.leaving = true
      try {
        await leaveBabyCollaboration(this.currentBabyId)
        clearCurrentBabyId()
        uni.showToast({ title: '已退出协作', icon: 'success' })
        uni.switchTab({ url: '/pages/baby/index' })
      } catch (error) {
        uni.showToast({ title: error.msg || error.message || '退出失败', icon: 'none' })
      } finally {
        this.leaving = false
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
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 18rpx;
  background: #f8f9fb;
}

.invite-code-image {
  width: 360rpx;
  height: 360rpx;
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

.owner-badge {
  display: inline-flex;
  margin-left: 10rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
  font-size: 20rpx;
  font-weight: 600;
}

.row-action {
  flex-shrink: 0;
  width: 116rpx;
  height: 58rpx;
  margin-left: 16rpx;
  border-radius: 999rpx;
  color: #c96a16;
  background: #fff5ec;
  font-size: 24rpx;
  line-height: 58rpx;
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

.danger-action {
  color: #d94b3d;
  background: #fff1ee;
}
</style>
