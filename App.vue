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
</style>
