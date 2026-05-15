<template>
  <view class="page create-page">
    <view class="create-header">
      <view class="page-title">宝宝信息</view>
      <view class="page-placeholder">先补充宝宝基础资料，创建后会自动设为当前宝宝。</view>
    </view>

    <view class="form-section">
      <view class="field">
        <text class="field-label required">宝宝性别</text>
        <view class="gender-tabs">
          <view
            v-for="item in genderOptions"
            :key="item.value"
            class="gender-tab"
            :class="{ active: item.value === form.gender }"
            @click="selectGender(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label required">宝宝昵称</text>
        <input
          class="field-input"
          v-model="form.nickname"
          placeholder="请输入宝宝昵称"
          maxlength="20"
          @input="clearFieldError('nickname')"
        />
        <view v-if="fieldErrors.nickname" class="field-error">{{ fieldErrors.nickname }}</view>
      </view>

      <view class="field">
        <text class="field-label required">出生日期</text>
        <picker mode="date" :value="form.birthday" :end="todayDate" @change="handleBirthdayChange">
          <view class="field-picker">{{ form.birthday || '请选择出生日期' }}</view>
        </picker>
        <view v-if="fieldErrors.birthday" class="field-error">{{ fieldErrors.birthday }}</view>
      </view>

      <view class="field disabled-field">
        <text class="field-label">喂养方式</text>
        <view class="field-picker placeholder">后续在喂养计划中设置</view>
        <view class="field-tip">原型包含该字段，当前 P0 接口暂不保存，先不作为创建必填项。</view>
      </view>
    </view>

    <button
      class="page-action create-action"
      type="primary"
      :class="{ disabled: !canSubmit }"
      :loading="submitting"
      :disabled="submitting"
      @click="handleSubmit"
    >
      保存宝宝信息
    </button>
    <button class="page-action back-action" :disabled="submitting" @click="goBack">返回宝宝列表</button>
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
        { label: '男宝', value: '1' },
        { label: '女宝', value: '2' },
        { label: '暂不确定', value: '0' }
      ],
      fieldErrors: {
        nickname: '',
        birthday: ''
      },
      form: {
        nickname: '',
        gender: '0',
        birthday: ''
      }
    }
  },
  computed: {
    todayDate() {
      const now = new Date()
      const year = now.getFullYear()
      const month = `${now.getMonth() + 1}`.padStart(2, '0')
      const day = `${now.getDate()}`.padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    canSubmit() {
      return !this.submitting && Boolean(this.form.nickname.trim()) && Boolean(this.form.birthday)
    }
  },
  watch: {
    'form.nickname'(value) {
      if (String(value || '').trim()) {
        this.clearFieldError('nickname')
      }
    },
    'form.birthday'(value) {
      if (value) {
        this.clearFieldError('birthday')
      }
    }
  },
  methods: {
    selectGender(value) {
      if (this.submitting) {
        return
      }
      this.form.gender = value
    },
    handleBirthdayChange(event) {
      this.form.birthday = event.detail.value
      this.clearFieldError('birthday')
    },
    clearFieldError(field) {
      if (this.fieldErrors[field]) {
        this.fieldErrors[field] = ''
      }
    },
    validateForm() {
      this.fieldErrors = {
        nickname: '',
        birthday: ''
      }
      if (!this.form.nickname.trim()) {
        this.fieldErrors.nickname = '请输入宝宝昵称'
      }
      if (!this.form.birthday) {
        this.fieldErrors.birthday = '请选择出生日期'
      }
      return !this.fieldErrors.nickname && !this.fieldErrors.birthday
    },
    async handleSubmit() {
      if (this.submitting) {
        return
      }

      if (!this.validateForm()) {
        uni.showToast({
          title: this.fieldErrors.nickname || this.fieldErrors.birthday,
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
    },
    goBack() {
      uni.switchTab({
        url: '/pages/baby/index'
      })
    }
  }
}
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  padding: 42rpx 28rpx 80rpx;
  background: #f7f6f2;
}

.create-header {
  margin-bottom: 30rpx;
}

.form-section {
  padding: 30rpx 28rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 28rpx rgba(31, 35, 41, 0.05);
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
  color: #1f2329;
  font-size: 26rpx;
  font-weight: 500;
}

.field-label.required::after {
  margin-left: 6rpx;
  color: #c96a16;
  content: '*';
}

.gender-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.gender-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72rpx;
  border: 1rpx solid #eceff3;
  border-radius: 999rpx;
  background: #f8f9fb;
  color: #69707a;
  font-size: 24rpx;
}

.gender-tab.active {
  border-color: #f28c38;
  background: #f28c38;
  color: #ffffff;
  font-weight: 600;
}

.field-input,
.field-picker {
  box-sizing: border-box;
  width: 100%;
  min-height: 86rpx;
  padding: 0 24rpx;
  border: 1rpx solid #eceff3;
  border-radius: 18rpx;
  background: #f8f9fb;
  color: #1f2329;
  font-size: 30rpx;
  line-height: 86rpx;
}

.field-input::placeholder {
  color: #9aa1aa;
}

.placeholder {
  color: #9aa1aa;
}

.disabled-field {
  opacity: 0.82;
}

.field-error,
.field-tip {
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.5;
}

.field-error {
  color: #c96a16;
}

.field-tip {
  color: #9aa1aa;
}

.create-action {
  margin-top: 32rpx;
  border-radius: 999rpx;
  background: #f28c38;
  box-shadow: 0 10rpx 24rpx rgba(242, 140, 56, 0.18);
}

.create-action.disabled {
  background: #f1eadf;
  color: #9aa1aa;
  box-shadow: none;
}

.back-action {
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: #fff5ec;
  color: #c96a16;
}
</style>
