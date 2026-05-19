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
          reminderTime: '08:00',
          dueAt: '2026-05-19 08:00:00',
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
loadModule('api/careRecord.js', context)
loadModule('services/careRecordService.js', context)

const reminders = await context.fetchTodayReminders(2)
assert.equal(requests[0].url, '/api/mini/reminder-instance/today?babyId=2')
assert.equal(reminders.length, 1)
assert.equal(reminders[0].reminderInstanceId, 11)
assert.equal(reminders[0].templateName, '晨间喂养')
assert.equal(reminders[0].status, 'PENDING')
assert.equal(reminders[0].urgency, 'overdue')
assert.equal(reminders[0].displayTime, '08:00')

context.savePendingReminderForRecord(reminders[0])
const stored = context.consumePendingReminderForRecord()
assert.equal(stored.reminderInstanceId, 11)
assert.equal(stored.careType, 'FEEDING')
assert.equal(context.consumePendingReminderForRecord(), null)

await context.createQuickCareRecord(2, 'FEEDING', { reminderInstanceId: 11 })
assert.deepEqual(plain(requests.at(-1)), {
  url: '/api/mini/care-record/create',
  method: 'POST',
  data: {
    babyId: 2,
    recordType: 'FEEDING',
    recordTime: requests.at(-1).data.recordTime,
    remark: '记录喂奶',
    reminderInstanceId: 11
  }
})
assert.match(requests.at(-1).data.recordTime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

const todaySource = read('pages/today/index.vue')
const recordSource = read('pages/record/index.vue')
const reminderSource = read('services/reminderService.js')
const fetchTodayBody = reminderSource.match(/export async function fetchTodayReminders[\s\S]*?\n}/)[0]

assert.match(todaySource, /<today-pending-card\s+:reminder="item"\s+@go-record="handleGoRecord"\s+\/>/)
assert.match(todaySource, /savePendingReminderForRecord\(reminder\)/)
assert.match(recordSource, /consumePendingReminderForRecord\(\)/)
assert.match(recordSource, /reminderInstanceId: this\.pendingReminder\.reminderInstanceId/)
assert.match(fetchTodayBody, /getTodayReminderInstances\(babyId\)/)
assert.match(fetchTodayBody, /toReminderList\(response\)/)
assert.doesNotMatch(reminderSource, /bc_reminder_node|bc_reminder_log|reminderNode|reminderLog/)

console.log('reminder flow miniapp regression tests passed')
