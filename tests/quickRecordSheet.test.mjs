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
const context = vm.createContext({
  console,
  Object,
  request: async (options) => {
    requests.push(options)
    return { data: { recordId: 21 } }
  },
  sanitizeVisibleText: (value) => String(value || '').trim()
})

loadModule('services/quickRecordService.js', context)
loadModule('api/careRecord.js', context)
loadModule('services/careRecordService.js', context)

const reminder = {
  reminderInstanceId: 11,
  babyId: 2,
  planTemplateId: 3,
  recordType: 'FEEDING',
  templateName: '混合喂养',
  careTypeLabel: '喂养',
  defaultRecordContext: '{"feedingTypeLabel":"奶粉","amountMl":120}'
}

const draft = context.buildQuickRecordDraftFromReminder(reminder, 2)
assert.equal(draft.title, '混合喂养')
assert.equal(draft.defaultContextText, '奶粉 120ml')
assert.equal(context.buildQuickRecordDraftFromReminder(reminder, 9), null)

const voiceRemark = context.resolveQuickRecordVoiceRemark({
  voiceRecordId: 8,
  finalText: '宝宝喝完后打嗝顺利'
})
assert.equal(voiceRemark, '宝宝喝完后打嗝顺利')

const options = context.buildQuickRecordCareOptions(draft, {
  remark: voiceRemark,
  voiceRecordId: 8
})
await context.createQuickCareRecord(draft.babyId, draft.recordType, options)

assert.deepEqual(plain(requests.at(-1)), {
  url: '/api/mini/care-record/create',
  method: 'POST',
  data: {
    babyId: 2,
    recordType: 'FEEDING',
    recordTime: requests.at(-1).data.recordTime,
    remark: '宝宝喝完后打嗝顺利',
    reminderInstanceId: 11,
    voiceRecordId: 8
  }
})

const todaySource = read('pages/today/index.vue')
const reminderSource = read('pages/reminder/index.vue')
const sheetSource = read('components/QuickRecordSheet.vue')
const careRecordServiceSource = read('services/careRecordService.js')
const backendCareRecordServiceSource = read('../baby-care-backend/ruoyi-system/src/main/java/com/ruoyi/babycare/miniapp/service/MiniAppCareRecordService.java')
const backendReminderMapperSource = read('../baby-care-backend/ruoyi-system/src/main/resources/mapper/babycare/extra/BcReminderInstanceExtraMapper.xml')

assert.match(todaySource, /handleGoRecord\(reminder\)[\s\S]*quickRecordSheet[\s\S]*visible:\s*true/)
assert.match(reminderSource, /handleGoRecord\(reminder\)[\s\S]*quickRecordSheet[\s\S]*visible:\s*true/)
assert.doesNotMatch(todaySource, /handleGoRecord\(reminder\)[\s\S]{0,180}switchTab/)
assert.doesNotMatch(reminderSource, /handleGoRecord\(reminder\)[\s\S]{0,180}switchTab/)

assert.match(sheetSource, /class="sheet-title"/)
assert.match(sheetSource, /class="context-line"/)
assert.match(sheetSource, /placeholder="补充记录（可选）"/)
assert.match(sheetSource, /mockRecognizeVoice/)
assert.match(sheetSource, /this\.localRemark = remark/)
assert.match(sheetSource, /\$emit\('confirm'/)
assert.match(careRecordServiceSource, /remark: Object\.prototype\.hasOwnProperty\.call\(options,\s*'remark'\)/)

assert.match(backendCareRecordServiceSource, /record\.setRemark\(normalizeRemark\(request\.getRemark\(\)\)\)/)
assert.match(backendCareRecordServiceSource, /miniAppReminderInstanceService\.markRecordedOrThrow\(reminderInstance\.getReminderInstanceId\(\)\)/)
assert.match(backendReminderMapperSource, /set status = 'RECORDED'/)

console.log('quick record sheet regression tests passed')
