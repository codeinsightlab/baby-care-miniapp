# Changelog

## 2026-05-14

- 收口小程序无感登录主链路：所有环境都走无感登录，dev/test 通过 `dev-login` 换 token，prod 通过 `wx.login + mini-login` 换 token，登录通道只由 `config/env.js` 门禁决定。
- 调整请求错误处理：`401` 清 token / user 后按同一无感登录链路重试一次；`5xx`、网络异常、超时不清 token、不清 `BC_CURRENT_BABY_ID`，不强跳 login / splash / baby。
- 收口当前宝宝状态：`BC_CURRENT_BABY_ID` 仅在明确无权限 / 不存在或用户主动切换时清理，服务异常、后端重启、today / baby list 接口失败不再作为清理依据。
- 调整 Splash 启动边界：只做短暂登录态和当前宝宝入口恢复，不无条件拉 today summary 或今日提醒等首页业务接口。
- 增强 today / record / reminder / baby 页面错误态：业务请求失败只影响当前页面内容，展示错误态和重试入口，避免服务恢复后 tabbar 被回跳链路锁死。
- 冻结一期验收前小程序统一 UI 风格规范：轻奶油背景、白色卡片、暖橙主色、圆润图标、温和空状态、低压力照护感。
- 统一小程序页面视觉方向，覆盖 Splash、登录、今日、记录、语音备注、记录确认、计划、提醒、宝宝、宝宝协作、宝宝创建与宝宝信息页。
- 为底部 tabbar 增加项目内轻量 SVG 图标资源，避免外部素材授权风险。
- 本轮为 UI 风格统一，不涉及业务逻辑、接口、数据结构、后端或状态流变更。
