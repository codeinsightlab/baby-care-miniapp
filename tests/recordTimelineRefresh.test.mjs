import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')

const recordSource = read('pages/record/index.vue')
const timelineItemSource = read('components/TimelineItem.vue')
const pagesJson = JSON.parse(read('pages.json'))

assert.match(recordSource, /async refreshTimelineData\(\)[\s\S]*fetchCareRecordList\(\{\s*babyId: targetBabyId,[\s\S]*date: this\.selectedDate[\s\S]*\}\)/)
assert.doesNotMatch(recordSource, /async loadRecords\(\)/)
assert.doesNotMatch(recordSource, /@click="loadRecords"/)

assert.match(recordSource, /async onShow\(\)[\s\S]*await this\.refreshTimelineData\(\)/)
assert.doesNotMatch(recordSource, /consumePendingReminderForRecord|openPendingReminderSheet|quickRecordSheet|handleQuickRecord/)
assert.match(recordSource, /this\.currentBabyId = getCurrentBabyId\(\)/)

assert.match(recordSource, /async onPullDownRefresh\(\)[\s\S]*await this\.refreshTimelineData\(\)[\s\S]*uni\.stopPullDownRefresh\(\)/)
const recordPage = pagesJson.pages.find(item => item.path === 'pages/record/index')
assert.equal(recordPage.style.enablePullDownRefresh, true)

assert.match(recordSource, /onLoad\(\)[\s\S]*uni\.\$on\('care-record-created', this\.handleCareRecordCreated\)/)
assert.match(recordSource, /onUnload\(\)[\s\S]*uni\.\$off\('care-record-created', this\.handleCareRecordCreated\)/)
assert.match(recordSource, /handleCareRecordCreated\(payload\)[\s\S]*getCurrentBabyId\(\)[\s\S]*this\.refreshTimelineData\(\)/)
assert.doesNotMatch(recordSource, /uni\.\$emit\('care-record-created'/)

assert.match(recordSource, /recordsBabyId: ''/)
assert.match(recordSource, /visibleRecords\(\)[\s\S]*String\(this\.recordsBabyId\) !== String\(this\.currentBabyId\)[\s\S]*return \[\]/)
assert.match(recordSource, /this\.recordsBabyId = targetBabyId/)
assert.match(recordSource, /requestSeq !== this\.timelineRequestSeq \|\| String\(targetBabyId\) !== String\(this\.currentBabyId\)/)
assert.doesNotMatch(recordSource, /recordTimelineItems\(\)/)
assert.doesNotMatch(recordSource, /getCareTypeMetaByRecordType/)
assert.match(recordSource, /<timeline-item v-for="record in visibleRecords"[\s\S]*mode="detail"/)
assert.doesNotMatch(recordSource, /queryReminderInstances|getTodayReminderInstances|reminder_log|pendingReminder.*fetchCareRecordList/)
assert.match(recordSource, /selectedDate: getTodayDateString\(\)/)
assert.match(recordSource, /handleDateChange\(event\)[\s\S]*this\.selectedDate = event\.detail\.value/)
assert.match(recordSource, /TimelineItem/)
assert.match(recordSource, /<timeline-item[\s\S]*mode="detail"/)
assert.match(recordSource, /护理事实/)
assert.doesNotMatch(recordSource, /护理时间轴/)
assert.doesNotMatch(recordSource, /已保存护理备注|detailText|快速记录,\s*$/)
assert.match(timelineItemSource, /timeline-time[\s\S]*width:\s*86rpx/)
assert.match(timelineItemSource, /timeline-node[\s\S]*width:\s*58rpx/)
assert.match(timelineItemSource, /timeline-title[\s\S]*font-weight:\s*800/)
assert.match(timelineItemSource, /timeline-remark[\s\S]*font-weight:\s*400/)
assert.match(timelineItemSource, /\.timeline-item-detail \.timeline-title/)
assert.doesNotMatch(timelineItemSource, /timeline-item-system/)
assert.doesNotMatch(timelineItemSource, /detailMetaText|showDetailMeta|已保存护理备注|iconText\(\)[\s\S]*'记'/)

console.log('record timeline refresh regression tests passed')
