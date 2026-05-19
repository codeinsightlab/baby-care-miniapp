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
assert.match(todaySource, /<quick-record-sheet/)
assert.match(todaySource, /buildQuickRecordDraftFromReminder\(reminder,\s*currentBabyId\)/)
assert.doesNotMatch(recordSource, /consumePendingReminderForRecord\(\)|openPendingReminderSheet\(\)|<quick-record-sheet/)
assert.match(quickRecordSheetSource, /placeholder="补充记录（可选）"/)
assert.match(fetchTodayBody, /queryReminderInstances\(babyId,\s*query\)/)
assert.match(fetchTodayBody, /buildTodayPendingWindow\(\)/)
assert.doesNotMatch(reminderSource, /bc_reminder_node|bc_reminder_log|reminderNode|reminderLog|BC_PENDING_REMINDER_RECORD_CONTEXT/)

console.log('reminder flow miniapp regression tests passed')
