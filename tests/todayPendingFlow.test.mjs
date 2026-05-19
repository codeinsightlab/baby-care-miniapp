import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const plain = (value) => JSON.parse(JSON.stringify(value))

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
    dueAt: '2026-05-19 14:00:00',
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
    dueAt: '2026-05-19 15:00:00',
    status: 'SNOOZED',
    urgency: 'due'
  },
  {
    reminderInstanceId: 3,
    babyId: 5,
    planTemplateId: 13,
    careType: 'CARE',
    title: '16:00 护理',
    dueAt: '2026-05-19 16:00:00',
    status: 'PENDING',
    urgency: 'upcoming'
  },
  {
    reminderInstanceId: 4,
    babyId: 5,
    planTemplateId: 14,
    careType: 'MEDICINE',
    title: '17:00 用药',
    dueAt: '2026-05-19 17:00:00',
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
assert.equal(requests[0].url, '/api/mini/reminder-instance/today?babyId=5')
assert.equal(reminders.length, 4)
assert.deepEqual(plain(reminders.map(item => item.careType)), ['FEEDING', 'SLEEP', 'CARE', 'MEDICINE'])
assert.deepEqual(plain(reminders.map(item => item.recordType)), ['FEEDING', 'SLEEP', 'BASIC_CARE', 'BASIC_CARE'])
assert.deepEqual(plain(reminders.map(item => item.displayTime)), ['14:00', '15:00', '16:00', '17:00'])

const list = await context.fetchReminderList(5)
assert.equal(list.length, 4)
assert.equal(requests[1].url, '/api/mini/reminder-instance/today?babyId=5')

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
const cardSource = read('components/TodayPendingCard.vue')
const serviceSource = read('services/reminderService.js')
const pagesJson = JSON.parse(read('pages.json'))

assert.match(todaySource, /TodayPendingCard/)
assert.match(todaySource, /<today-pending-card :reminder="item" @go-record="handleGoRecord" \/>/)
assert.match(reminderPageSource, /TodayPendingCard/)
assert.match(reminderPageSource, /<today-pending-card[\s\S]*:reminder="item"[\s\S]*@go-record="handleGoRecord"/)
assert.doesNotMatch(todaySource, /pending-main-card|reminder-mini-type|pending-task-status/)
assert.doesNotMatch(reminderPageSource, /fetchReminderList/)

assert.match(cardSource, /getCareTypeMeta/)
assert.match(cardSource, /defaultRecordContext/)
assert.match(cardSource, /urgencyText/)
assert.match(cardSource, /\$emit\('go-record'/)
assert.match(cardSource, /quickActionText/)
assert.match(cardSource, /primaryTitle/)
assert.match(cardSource, /contextSummary/)
assert.match(cardSource, /pending-time-line/)
assert.doesNotMatch(cardSource, /有默认记录/)
assert.doesNotMatch(cardSource, /pending-status|urgency-badge|context-badge/)
assert.doesNotMatch(cardSource, /statusLabel|todayStatusLabel|ReminderInstance|TemplateVersion|Snoozed/)
assert.doesNotMatch(cardSource, /\$emit\('snooze'/)
assert.doesNotMatch(cardSource, /class="pending-action soft"/)

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
assert.match(recordSource, /uni\.\$emit\('care-record-created'/)
assert.match(recordSource, /this\.pendingReminder\.recordType !== item\.recordType/)

const todayPage = pagesJson.pages.find(item => item.path === 'pages/today/index')
const reminderPage = pagesJson.pages.find(item => item.path === 'pages/reminder/index')
assert.equal(todayPage.style.enablePullDownRefresh, true)
assert.equal(reminderPage.style.enablePullDownRefresh, true)

console.log('today pending flow regression tests passed')
