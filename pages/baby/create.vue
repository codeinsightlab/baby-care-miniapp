<template>
  <view class="page create-page">
    <view class="create-header">
      <view class="page-title">新增宝宝</view>
      <view class="page-placeholder">填写宝宝的基础信息，创建后进入今日页面。</view>
    </view>

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
import { createBabyWithDefaultFamily } from '../../services/babyService'
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
        const result = await createBabyWithDefaultFamily(this.form)
        setCurrentBabyId(result.babyId)
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
  min-height: 100vh;
  padding: 42rpx 28rpx 80rpx;
  background: #fff8ee;
}

.create-header {
  margin-bottom: 30rpx;
}

.form-section {
  padding: 30rpx 28rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(159, 135, 72, 0.08);
}

.field {
  margin-bottom: 28rpx;
}

.field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: #2f2f2f;
  font-size: 26rpx;
  font-weight: 500;
}

.field-input,
.field-picker {
  box-sizing: border-box;
  width: 100%;
  min-height: 86rpx;
  padding: 0 24rpx;
  border: 1rpx solid #f0e6d6;
  border-radius: 18rpx;
  background: #fffaf2;
  color: #2f2f2f;
  font-size: 30rpx;
  line-height: 86rpx;
}

.field-input::placeholder {
  color: #a8a8a8;
}

.create-action {
  border-radius: 999rpx;
  background: #f6b84b;
  box-shadow: 0 10rpx 24rpx rgba(246, 184, 75, 0.22);
}
</style>
