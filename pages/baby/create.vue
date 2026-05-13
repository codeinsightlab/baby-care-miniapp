<template>
  <view class="page create-page">
    <view class="page-title">新增宝宝</view>
    <view class="page-placeholder">填写宝宝的基础信息，创建后进入今日页面。</view>

    <view class="form-section">
      <view class="field">
        <text class="field-label">宝宝昵称</text>
        <input class="field-input" v-model="form.nickname" placeholder="请输入宝宝昵称" />
      </view>

      <view class="field">
        <text class="field-label">性别</text>
        <picker :range="genderOptions" range-key="label" @change="handleGenderChange">
          <view class="field-picker">{{ genderLabel }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="field-label">出生日期</text>
        <picker mode="date" :value="form.birthday" @change="handleBirthdayChange">
          <view class="field-picker">{{ form.birthday || '请选择出生日期' }}</view>
        </picker>
      </view>
    </view>

    <button class="page-action create-action" type="primary" :loading="submitting" :disabled="submitting" @click="handleSubmit">
      创建并进入今日
    </button>
  </view>
</template>

<script>
import { createBaby } from '../../api/baby'
import { createFamily } from '../../api/family'
import { setCurrentBabyId } from '../../utils/currentBaby'

function isUnauthorizedError(error) {
  return error && (error.unauthorized || error.statusCode === 401 || error.code === 401 || error.code === '401')
}

export default {
  name: 'BabyCreatePage',
  data() {
    return {
      submitting: false,
      genderOptions: [
        { label: '未知', value: '0' },
        { label: '男宝', value: '1' },
        { label: '女宝', value: '2' }
      ],
      form: {
        nickname: '',
        gender: '0',
        birthday: ''
      }
    }
  },
  computed: {
    genderLabel() {
      const option = this.genderOptions.find((item) => item.value === this.form.gender)
      return option ? option.label : '未知'
    }
  },
  methods: {
    handleGenderChange(event) {
      const index = Number(event.detail.value)
      this.form.gender = this.genderOptions[index].value
    },
    handleBirthdayChange(event) {
      this.form.birthday = event.detail.value
    },
    validateForm() {
      if (!this.form.nickname.trim()) {
        return '请输入宝宝昵称'
      }
      if (!this.form.birthday) {
        return '请选择出生日期'
      }
      return ''
    },
    async handleSubmit() {
      if (this.submitting) {
        return
      }

      const message = this.validateForm()
      if (message) {
        uni.showToast({
          title: message,
          icon: 'none'
        })
        return
      }

      this.submitting = true
      try {
        const nickname = this.form.nickname.trim()
        const familyResponse = await createFamily({
          familyName: `${nickname}的共同照护`
        })
        const familyId = familyResponse && familyResponse.familyId
        if (!familyId) {
          throw new Error('创建宝宝所需数据不完整')
        }

        const babyResponse = await createBaby({
          familyId,
          nickname,
          gender: this.form.gender,
          birthday: this.form.birthday
        })
        const babyId = babyResponse && babyResponse.babyId
        if (!babyId) {
          throw new Error('创建宝宝返回数据不完整')
        }

        setCurrentBabyId(babyId)
        uni.switchTab({
          url: '/pages/today/index'
        })
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return
        }
        uni.showToast({
          title: error.msg || error.message || '创建失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.create-page {
  background: #f7fbf8;
}

.form-section {
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 32rpx rgba(96, 124, 114, 0.08);
}

.field {
  margin-bottom: 28rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: #334155;
  font-size: 26rpx;
}

.field-input,
.field-picker {
  box-sizing: border-box;
  width: 100%;
  min-height: 88rpx;
  padding: 0 24rpx;
  border: 1rpx solid #edf2ef;
  border-radius: 12rpx;
  background: #fbfdfc;
  color: #1f2933;
  font-size: 30rpx;
  line-height: 88rpx;
}

.create-action {
  border-radius: 999rpx;
  background: #78b9a2;
}
</style>
