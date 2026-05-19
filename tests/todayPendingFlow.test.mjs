import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const plain = (value) => JSON.parse(JSON.stringify(value))
function formatDateTime(value) {
  const date = new Date(value)
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
function addMinutes(value, minutes) {
  const result = new Date(value)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}
function formatDisplayTime(value) {
  const date = new Date(value)
  const pad = (num) => String(num).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function parseRequestQuery(urlString) {
  const url = new URL(urlString, 'https://test.local')
  return url.searchParams
}

const nowForTodayPendingTest = new Date()
const todayPendingTimes = [
  addMinutes(nowForTodayPendingTest, -50),
  addMinutes(nowForTodayPendingTest, -40),
  addMinutes(nowForTodayPendingTest, -30),
  addMinutes(nowForTodayPendingTest, -20)
]
const todayPendingDisplayTimes = todayPendingTimes.map((value) => formatDisplayTime(value))

function loadModule(file, context) {
  const source = read(file)
    .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
    .replace(/export const (\w+)\s*=/g, 'globalThis.$1 =')
    .replace(/export async function (\w+)\s*\(/g, 'globalThis.$1 = async function $1(')
    .replace(/export function (\w+)\s*\(/g, 'globalThis.$1 = function $1(')
    .replace(/export \{[^}]+\}\n/g, '')
  vm.runInContext(source, context, { filename: file })
}

const requests = []
const rawReminders = [
  {
    reminderInstanceId: 1,
    babyId: 5,
    planTemplateId: 11,
    careType: 'FEEDING',
    title: '14:00 喂奶',
    dueAt: formatDateTime(todayPendingTimes[0]),
    status: 'PENDING',
    urgency: 'overdue',
    defaultRecordContext: '{"feedingType":"MIXED"}'
  },
  {
    reminderInstanceId: 2,
    babyId: 5,
    planTemplateId: 12,
    careType: 'SLEEP',
    title: '15:00 睡眠',
    dueAt: formatDateTime(todayPendingTimes[1]),
    status: 'SNOOZED',
    urgency: 'due'
  },
  {
    reminderInstanceId: 3,
    babyId: 5,
    planTemplateId: 13,
    careType: 'CARE',
    title: '16:00 护理',
    dueAt: formatDateTime(todayPendingTimes[2]),
    status: 'PENDING',
    urgency: 'upcoming'
  },
  {
    reminderInstanceId: 4,
    babyId: 5,
    planTemplateId: 14,
    careType: 'MEDICINE',
    title: '17:00 用药',
    dueAt: formatDateTime(todayPendingTimes[3]),
    status: 'PENDING',
    urgency: 'upcoming'
  }
]

const context = vm.createContext({
  console,
  encodeURIComponent,
  request: async (options) => {
    requests.push(options)
    return { data: rawReminders }
  },
  uni: {
    setStorageSync: () => {},
    getStorageSync: () => null,
    removeStorageSync: () => {}
  },
  sanitizeVisibleText: (value) => String(value || '').trim()
})

loadModule('utils/requestQuery.js', context)
loadModule('api/reminder.js', context)
loadModule('constants/careTypeMeta.js', context)
loadModule('services/reminderService.js', context)
const reminders = await context.fetchTodayReminders(5)
const todayRequestQuery = parseRequestQuery(requests[0].url)
assert.equal(todayRequestQuery.get('babyId'), '5')
assert.equal(todayRequestQuery.get('status'), 'PENDING,SNOOZED')
assert.equal(reminders.length, 4)
assert.deepEqual(plain(reminders.map(item => item.careType)), ['FEEDING', 'SLEEP', 'CARE', 'MEDICINE'])
assert.deepEqual(plain(reminders.map(item => item.recordType)), ['FEEDING', 'SLEEP', 'BASIC_CARE', 'BASIC_CARE'])
assert.deepEqual(plain(reminders.map(item => item.displayTime)), todayPendingDisplayTimes)

const list = await context.fetchReminderList(5)
assert.equal(list.length, 4)
const listRequestQuery = parseRequestQuery(requests[1].url)
assert.equal(listRequestQuery.get('babyId'), '5')
assert.equal(listRequestQuery.get('status'), 'PENDING,SNOOZED')
assert.ok(listRequestQuery.get('startTime'))
assert.ok(listRequestQuery.get('startTime').includes('00:00'))
assert.ok(listRequestQuery.get('endTime'))
const listStartDate = listRequestQuery.get('startTime').slice(0, 10)
const listEndDate = listRequestQuery.get('endTime').slice(0, 10)
assert.equal(listStartDate, listEndDate)

const summaries = context.buildReminderTypeSummaries(reminders)
const summaryMap = new Map(summaries.map(item => [item.careType, item]))
assert.equal(summaryMap.get('FEEDING').countText, '1个提醒')
assert.equal(summaryMap.get('SLEEP').countText, '1个提醒')
assert.equal(summaryMap.get('CARE').countText, '1个提醒')
assert.equal(summaryMap.get('MEDICINE').countText, '1个提醒')
assert.equal(summaryMap.get('PLAY').countText, '暂无提醒')

const todaySource = read('pages/today/index.vue')
const reminderPageSource = read('pages/reminder/index.vue')
const recordSource = read('pages/record/index.vue')
const cardSource = read('components/ReminderCard.vue')
const timelineItemSource = read('components/TimelineItem.vue')
const quickRecordSheetSource = read('components/QuickRecordSheet.vue')
const serviceSource = read('services/reminderService.js')
const timelineServiceSource = read('services/timelineService.js')
const careRecordServiceSource = read('services/careRecordService.js')
const appSource = read('App.vue')
const pagesJson = JSON.parse(read('pages.json'))

assert.match(todaySource, /ReminderCard/)
assert.match(todaySource, /<reminder-card :reminder="item" mode="today" @go-record="handleGoRecord"(?:\s+@snooze="[^"]+")?\s*\/>/)
assert.match(reminderPageSource, /ReminderCard/)
assert.match(reminderPageSource, /<reminder-card[\s\S]*:reminder="item"[\s\S]*mode="compensation"[\s\S]*@go-record="handleGoRecord"/)
assert.doesNotMatch(todaySource, /pending-main-card|reminder-mini-type|pending-task-status/)
assert.doesNotMatch(reminderPageSource, /fetchReminderList/)

assert.match(cardSource, /getCareTypeMeta/)
assert.match(cardSource, /defaultRecordContext/)
assert.match(cardSource, /\$emit\('go-record'/)
assert.match(cardSource, /reminder-title/)
assert.match(cardSource, /reminder-time-line/)
assert.doesNotMatch(cardSource, /有默认记录/)
assert.doesNotMatch(cardSource, /默认节点|ReminderInstance|TemplateVersion|Snoozed/)
assert.doesNotMatch(cardSource, /urgencyText|contextSummary|urgency-badge|context-badge/)
assert.doesNotMatch(cardSource, /statusLabel|todayStatusLabel|ReminderInstance|TemplateVersion|Snoozed/)
assert.match(cardSource, /\$emit\('snooze'/)
assert.match(cardSource, /\$emit\('ignore'/)
assert.match(cardSource, /class="reminder-action secondary"/)
assert.doesNotMatch(cardSource, /v-if="isCompensationMode"[\s\S]{0,120}handleSnooze/)
assert.match(cardSource, /mode === 'compensation'/)
assert.match(cardSource, /未处理\$\{this\.meta\.label\}/)

assert.match(serviceSource, /getCareTypeMeta\(raw\.careType\)/)
assert.match(serviceSource, /recordType: raw\.recordType \|\| meta\.recordType/)
assert.match(serviceSource, /buildCareTypeSummaries\(reminders\)/)
assert.doesNotMatch(serviceSource, /const careTypeLabels/)

assert.match(todaySource, /onShow\(\)[\s\S]*this\.refreshTodayData\(\)/)
assert.match(todaySource, /onPullDownRefresh\(\)[\s\S]*this\.refreshTodayData\(\)[\s\S]*uni\.stopPullDownRefresh\(\)/)
assert.match(todaySource, /care-record-created/)
assert.match(reminderPageSource, /onShow\(\)[\s\S]*getCurrentBabyId\(\)[\s\S]*this\.loadReminders\(\)/)
assert.match(reminderPageSource, /onPullDownRefresh\(\)[\s\S]*this\.loadReminders\(\)[\s\S]*uni\.stopPullDownRefresh\(\)/)
assert.match(reminderPageSource, /care-record-created/)
assert.match(todaySource, /<quick-record-sheet/)
assert.match(reminderPageSource, /<quick-record-sheet/)
assert.match(todaySource, /createQuickCareRecord\(draft\.babyId,\s*draft\.recordType,\s*options\)/)
assert.match(reminderPageSource, /createQuickCareRecord\(draft\.babyId,\s*draft\.recordType,\s*options\)/)
assert.doesNotMatch(recordSource, /uni\.\$emit\('care-record-created'/)
assert.doesNotMatch(recordSource, /openPendingReminderSheet\(\)|consumePendingReminderForRecord\(\)/)
assert.match(todaySource, /TimelineItem/)
assert.match(todaySource, /<timeline-item[\s\S]*mode="compact"/)
assert.match(todaySource, /护理事实/)
assert.doesNotMatch(todaySource, /今日时间轴/)
assert.match(recordSource, /TimelineItem/)
assert.match(recordSource, /<timeline-item[\s\S]*mode="detail"/)
assert.match(recordSource, /护理事实/)
assert.doesNotMatch(recordSource, /护理时间轴/)
assert.match(timelineItemSource, /mode:\s*\{[\s\S]*default:\s*'compact'/)
assert.match(timelineItemSource, /timeline-item-detail/)
assert.match(timelineItemSource, /width:\s*86rpx/)
assert.match(timelineItemSource, /width:\s*58rpx/)
assert.match(timelineItemSource, /margin-right:\s*14rpx/)
assert.match(timelineItemSource, /font-weight:\s*800/)
assert.match(timelineItemSource, /-webkit-line-clamp:\s*1/)
assert.match(timelineItemSource, /feeding/)
assert.match(timelineItemSource, /sleep/)
assert.match(timelineItemSource, /care/)
assert.match(timelineItemSource, /medicine/)
assert.match(timelineItemSource, /temperature/)
assert.match(timelineItemSource, /play/)
assert.doesNotMatch(timelineItemSource, /timeline-item-system/)
assert.doesNotMatch(timelineItemSource, /detailMetaText|showDetailMeta|已保存护理备注|iconText\(\)[\s\S]*'记'/)
assert.match(timelineServiceSource, /toCareRecordTimelineItemViewModel/)
assert.match(timelineServiceSource, /raw\.eventType && raw\.eventType !== 'RECORD'/)
assert.doesNotMatch(timelineServiceSource, /iconText:\s*'记'|SYSTEM_EVENT/)
assert.match(careRecordServiceSource, /export function toCareRecordTimelineItemViewModel/)
assert.match(careRecordServiceSource, /getCareTypeMetaByRecordType/)
assert.match(careRecordServiceSource, /MEDICINE/)
assert.match(careRecordServiceSource, /TEMPERATURE/)
assert.doesNotMatch(careRecordServiceSource, /displayRemark:\s*sanitizeVisibleText\(raw\.remark \|\| '快速记录'\)/)
assert.match(quickRecordSheetSource, /开始语音输入/)
assert.match(appSource, /button::after[\s\S]*border:\s*0/)
assert.match(appSource, /button-system-primary/)
assert.match(appSource, /button-system-secondary/)
assert.match(appSource, /transform:\s*scale\(0\.98\)/)

const todayPage = pagesJson.pages.find(item => item.path === 'pages/today/index')
const reminderPage = pagesJson.pages.find(item => item.path === 'pages/reminder/index')
assert.equal(todayPage.style.enablePullDownRefresh, true)
assert.equal(reminderPage.style.enablePullDownRefresh, true)

console.log('today pending flow regression tests passed')
