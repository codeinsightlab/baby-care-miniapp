<script>
import { captureCurrentEntryInviteToken } from './utils/collaborationInvite'

export default {
  onLaunch(options) {
    captureCurrentEntryInviteToken(options || {})
  },
  onShow(options) {
    captureCurrentEntryInviteToken(options || {})
  }
}
</script>

<style>
page {
  min-height: 100%;
  background: #f7f8fa;
  color: #1f2933;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 48rpx 32rpx;
}

.page-title {
  margin: 0 0 24rpx;
  font-size: 40rpx;
  font-weight: 600;
  line-height: 1.3;
}

.page-placeholder {
  color: #64748b;
  font-size: 28rpx;
  line-height: 1.7;
}

.page-action {
  margin: 40rpx 0 0;
}

button::after {
  border: 0;
}

.primary-action,
.confirm-action,
.reminder-action.primary,
.button-system-primary {
  box-sizing: border-box;
  border: 2rpx solid #d96f1f;
  background: #e8792a;
  color: #ffffff;
  font-weight: 800;
}

.soft-action,
.secondary-action,
.voice-action,
.reminder-action.secondary,
.button-system-secondary {
  box-sizing: border-box;
  border: 2rpx solid #d96f1f;
  background: #ffffff;
  color: #9f4e12;
  font-weight: 750;
}

.primary-action:active,
.confirm-action:active,
.soft-action:active,
.secondary-action:active,
.voice-action:active,
.reminder-action:active,
.button-system-primary:active,
.button-system-secondary:active {
  transform: scale(0.98);
}

button[disabled],
button[loading] {
  border-color: #c8cfd8;
  background: #e9edf2;
  color: #7a8491;
}
</style>
