import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')

function loadModule(file, context) {
  const source = read(file)
    .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
    .replace(/export const (\w+)\s*=/g, 'globalThis.$1 =')
    .replace(/export async function (\w+)\s*\(/g, 'globalThis.$1 = async function $1(')
    .replace(/export function (\w+)\s*\(/g, 'globalThis.$1 = function $1(')
    .replace(/export \{[^}]+\}\n/g, '')
  vm.runInContext(source, context, { filename: file })
}

function parseRequestQuery(urlString) {
  const url = new URL(urlString, 'https://test.local')
  return url.searchParams
}

const FIXED_NOW = '2026-05-19 12:00:00'

const requests = []
const rawReminders = [
  {
    reminderInstanceId: 1,
    babyId: 5,
    careType: 'FEEDING',
    dueAt: '2026-05-19 08:00:00',
    status: 'PENDING'
  },
  {
    reminderInstanceId: 2,
    babyId: 5,
    careType: 'SLEEP',
    dueAt: '2026-05-19 11:15:00',
    status: 'PENDING'
  },
  {
    reminderInstanceId: 3,
    babyId: 5,
    careType: 'CARE',
    dueAt: '2026-05-19 11:30:00',
    status: 'SNOOZED'
  },
  {
    reminderInstanceId: 4,
    babyId: 5,
    careType: 'MEDICINE',
    dueAt: '2026-05-20 07:00:00',
    status: 'PENDING'
  },
  {
    reminderInstanceId: 5,
    babyId: 5,
    careType: 'PLAY',
    dueAt: '2026-05-19 09:30:00',
    status: 'RECORDED'
  }
]

const context = vm.createContext({
  console,
  encodeURIComponent,
  request: async (options) => {
    requests.push(options)
    return { data: rawReminders }
  }
})

loadModule('utils/requestQuery.js', context)
loadModule('api/reminder.js', context)
loadModule('constants/careTypeMeta.js', context)
loadModule('services/textSanitizer.js', context)
loadModule('services/reminderService.js', context)

const todayWindow = context.buildTodayPendingWindow(FIXED_NOW)
const reminderWindow = context.buildReminderQueueWindow(FIXED_NOW)

const todayList = await context.queryReminderInstances(5, todayWindow)
const listRequest = parseRequestQuery(requests[0].url)
assert.equal(listRequest.get('babyId'), '5')
assert.equal(listRequest.get('sort'), 'dueAt_asc')
assert.equal(listRequest.get('status'), 'PENDING,SNOOZED')
assert.equal(todayList.map(item => item.reminderInstanceId).join(','), '2,3')

const queueList = await context.queryReminderInstances(5, reminderWindow)
const queueRequest = parseRequestQuery(requests[1].url)
assert.equal(queueRequest.get('babyId'), '5')
assert.equal(queueRequest.get('sort'), 'dueAt_asc')
assert.equal(queueRequest.get('status'), 'PENDING,SNOOZED')
assert.equal(queueList.map(item => item.reminderInstanceId).join(','), '1,2,3')

assert.equal(queueList.find(item => item.reminderInstanceId === 5), undefined)
assert.equal(queueList.find(item => item.reminderInstanceId === 4), undefined)

console.log('reminder query window regression tests passed')
