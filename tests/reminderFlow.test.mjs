import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const plain = (value) => JSON.parse(JSON.stringify(value))
function parseRequestQuery(urlString) {
  const url = new URL(urlString, 'https://test.local')
  return url.searchParams
}

function formatDateTime(value) {
  const date = new Date(value)
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const fixedNow = new Date()
const inWindowDueTime = new Date(fixedNow.getTime() - 10 * 60 * 1000)
const fixedReminderTime = formatDateTime(inWindowDueTime).slice(-8, 16)

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
const storage = {}
const context = vm.createContext({
  console,
  encodeURIComponent,
  request: async (options) => {
    requests.push(options)
    return {
      data: [
        {
          reminderInstanceId: 11,
          babyId: 2,
          planTemplateId: 3,
          careType: 'FEEDING',
          careTypeLabel: '喂养',
          title: '晨间喂养',
          reminderTime: fixedReminderTime.slice(0, 5),
          dueAt: formatDateTime(inWindowDueTime),
          status: 'PENDING',
          urgency: 'overdue',
          defaultRecordContext: '{"feedingType":"MIXED"}'
        }
      ]
    }
  },
  createCareRecord: async (payload) => {
    requests.push({ name: 'createCareRecord', payload })
    return { data: { recordId: 7 } }
  },
  uni: {
    setStorageSync: (key, value) => {
      storage[key] = value
    },
    getStorageSync: (key) => storage[key],
    removeStorageSync: (key) => {
      delete storage[key]
    }
  },
  sanitizeVisibleText: (value) => String(value || '').trim()
})

loadModule('utils/requestQuery.js', context)
loadModule('api/reminder.js', context)
loadModule('constants/careTypeMeta.js', context)
loadModule('services/reminderService.js', context)
loadModule('services/quickRecordService.js', context)
loadModule('api/careRecord.js', context)
loadModule('services/careRecordService.js', context)

const reminders = await context.fetchTodayReminders(2)
const firstQuery = parseRequestQuery(requests[0].url)
assert.equal(firstQuery.get('babyId'), '2')
assert.ok(firstQuery.has('startTime'))
assert.ok(firstQuery.has('endTime'))
assert.equal(firstQuery.get('status'), 'PENDING,SNOOZED')
assert.equal(reminders.length, 1)
assert.equal(reminders[0].reminderInstanceId, 11)
assert.equal(reminders[0].templateName, '晨间喂养')
assert.equal(reminders[0].status, 'PENDING')
assert.equal(reminders[0].urgency, 'overdue')
assert.equal(reminders[0].displayTime, fixedReminderTime.slice(0, 5))

const quickRecordDraft = context.buildQuickRecordDraftFromReminder(reminders[0], 2)
assert.equal(quickRecordDraft.reminderInstanceId, 11)
assert.equal(quickRecordDraft.title, '晨间喂养')
await context.createQuickCareRecord(2, 'FEEDING', context.buildQuickRecordCareOptions(quickRecordDraft, {
  remark: '宝宝喝完后拍嗝顺利'
}))
assert.deepEqual(plain(requests.at(-1)), {
  url: '/api/mini/care-record/create',
  method: 'POST',
  data: {
    babyId: 2,
    recordType: 'FEEDING',
    recordTime: requests.at(-1).data.recordTime,
    remark: '宝宝喝完后拍嗝顺利',
    reminderInstanceId: 11
  }
})
assert.match(requests.at(-1).data.recordTime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

const todaySource = read('pages/today/index.vue')
const recordSource = read('pages/record/index.vue')
const quickRecordSheetSource = read('components/QuickRecordSheet.vue')
const reminderSource = read('services/reminderService.js')
const fetchTodayBody = reminderSource.match(/export async function fetchTodayReminders[\s\S]*?\n}/)[0]

assert.match(todaySource, /<reminder-card\s+:reminder="item"\s+mode="today"\s+@go-record="handleGoRecord"(?:\s+@snooze="[^"]+")?\s*\/>/)
const reminderPageSource = read('pages/reminder/index.vue')
assert.match(reminderPageSource, /displayState:\s*\{[\s\S]*reminders:\s*\[\][\s\S]*loaded:\s*false/)
assert.match(reminderPageSource, /refreshingState:\s*\{[\s\S]*reminders:\s*false/)
assert.match(reminderPageSource, /this\.displayState = \{[\s\S]*babyId:\s*targetBabyId,[\s\S]*reminders,[\s\S]*loaded:\s*true/)
assert.match(reminderPageSource, /showInitialError\(\)[\s\S]*this\.loadError && !this\.hasReminderDisplayState/)
assert.doesNotMatch(reminderPageSource, /loading:\s*false|this\.loading\s*=|this\.reminders\s*=\s*\[\]/)
assert.match(reminderPageSource, /RECENT_COMPENSATION_LIMIT = 3/)
assert.match(reminderPageSource, /<view class="reminder-flow-section">[\s\S]*<view v-else class="reminder-card-flow">\s*<reminder-card[\s\S]*v-for="item in recentCompensationReminders"[\s\S]*mode="compensation"[\s\S]*@go-record="handleGoRecord"[\s\S]*@ignore="handleIgnoreReminder"/)
assert.match(reminderPageSource, /<view v-if="hasEarlierReminders" class="earlier-reminders">[\s\S]*toggleEarlierReminders[\s\S]*<view v-if="earlierExpanded" class="earlier-card-flow">[\s\S]*v-for="item in earlierCompensationReminders"/)
assert.match(reminderPageSource, /\.reminder-card-flow[\s\S]*gap:\s*26rpx/)
assert.match(reminderPageSource, /\.earlier-card-flow[\s\S]*gap:\s*22rpx/)
assert.doesNotMatch(reminderPageSource, /未处理提醒|待补处理|补偿概览|提醒设置/)
assert.doesNotMatch(reminderPageSource, /class="reminder-row"|class="reminder-list"|class="compensation-stack"|class="compensation-flow-section"|class="compensation-card-flow"|border-bottom:\s*1rpx solid #eceff3/)
assert.doesNotMatch(reminderPageSource, /pageNo|pageSize|cursor|loadMore/)
assert.match(todaySource, /<quick-record-sheet/)
assert.match(todaySource, /buildQuickRecordDraftFromReminder\(reminder,\s*currentBabyId\)/)
assert.doesNotMatch(recordSource, /consumePendingReminderForRecord\(\)|openPendingReminderSheet\(\)|<quick-record-sheet/)
assert.match(quickRecordSheetSource, /placeholder="补充记录（可选）"/)
assert.match(fetchTodayBody, /queryReminderInstances\(babyId,\s*query\)/)
assert.match(fetchTodayBody, /buildTodayPendingWindow\(\)/)
assert.doesNotMatch(reminderSource, /bc_reminder_node|bc_reminder_log|reminderNode|reminderLog|BC_PENDING_REMINDER_RECORD_CONTEXT/)

console.log('reminder flow miniapp regression tests passed')
