import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')

const recordSource = read('pages/record/index.vue')
const pagesJson = JSON.parse(read('pages.json'))

assert.match(recordSource, /async refreshTimelineData\(\)[\s\S]*fetchCareRecordList\(\{\s*babyId: targetBabyId,[\s\S]*date: getTodayDateString\(\)[\s\S]*\}\)/)
assert.doesNotMatch(recordSource, /async loadRecords\(\)/)
assert.doesNotMatch(recordSource, /@click="loadRecords"/)

assert.match(recordSource, /async onShow\(\)[\s\S]*consumePendingReminderForRecord\(\)[\s\S]*await this\.refreshTimelineData\(\)[\s\S]*this\.openPendingReminderSheet\(\)/)
assert.match(recordSource, /this\.currentBabyId = getCurrentBabyId\(\)/)

assert.match(recordSource, /async onPullDownRefresh\(\)[\s\S]*await this\.refreshTimelineData\(\)[\s\S]*uni\.stopPullDownRefresh\(\)/)
const recordPage = pagesJson.pages.find(item => item.path === 'pages/record/index')
assert.equal(recordPage.style.enablePullDownRefresh, true)

assert.match(recordSource, /onLoad\(\)[\s\S]*uni\.\$on\('care-record-created', this\.handleCareRecordCreated\)/)
assert.match(recordSource, /onUnload\(\)[\s\S]*uni\.\$off\('care-record-created', this\.handleCareRecordCreated\)/)
assert.match(recordSource, /handleCareRecordCreated\(payload\)[\s\S]*getCurrentBabyId\(\)[\s\S]*this\.refreshTimelineData\(\)/)
assert.match(recordSource, /uni\.\$emit\('care-record-created'/)

assert.match(recordSource, /recordsBabyId: ''/)
assert.match(recordSource, /visibleRecords\(\)[\s\S]*String\(this\.recordsBabyId\) !== String\(this\.currentBabyId\)[\s\S]*return \[\]/)
assert.match(recordSource, /this\.recordsBabyId = targetBabyId/)
assert.match(recordSource, /requestSeq !== this\.timelineRequestSeq \|\| String\(targetBabyId\) !== String\(this\.currentBabyId\)/)
assert.match(recordSource, /getRecordListTypeCountText\(this\.visibleRecords, recordType\)/)
assert.doesNotMatch(recordSource, /queryReminderInstances|getTodayReminderInstances|reminder_log|pendingReminder.*fetchCareRecordList/)

console.log('record timeline refresh regression tests passed')
